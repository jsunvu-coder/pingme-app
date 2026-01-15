import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';
import { AuthService } from 'business/services/AuthService';
import { AccountDataService } from 'business/services/AccountDataService';
import { deepLinkHandler } from 'business/services/DeepLinkHandler';
import { setRootScreen, push, presentOverMain } from 'navigation/Navigation';
import { hasTranslation, t } from 'i18n';
import { EMAIL_KEY, PASSWORD_KEY, USE_BIOMETRIC_KEY } from 'business/Constants';
import { showFlashMessage } from 'utils/flashMessage';
import { shareFlowService } from 'business/services/ShareFlowService';
import { LOCKBOX_METADATA_STORAGE_PREFIX } from 'business/services/LockboxMetadataStorage';

export type BiometricType = 'Face ID' | 'Touch ID' | 'Biometric Authentication' | null;

export class LoginViewModel {
  biometricType: BiometricType = null;
  useBiometric = false;

  async initialize(): Promise<{ biometricType: BiometricType; useBiometric: boolean }> {
    this.useBiometric = await LoginViewModel.isBiometricEnabled();
    this.biometricType = await LoginViewModel.detectBiometricType();

    return {
      biometricType: this.biometricType,
      useBiometric: this.useBiometric,
    };
  }

  private withTimeout<T>(
    promise: Promise<T>,
    ms = 20000,
    message = 'Request timed out. Please try again.'
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        const timer = setTimeout(() => reject(new Error(message)), ms);
        // Clear handled by race resolution
      }),
    ]);
  }

  /**
   * 🔐 Automatically trigger biometric auth
   * - Runs Face ID / Touch ID prompt immediately
   * - On success → returns stored credentials
   * - Does NOT auto-login
   */
  async autoBiometricAuthenticate(): Promise<{
    success: boolean;
    email?: string;
    password?: string;
  }> {
    try {
      const isEnabled = await LoginViewModel.isBiometricEnabled();
      if (!isEnabled) return { success: false };

      const capability = await LoginViewModel.ensureCapability();
      if (!capability.available) return { success: false };

      const type = capability.type;
      const result = await LocalAuthentication.authenticateAsync(
        LoginViewModel.getAuthOptions(`Authenticate with ${type ?? 'biometric'}`)
      );

      if (!result.success) {
        return { success: false };
      }

      const { email, password } = await LoginViewModel.getStoredCredentials();
      if (!email || !password) {
        showFlashMessage({
          title: t('NOTICE'),
          message: t('No saved credentials found. Please log in manually.'),
          type: 'warning',
        });
        return { success: false };
      }

      return { success: true, email, password };
    } catch (err) {
      console.error('Biometric authentication error:', err);
      return { success: false };
    }
  }

  async handleLogin(
    email: string,
    password: string,
    useBiometric: boolean,
    biometricType: BiometricType,
    lockboxProof?: string,
    shareParams?: { mode: 'claimed'; amountUsdStr?: string; from?: 'login' | 'signup' }
  ): Promise<{ success: boolean; biometricEnabled: boolean }> {
    const auth = AuthService.getInstance();
    let ok = false;

    try {
      ok = await this.withTimeout(auth.signin(email, password, lockboxProof));
    } catch (err) {
      const fallbackMessage = t('AUTH_LOGIN_INVALID_CREDENTIALS');
      let message = fallbackMessage;

      if (err instanceof Error && err.message) {
        const responseStatus = (err as any)?.response?.status;
        const isServerError =
          typeof responseStatus === 'number'
            ? responseStatus >= 500
            : /status code 500/i.test(err.message);
        if (!isServerError) {
          message = hasTranslation(err.message) ? t(err.message) : err.message;
        }
      }

      showFlashMessage({
        title: t('AUTH_LOGIN_FAILED_TITLE'),
        message,
        type: 'danger',
      });
      return { success: false, biometricEnabled: this.useBiometric };
    }

    if (!ok) {
      showFlashMessage({
        title: t('AUTH_LOGIN_FAILED_TITLE'),
        message: t('AUTH_LOGIN_INVALID_CREDENTIALS'),
        type: 'danger',
      });
      return { success: false, biometricEnabled: this.useBiometric };
    }

    let biometricEnabled = this.useBiometric;

    if (useBiometric && !this.useBiometric) {
      // Case 1: User just enabled biometric (preference changed from false to true)
      const result = await this.enableBiometricLogin(email, password, biometricType);
      biometricEnabled = result.success;
      if (!result.success && result.message) {
        showFlashMessage({
          title: 'Face ID',
          message: result.message,
          type: 'warning',
        });
      }
    } else if (!useBiometric && this.useBiometric) {
      // Case 2: User disabled biometric
      await this.disableBiometricLogin();
      biometricEnabled = false;
    } else if (useBiometric && this.useBiometric) {
      // Case 3: Biometric already enabled - check if credentials exist
      const { email: savedEmail, password: savedPassword } =
        await LoginViewModel.getStoredCredentials();

      if (!savedEmail || !savedPassword) {
        // First login with biometric enabled - need to prompt and save credentials
        const result = await this.enableBiometricLogin(email, password, biometricType);
        biometricEnabled = result.success;
        if (!result.success && result.message) {
          showFlashMessage({
            title: 'Face ID',
            message: result.message,
            type: 'warning',
          });
        }
      } else {
        // Credentials exist - just update them
        await LoginViewModel.saveCredentials(email, password);
        await LoginViewModel.setUseBiometricPreference(true);
      }
    }

    this.handleSuccessfulLogin(email, shareParams);
    return { success: true, biometricEnabled };
  }

  async clearStoredCredentials() {
    await this.disableBiometricLogin();
  }

  async logout() {
    await this.clearStoredCredentials();
    try {
      const keys = await AsyncStorage.getAllKeys();
      const keysToRemove = keys.filter((k) => !k.startsWith(LOCKBOX_METADATA_STORAGE_PREFIX));
      if (keysToRemove.length) await AsyncStorage.multiRemove(keysToRemove);
    } catch (err) {
      console.warn('⚠️ Failed to clear AsyncStorage on logout', err);
    }
    AuthService.getInstance().logout();
    push('SplashScreen');
  }

  handleSuccessfulLogin(
    email: string,
    shareParams?: { mode: 'claimed'; amountUsdStr?: string; from?: 'login' | 'signup' }
  ) {
    AccountDataService.getInstance().email = email;
    if (shareParams?.mode === 'claimed') {
      shareFlowService.setPendingClaim({
        amountUsdStr: shareParams.amountUsdStr,
        from: shareParams.from ?? 'login',
      });
    }
    setRootScreen([{ name: 'MainTab', params: { entryAnimation: 'slide_from_right' } }]);

    const pendingLink = deepLinkHandler.getPendingLink();
    if (pendingLink) {
      console.log('[Auth] Pending deep link detected → delaying resume by 0.5s...');
      setTimeout(() => deepLinkHandler.resumePendingLink(), 500);
    }
  }

  private async enableBiometricLogin(
    email: string,
    password: string,
    biometricType: BiometricType
  ): Promise<{ success: boolean; message?: string }> {
    const capability = await LoginViewModel.ensureCapability();

    if (!capability.available) {
      const message = capability.needsEnrollment
        ? t('AUTH_BIOMETRIC_NOT_ENROLLED')
        : t('AUTH_BIOMETRIC_NOT_SUPPORTED');
      return { success: false, message };
    }

    const promptMessage = `Enable ${biometricType ?? capability.type ?? 'biometric'} login?`;
    const authResult = await LocalAuthentication.authenticateAsync(
      LoginViewModel.getAuthOptions(promptMessage)
    );

    if (!authResult.success) {
      // User cancelled - don't show an error message, just return failure silently
      return { success: false };
    }

    await LoginViewModel.saveCredentials(email, password);
    await LoginViewModel.setUseBiometricPreference(true);
    this.useBiometric = true;
    return { success: true };
  }

  private async disableBiometricLogin() {
    await LoginViewModel.clearSavedCredentials();
    await LoginViewModel.setUseBiometricPreference(false);
    this.useBiometric = false;
  }

  // ---------- Static helpers ----------

  /**
   * Get platform-specific authentication options
   * Android and iOS have different option support
   */
  static getAuthOptions(promptMessage: string, cancelLabel?: string) {
    if (Platform.OS === 'android') {
      // Android specific options
      return {
        promptMessage,
        cancelLabel: cancelLabel || 'Cancel',
        disableDeviceFallback: false,
      };
    } else {
      // iOS specific options
      return {
        promptMessage,
        cancelLabel: cancelLabel || 'Cancel',
        fallbackLabel: 'Use Passcode',
        disableDeviceFallback: false,
      };
    }
  }

  static async detectBiometricType(): Promise<BiometricType> {
    try {
      const supported = await LocalAuthentication.supportedAuthenticationTypesAsync();

      // Android - return generic type if any biometric is supported
      if (Platform.OS === 'android') {
        if (supported.length > 0) {
          return 'Biometric Authentication';
        }
        return null;
      }

      // iOS
      if (supported.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        return 'Face ID';
      }
      if (supported.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        return 'Touch ID';
      }

      return null;
    } catch (error) {
      console.error('Error detecting biometric type:', error);
      return null;
    }
  }

  static async ensureCapability(): Promise<{
    available: boolean;
    type: BiometricType;
    needsEnrollment: boolean;
  }> {
    const [hasHardware, enrolled, type] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LoginViewModel.detectBiometricType(),
    ]);

    const needsEnrollment = hasHardware && !enrolled;
    const available = hasHardware && enrolled;

    return { available, type, needsEnrollment };
  }

  static async saveCredentials(email: string, password: string) {
    await SecureStore.setItemAsync(EMAIL_KEY, email);
    await SecureStore.setItemAsync(PASSWORD_KEY, password);
  }

  static async clearSavedCredentials() {
    await SecureStore.deleteItemAsync(EMAIL_KEY);
    await SecureStore.deleteItemAsync(PASSWORD_KEY);
  }

  static async getStoredCredentials(): Promise<{ email: string | null; password: string | null }> {
    try {
      const email = await SecureStore.getItemAsync(EMAIL_KEY);
      const password = await SecureStore.getItemAsync(PASSWORD_KEY);
      return { email, password };
    } catch (error) {
      console.error('Error reading stored credentials:', error);
      return { email: null, password: null };
    }
  }

  static async setUseBiometricPreference(value: boolean) {
    try {
      await SecureStore.setItemAsync(USE_BIOMETRIC_KEY, value ? 'true' : 'false');
    } catch (error) {
      console.error('Error saving biometric preference:', error);
      throw error;
    }
  }

  static async isBiometricEnabled(): Promise<boolean> {
    try {
      const savedPref = await SecureStore.getItemAsync(USE_BIOMETRIC_KEY);
      return savedPref === 'true';
    } catch (error) {
      console.error('Error reading biometric preference:', error);
      return false;
    }
  }

  /**
   * Automatically trigger Face ID / Touch ID when the Login screen opens.
   * If success → return saved credentials (email, password)
   * If fail or cancelled → return { success: false }
   * Never auto-login.
   */
  async autoTriggerBiometric(): Promise<{ success: boolean; email?: string; password?: string }> {
    try {
      const enabled = await LoginViewModel.isBiometricEnabled();
      if (!enabled) return { success: false };

      const capability = await LoginViewModel.ensureCapability();
      if (!capability.available) return { success: false };

      // Check credentials AFTER authentication to avoid blocking prompt on first use
      // This allows biometric prompt to show even if credentials haven't been saved yet
      const type = capability.type;
      const result = await LocalAuthentication.authenticateAsync(
        LoginViewModel.getAuthOptions(`Authenticate with ${type ?? 'biometric'}`)
      );

      if (!result.success) {
        return { success: false };
      }

      // Only return credentials if they exist
      const { email, password } = await LoginViewModel.getStoredCredentials();
      if (!email || !password) {
        // Biometric authenticated but no credentials saved yet
        // This happens on first use - user needs to login manually first
        return { success: false };
      }

      return { success: true, email, password };
    } catch (err) {
      console.error('Auto trigger biometric error:', err);
      return { success: false };
    }
  }
}
