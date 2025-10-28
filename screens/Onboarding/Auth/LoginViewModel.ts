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

  async initialize(): Promise<{
    biometricType: BiometricType;
    useBiometric: boolean;
  }> {
    const savedPref = await SecureStore.getItemAsync('useBiometric');
    if (savedPref === 'true') this.useBiometric = true;

    const supported = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (supported.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      this.biometricType = 'Face ID';
    } else if (supported.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      this.biometricType = 'Touch ID';
    }

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

    // ✅ Load credentials after successful biometric authentication
    const email = await SecureStore.getItemAsync('lastEmail');
    const password = await SecureStore.getItemAsync('lastPassword');

    if (!email || !password) return { success: false, email: undefined, password: undefined };

    // Just verify login success but don't navigate yet
    // const ok = await AuthService.getInstance().signin(email, password, lockboxProof);

    // Return credentials to fill the UI first
    return { success: true, email, password };
  }

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

    await SecureStore.setItemAsync('lastEmail', email);
    await SecureStore.setItemAsync('lastPassword', password);

    if (useBiometric && !this.useBiometric) {
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
    } else if (!useBiometric && this.useBiometric) {
      await SecureStore.setItemAsync('useBiometric', 'false');
      this.useBiometric = false;
    }

    this.handleSuccessfulLogin(email);
    return true;
  }

  async clearStoredCredentials() {
    await SecureStore.deleteItemAsync('lastEmail');
    await SecureStore.deleteItemAsync('lastPassword');
    await SecureStore.deleteItemAsync('useBiometric');
    this.useBiometric = false;
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
}
