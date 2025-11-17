import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { AuthService } from 'business/services/AuthService';
import { AccountDataService } from 'business/services/AccountDataService';
import { deepLinkHandler } from 'business/services/DeepLinkHandler';
import { setRootScreen, push } from 'navigation/Navigation';
import { t } from 'i18n';
import { EMAIL_KEY, PASSWORD_KEY, USE_BIOMETRIC_KEY } from 'business/Constants';
import { PingHistoryViewModel } from 'screens/Home/History/List/PingHistoryViewModel';

export type BiometricType = 'Face ID' | 'Touch ID' | null;

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
        Alert.alert(t('NOTICE'), t('No saved credentials found. Please log in manually.'));
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
    lockboxProof?: string
  ): Promise<{ success: boolean; biometricEnabled: boolean }> {
    const auth = AuthService.getInstance();
    let ok = false;

    try {
      ok = await auth.signin(email, password, lockboxProof);
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
          message = err.message;
        }
      }

      Alert.alert(t('AUTH_LOGIN_FAILED_TITLE'), message);
      return { success: false, biometricEnabled: this.useBiometric };
    }

    if (!ok) {
      Alert.alert(t('AUTH_LOGIN_FAILED_TITLE'), t('AUTH_LOGIN_INVALID_CREDENTIALS'));
      return { success: false, biometricEnabled: this.useBiometric };
    }

    let biometricEnabled = this.useBiometric;

    if (useBiometric && !this.useBiometric) {
      const result = await this.enableBiometricLogin(email, password, biometricType);
      biometricEnabled = result.success;
      if (!result.success && result.message) {
        Alert.alert('Face ID', result.message);
      }
    } else if (!useBiometric && this.useBiometric) {
      await this.disableBiometricLogin();
      biometricEnabled = false;
    } else if (useBiometric && this.useBiometric) {
      await LoginViewModel.saveCredentials(email, password);
      await LoginViewModel.setUseBiometricPreference(true);
    }

    this.handleSuccessfulLogin(email);
    PingHistoryViewModel.prefetchTransactions().catch((err) =>
      console.warn('⚠️ Failed to prefetch ping history', err)
    );
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

  handleSuccessfulLogin(email: string) {
    AccountDataService.getInstance().email = email;
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
