import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';
import { AuthService } from 'business/services/AuthService';
import { AccountDataService } from 'business/services/AccountDataService';
import { MessagingService } from 'business/services/MessagingService';
import { deepLinkHandler } from 'business/services/DeepLinkHandler';
import { setRootScreen, push, presentOverMain } from 'navigation/Navigation';
import { hasTranslation, t } from 'i18n';
import {
  EMAIL_KEY,
  PASSWORD_KEY,
  USE_BIOMETRIC_KEY,
  ACCOUNT_EMAILS_KEY,
  GLOBAL_SALT_CACHE_KEY,
} from 'business/Constants';
import { ENV_STORAGE_KEY } from 'business/Config';
import { showFlashMessage } from 'utils/flashMessage';
import { shareFlowService } from 'business/services/ShareFlowService';
import { LOCKBOX_METADATA_STORAGE_PREFIX } from 'business/services/LockboxMetadataStorage';
import { store } from 'store';
import { setMessagingKeysAvailable, resetMessagingKeysAvailable } from 'store/authSlice';

export type BiometricType = 'Face ID' | 'Touch ID' | 'Biometric Authentication' | null;

/**
 * Spec (multi-account persistence): these AsyncStorage keys / prefixes must
 * survive logout so the list of accounts, per-email secrets (enc_key_ref),
 * global salt cache, and env choice persist across sessions.
 *
 * Everything not in this allowlist is wiped by logout.
 */
const PRESERVE_KEYS_ON_LOGOUT = new Set<string>([
  ACCOUNT_EMAILS_KEY,
  GLOBAL_SALT_CACHE_KEY,
  ENV_STORAGE_KEY,
]);

const PRESERVE_KEY_PREFIXES_ON_LOGOUT = [
  'pingme.account.', // per-email account data (enc_key_ref, etc.)
  LOCKBOX_METADATA_STORAGE_PREFIX,
];

function shouldPreserveOnLogout(key: string): boolean {
  if (PRESERVE_KEYS_ON_LOGOUT.has(key)) return true;
  return PRESERVE_KEY_PREFIXES_ON_LOGOUT.some((prefix) => key.startsWith(prefix));
}

export class LoginViewModel {
  public biometricType: BiometricType = null;
  public useBiometric = false;

  /** Shared with AccountActionList / other logout callers. */
  static shouldPreserveAsyncKeyOnLogout(key: string): boolean {
    return shouldPreserveOnLogout(key);
  }

  /**
   * Checks local key presence for the given email and dispatches the result to
   * Redux so UI gating (selectAppFullyFunctional) reflects reality.
   * Used by inline login flows (HongBao / claim) that want the flag updated
   * without showing the Skip / Generate prompt.
   */
  static async syncMessagingKeysAvailable(email: string): Promise<boolean> {
    try {
      const has = await AuthService.getInstance().hasMessagingKeys(email);
      store.dispatch(setMessagingKeysAvailable(has));
      return has;
    } catch (err) {
      console.error('[LoginVM] syncMessagingKeysAvailable failed', err);
      return false;
    }
  }

  /**
   * Spec (Sign In step 2 + Sign In Alternates): after login / claim, the app
   * must check whether messaging keys exist for the active email. If missing,
   * prompt the user to generate them (Skip / Generate).
   *
   * Reusable by LoginViewModel.handleLogin AND by non-standard entrypoints
   * like HongBao claim success where we want the same prompt AFTER the claim.
   *
   * Outcomes:
   *   - 'has_keys': keys already present, nothing to do.
   *   - 'skip':     user chose Skip; caller should continue normal routing.
   *   - 'generate': user chose Generate; /pm_register_key was called, caller
   *                 should push VerifyEmailScreen with mode='generate_new_key'.
   *   - 'error':    a check / registration failed; caller should continue.
   *
   * Side effects: always dispatches setMessagingKeysAvailable; 'generate'
   * additionally stashes pending signup state for the OTP screen.
   */
  static async promptKeyCheckAndMaybeGenerate(
    email: string
  ): Promise<'has_keys' | 'skip' | 'generate' | 'error'> {
    const auth = AuthService.getInstance();
    let hasKeys: boolean;
    try {
      hasKeys = await auth.hasMessagingKeys(email);
    } catch (err) {
      console.error('[LoginVM] hasMessagingKeys failed', err);
      return 'error';
    }

    store.dispatch(setMessagingKeysAvailable(hasKeys));
    if (hasKeys) return 'has_keys';

    const wantGenerate = await new Promise<boolean>((resolve) => {
      Alert.alert(
        'Enable secure messaging',
        'Messaging keys are missing for this account. Generate them now? You can also skip and generate later from the Account menu.',
        [
          { text: 'Skip', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Generate', onPress: () => resolve(true) },
        ],
        { cancelable: false }
      );
    });

    if (!wantGenerate) return 'skip';

    try {
      await auth.initiateKeyGeneration(email);
      return 'generate';
    } catch (err) {
      console.error('[LoginVM] initiateKeyGeneration failed', err);
      showFlashMessage({
        title: 'Notice',
        message:
          'Could not start the key generation flow. You can retry later from the Account menu.',
        type: 'warning',
      });
      return 'error';
    }
  }

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
    shareParams?: {
      mode: 'claimed';
      amountUsdStr?: string;
      from?: 'login' | 'signup';
      tokenName?: string;
      disableSuccessScreen?: boolean;
    },
    disableSuccessCallback?: boolean,
    senderCommitment?: string
  ): Promise<{ success: boolean; biometricEnabled: boolean }> {
    console.log('🔐 [Biometric] handleLogin START:', {
      useBiometric_param: useBiometric,
      'this.useBiometric': this.useBiometric,
      biometricType,
    });

    const auth = AuthService.getInstance();
    let ok = false;

    try {
      ok = await this.withTimeout(auth.signin(email, password, lockboxProof, senderCommitment));
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

    // Handle biometric preference changes
    if (useBiometric) {
      // User wants biometric enabled
      if (!this.useBiometric) {
        // Case 1: User just enabled biometric (toggle switched from OFF to ON)
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
        // Case 2: Biometric preference was already ON
        // Always save/update credentials to ensure they persist after logout+login
        await LoginViewModel.saveCredentials(email, password);
        await LoginViewModel.setUseBiometricPreference(true);
        biometricEnabled = true;
      }
    } else {
      // User wants biometric disabled
      if (this.useBiometric) {
        // Case 3: User just disabled biometric (toggle switched from ON to OFF)
        await this.disableBiometricLogin();
      }
      biometricEnabled = false;
    }

    // Spec (Sign In step 2): key presence check + GENERATE NEW KEY prompt.
    if (disableSuccessCallback) {
      // Inline login (HongBao / claim): no prompt, but we still sync the flag
      // so downstream UI (AniCover "Send a Hongbao", tabs, etc.) reflects reality.
      await LoginViewModel.syncMessagingKeysAvailable(email);
    } else {
      const outcome = await LoginViewModel.promptKeyCheckAndMaybeGenerate(email);
      if (outcome === 'generate') {
        AccountDataService.getInstance().email = email;
        push('VerifyEmailScreen', { email, mode: 'generate_new_key' });
        return { success: true, biometricEnabled };
      }
      // 'has_keys' | 'skip' | 'error' → fall through to normal navigation.
      // If a pending deep link requires messaging keys, DeepLinkHandler's
      // guardMessagingKeys will surface the "keys required" alert at resume
      // time; we deliberately leave the pending URL intact so the user can
      // still retry after generating keys from the Account menu.
    }

    this.handleSuccessfulLogin(email, shareParams, disableSuccessCallback);
    // Warm up inbox right after login so the Account badge reflects reality
    // without waiting for the user to open the Account tab.
    void MessagingService.getInstance().refreshForEmail(email);
    return { success: true, biometricEnabled };
  }

  async clearStoredCredentials() {
    // Only clear credentials (EMAIL, PASSWORD), preserve user preference (USE_BIOMETRIC_KEY)
    // This allows biometric to auto-trigger after logout+login if user had it enabled
    await LoginViewModel.clearSavedCredentials();
  }

  async logout() {
    // Only clear credentials, NOT the biometric preference
    // User preference should persist across logout/login sessions
    await LoginViewModel.clearSavedCredentials();

    try {
      const keys = await AsyncStorage.getAllKeys();
      // Multi-account: preserve account list, per-email secrets, global salt cache, env.
      const keysToRemove = keys.filter((k) => !shouldPreserveOnLogout(k));
      if (keysToRemove.length) await AsyncStorage.multiRemove(keysToRemove);
    } catch (err) {
      console.warn('⚠️ Failed to clear AsyncStorage on logout', err);
    }
    store.dispatch(resetMessagingKeysAvailable());
    AuthService.getInstance().logout();
    push('SplashScreen');
  }

  handleSuccessfulLogin(
    email: string,
    shareParams?: {
      mode: 'claimed';
      amountUsdStr?: string;
      from?: 'login' | 'signup';
      tokenName?: string;
      disableSuccessScreen?: boolean;
    },
    disableSuccessCallback?: boolean
  ) {
    AccountDataService.getInstance().email = email;
    if (!disableSuccessCallback) {
      // Only set pending claim if we want to show success screen
      if (shareParams?.mode === 'claimed') {
        shareFlowService.setPendingClaim({
          amountUsdStr: shareParams.amountUsdStr,
          from: shareParams.from ?? 'login',
          tokenName: shareParams.tokenName,
        });
      }
      setRootScreen([{ name: 'MainTab', params: { entryAnimation: 'slide_from_right' } }]);

      const pendingLink = deepLinkHandler.getPendingLink();
      if (pendingLink) {
        console.log('[Auth] Pending deep link detected → delaying resume by 0.5s...');
        setTimeout(() => deepLinkHandler.resumePendingLink(), 500);
      }
    }
  }

  public async enableBiometricLogin(
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

  public async disableBiometricLogin() {
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

      if (!result.success) return { success: false };

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
