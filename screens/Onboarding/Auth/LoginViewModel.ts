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

export type BiometricType = 'Face ID' | 'Touch ID' | 'Biometric Authentication' | null;

export class LoginViewModel {
  biometricType: BiometricType = null;
  useBiometric = false;

  async initialize(): Promise<{ biometricType: BiometricType; useBiometric: boolean }> {
    this.useBiometric = await LoginViewModel.isBiometricEnabled();
    this.biometricType = await LoginViewModel.detectBiometricType();
    if (Platform.OS === 'android') {
      this.biometricType = 'Biometric Authentication';
    }
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
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: `Authenticate with ${type ?? 'biometric'}`,
        fallbackLabel: 'Use Passcode',
        disableDeviceFallback: false,
      });

      if (!result.success) {
        console.log('❌ Biometric authentication cancelled or failed');
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

      console.log('✅ Biometric authenticated. Returning saved credentials.');
      return { success: true, email, password };
    } catch (err) {
      console.error('❌ autoBiometricAuthenticate error:', err);
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
      await this.disableBiometricLogin();
      biometricEnabled = false;
    } else if (useBiometric && this.useBiometric) {
      await LoginViewModel.saveCredentials(email, password);
      await LoginViewModel.setUseBiometricPreference(true);
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
      await AsyncStorage.clear();
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
    const authResult = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Cancel',
      fallbackLabel: 'Use Passcode',
    });

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
  static async detectBiometricType(): Promise<BiometricType> {
    const supported = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (supported.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION))
      return 'Face ID';
    if (supported.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return 'Touch ID';
    return null;
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
    const email = await SecureStore.getItemAsync(EMAIL_KEY);
    const password = await SecureStore.getItemAsync(PASSWORD_KEY);
    return { email, password };
  }

  static async setUseBiometricPreference(value: boolean) {
    await SecureStore.setItemAsync(USE_BIOMETRIC_KEY, value ? 'true' : 'false');
  }

  static async isBiometricEnabled(): Promise<boolean> {
    const savedPref = await SecureStore.getItemAsync(USE_BIOMETRIC_KEY);
    return savedPref === 'true';
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

      const { email, password } = await LoginViewModel.getStoredCredentials();
      if (!email || !password) {
        console.log('⚠️ No stored credentials, skipping Face ID auto trigger.');
        return { success: false };
      }

      const capability = await LoginViewModel.ensureCapability();
      if (!capability.available) return { success: false };

      const type = capability.type;
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: `Authenticate with ${type ?? 'biometric'}`,
        fallbackLabel: 'Use Passcode',
        disableDeviceFallback: false,
      });

      if (!result.success) {
        console.log('❌ Biometric cancelled or failed');
        return { success: false };
      }

      console.log('✅ Face ID success — returning saved credentials.');
      return { success: true, email, password };
    } catch (err) {
      console.error('❌ autoTriggerBiometric error:', err);
      return { success: false };
    }
  }
}
