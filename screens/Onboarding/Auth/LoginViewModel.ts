import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { Alert } from 'react-native';
import { AuthService } from 'business/services/AuthService';
import { AccountDataService } from 'business/services/AccountDataService';
import { deepLinkHandler } from 'business/services/DeepLinkHandler';
import { setRootScreen, push } from 'navigation/Navigation';
import { t } from 'i18n';

export type BiometricType = 'Face ID' | 'Touch ID' | null;

export const EMAIL_KEY = 'lastEmail';
export const PASSWORD_KEY = 'lastPassword';
export const USE_BIOMETRIC_KEY = 'useBiometric';

export class LoginViewModel {
  biometricType: BiometricType = null;
  useBiometric = false;

  async initialize(): Promise<{
    biometricType: BiometricType;
    useBiometric: boolean;
  }> {
    this.useBiometric = await LoginViewModel.isBiometricEnabled();
    this.biometricType = await LoginViewModel.detectBiometricType();

    return {
      biometricType: this.biometricType,
      useBiometric: this.useBiometric,
    };
  }

  /**
   * Authenticate with biometric → load credentials → return them for UI
   * Let the view call `resumeAfterBiometricLogin()` to continue navigation
   */
  async tryBiometricAutoLogin(
    lockboxProof?: string
  ): Promise<{ success: boolean; email?: string; password?: string }> {
    if (!this.useBiometric) return { success: false, email: undefined, password: undefined };

    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!hasHardware || !enrolled) return { success: false, email: undefined, password: undefined };

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: `Log in with ${this.biometricType ?? 'biometric'}`,
      fallbackLabel: 'Use Passcode',
      disableDeviceFallback: false,
    });

    if (!result.success) return { success: false, email: undefined, password: undefined };
    const { email, password } = await LoginViewModel.getStoredCredentials();

    if (!email || !password) return { success: false, email: undefined, password: undefined };

    return { success: true, email, password };
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
      const message =
        err instanceof Error && err.message ? err.message : t('AUTH_LOGIN_INVALID_CREDENTIALS');
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
    return { success: true, biometricEnabled };
  }

  async clearStoredCredentials() {
    await this.disableBiometricLogin();
  }

  async logout() {
    await this.clearStoredCredentials();
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
      return { success: false, message: 'Biometric authentication not set up on this device.' };
    }

    const promptMessage = `Enable ${biometricType ?? capability.type ?? 'biometric'} login?`;
    const authResult = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Cancel',
      fallbackLabel: 'Use Passcode',
    });

    if (!authResult.success) {
      return { success: false, message: 'Biometric authentication was cancelled.' };
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
    if (supported.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return 'Face ID';
    }
    if (supported.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return 'Touch ID';
    }
    return null;
  }

  static async ensureCapability(): Promise<{ available: boolean; type: BiometricType }> {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    const type = await LoginViewModel.detectBiometricType();
    return { available: hasHardware && enrolled, type };
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
    if (value) {
      await SecureStore.setItemAsync(USE_BIOMETRIC_KEY, 'true');
    } else {
      await SecureStore.setItemAsync(USE_BIOMETRIC_KEY, 'false');
    }
  }

  static async isBiometricEnabled(): Promise<boolean> {
    const savedPref = await SecureStore.getItemAsync(USE_BIOMETRIC_KEY);
    return savedPref === 'true';
  }
}
