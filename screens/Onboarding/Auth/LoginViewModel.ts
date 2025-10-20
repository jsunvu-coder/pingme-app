// screens/Auth/LoginViewModel.ts
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { Alert } from 'react-native';
import { AuthService } from 'business/services/AuthService';
import { AccountDataService } from 'business/services/AccountDataService';
import { deepLinkHandler } from 'business/services/DeepLinkHandler';
import { setRootScreen, push } from 'navigation/Navigation';

export type BiometricType = 'Face ID' | 'Touch ID' | null;

export class LoginViewModel {
  biometricType: BiometricType = null;
  useBiometric = false;

  /**
   * Initialize login view model:
   * - Check stored FaceID/TouchID preference
   * - Detect biometric type
   * - Preload saved credentials (if any)
   */
  async initialize(): Promise<{
    biometricType: BiometricType;
    useBiometric: boolean;
    savedEmail?: string;
    savedPassword?: string;
  }> {
    // Load biometric preference
    const savedPref = await SecureStore.getItemAsync('useBiometric');
    if (savedPref === 'true') this.useBiometric = true;

    // Detect hardware type
    const supported = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (supported.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      this.biometricType = 'Face ID';
    } else if (supported.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      this.biometricType = 'Touch ID';
    }

    // Load any saved credentials
    const savedEmail = await SecureStore.getItemAsync('lastEmail');
    const savedPassword = await SecureStore.getItemAsync('lastPassword');

    return {
      biometricType: this.biometricType,
      useBiometric: this.useBiometric,
      savedEmail: savedEmail ?? '',
      savedPassword: savedPassword ?? '',
    };
  }

  /**
   * If user enabled biometric login, try automatic authentication and login.
   */
  async tryBiometricAutoLogin(lockboxProof?: string) {
    if (!this.useBiometric) return false;

    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!hasHardware || !enrolled) return false;

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Log in with Face ID',
      fallbackLabel: 'Use Passcode',
      disableDeviceFallback: false,
    });

    if (result.success) {
      await this.autoLogin(lockboxProof);
      return true;
    }
    return false;
  }

  /**
   * Perform automatic login using saved credentials.
   */
  async autoLogin(lockboxProof?: string) {
    try {
      const email = await SecureStore.getItemAsync('lastEmail');
      const password = await SecureStore.getItemAsync('lastPassword');
      if (!email || !password) return;

      const ok = await AuthService.getInstance().signin(email, password, lockboxProof);
      if (ok) this.handleSuccessfulLogin(email);
    } catch (err) {
      console.error('Auto-login failed', err);
    }
  }

  /**
   * Handle normal login + credential storage + biometric activation.
   */
  async handleLogin(
    email: string,
    password: string,
    useBiometric: boolean,
    biometricType: BiometricType,
    lockboxProof?: string
  ) {
    const auth = AuthService.getInstance();
    const ok = await auth.signin(email, password, lockboxProof);

    if (!ok) {
      Alert.alert('Login failed', 'Invalid credentials');
      return false;
    }

    // Always save credentials securely after successful login
    await SecureStore.setItemAsync('lastEmail', email, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    });
    await SecureStore.setItemAsync('lastPassword', password, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    });

    // If biometric is on, confirm and mark preference
    if (useBiometric) {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (hasHardware && enrolled) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: `Enable ${biometricType ?? 'biometric login'}?`,
          cancelLabel: 'Not now',
        });
        if (result.success) {
          await SecureStore.setItemAsync('useBiometric', 'true');
          this.useBiometric = true;
        }
      } else {
        Alert.alert('Unavailable', 'Biometric authentication not set up on this device.');
      }
    }

    this.handleSuccessfulLogin(email);
    return true;
  }

  /**
   * Clear saved credentials (e.g. when user disables FaceID or logs out)
   */
  async clearStoredCredentials() {
    await SecureStore.deleteItemAsync('lastEmail');
    await SecureStore.deleteItemAsync('lastPassword');
    await SecureStore.deleteItemAsync('useBiometric');
    this.useBiometric = false;
  }

  /**
   * Full logout process with cleanup.
   */
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
}
