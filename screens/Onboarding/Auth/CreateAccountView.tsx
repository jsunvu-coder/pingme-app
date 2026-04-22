import {
  useState,
  forwardRef,
  useImperativeHandle,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { View, Text, Linking, TouchableWithoutFeedback, Switch, Alert } from 'react-native';
import { useRoute } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { accountSecureKey, accountDataKey } from 'business/Constants';
import { CryptoUtils } from 'business/CryptoUtils';
import PasswordRules from 'components/PasswordRules';
import AuthInput from 'components/AuthInput';
import EmailIcon from 'assets/EmailIcon';
import PasswordIcon from 'assets/PasswordIcon';
import CheckSquareIcon from 'assets/CheckSquareIcon';
import { TOC_URL } from 'business/Config';
import PrimaryButton from 'components/PrimaryButton';
import { AuthService } from 'business/services/AuthService';
import { push, setRootScreen } from 'navigation/Navigation';
import { AccountDataService } from 'business/services/AccountDataService';
import { deepLinkHandler } from 'business/services/DeepLinkHandler';
import { shareFlowService } from 'business/services/ShareFlowService';
import { validatePasswordFields as sharedValidatePasswords } from './passwordValidation';
import { hasTranslation, t } from 'i18n';
import { showFlashMessage } from 'utils/flashMessage';
import { isPasswordValid as isPasswordValidByPolicy } from 'utils/passwordPolicy';
import { BiometricType, LoginViewModel } from './LoginViewModel';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Spec: if PRIVATE_KEY and ENC_KEY_REF already exist locally for this email,
 * the app must warn the user that proceeding will overwrite the existing keys.
 */
async function hasExistingAccountKeys(normalizedEmail: string): Promise<boolean> {
  // Spec: ENC_KEY_REF is in AsyncStorage (non-secure); messaging_private_key in SecureStore.
  const key = accountDataKey(normalizedEmail, 'enc_key_ref');
  // Migration fallback: pre-C6 users have enc_key_ref in SecureStore under the same key string.
  let encKeyRef = await AsyncStorage.getItem(key);
  if (!encKeyRef) {
    try {
      const legacy = await SecureStore.getItemAsync(key);
      if (legacy) {
        await AsyncStorage.setItem(key, legacy);
        await SecureStore.deleteItemAsync(key);
        encKeyRef = legacy;
      }
    } catch {
      /* ignore */
    }
  }
  const privMsg = await SecureStore.getItemAsync(
    accountSecureKey(normalizedEmail, 'messaging_private_key')
  );
  return Boolean(encKeyRef && privMsg);
}

function confirmOverwriteKeys(): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      'Overwrite existing account keys?',
      'Account keys already exist on this device for this email. If you proceed, the existing keys will be overwritten.',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Continue', style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}

export interface CreateAccountViewRef {
  register: (bundleMessagemessage?: string) => Promise<void>;
}

interface CreateAccountViewProps {
  lockboxProof?: string;
  prefillUsername?: string;
  amountUsdStr?: string;
  tokenName?: string;
  disableSuccessScreen?: boolean;
  disableSuccessCallback?: boolean;
  removeButtonCreateAccount?: boolean;
  setIsFormValid?: (valid: boolean) => void;
  setLoading?: (loading: boolean) => void;
  senderCommitment?: string;
  bundle_uuid?: string;
}

const CreateAccountView = forwardRef<CreateAccountViewRef, CreateAccountViewProps>(
  (
    {
      lockboxProof,
      prefillUsername,
      amountUsdStr,
      tokenName,
      disableSuccessScreen,
      disableSuccessCallback,
      removeButtonCreateAccount,
      setIsFormValid = (valid: boolean) => valid,
      setLoading: setLoadingProp = (loading: boolean) => {},
      senderCommitment,
      bundle_uuid,
    },
    ref
  ) => {
    const route = useRoute<any>();

    const vm = useMemo(() => new LoginViewModel(), []);
    const initialEmail =
      prefillUsername ?? route?.params?.prefillUsername ?? route?.params?.username ?? '';
    const claimedAmountUsd = amountUsdStr ?? route?.params?.amountUsdStr;

    const [email, setEmail] = useState(initialEmail);
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [agreeToC, setAgreeToC] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<{ email?: string; password?: string; confirm?: string }>(
      {}
    );
    const [useBiometric, setUseBiometric] = useState(false);
    const [biometricType, setBiometricType] = useState<BiometricType>(null);
    const [initialized, setInitialized] = useState(false);
    const toggleIdRef = useRef(0);
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    /**
     * Spec (Sign Up step 1): "the app generates a pair of new public / private
     * key while the user enters the email and keeps it in memory."
     * Pre-generate once on mount so submit doesn't pay the keygen cost.
     */
    const prewarmedKeysRef = useRef<{
      seedHex: string;
      privMsgHex: string;
      pubMsgHex: string;
    } | null>(null);

    useEffect(() => {
      if (prewarmedKeysRef.current) return;
      try {
        const seed32 = crypto.getRandomValues(new Uint8Array(32));
        const { priv, pub } = CryptoUtils.x25519Ephemeral();
        prewarmedKeysRef.current = {
          seedHex: CryptoUtils.bytesToHex(seed32),
          privMsgHex: CryptoUtils.bytesToHex(priv),
          pubMsgHex: CryptoUtils.bytesToHex(pub),
        };
      } catch (err) {
        console.warn('[CreateAccountView] keygen prewarm failed', err);
      }
    }, []);

    useEffect(() => {
      let cancelled = false;

      (async () => {
        const init = await vm.initialize();
        if (cancelled) return;

        setBiometricType(init.biometricType);
        setUseBiometric(init.useBiometric);
        setInitialized(true);

        // Auto trigger biometric if enabled
        if (!(init.useBiometric && init.biometricType)) return;

        // Add small delay to ensure screen is fully rendered before showing biometric prompt
        // This fixes the issue where biometric prompt doesn't show on first use
        await new Promise((resolve) => setTimeout(resolve, 300));

        if (cancelled) return;
      })();

      return () => {
        cancelled = true;
      };
    }, [vm]);

    const handleToggleBiometric = useCallback(
      (value: boolean) => {
        // Update UI immediately so the toggle feels responsive
        setUseBiometric(value);

        // Cancel any pending debounced call
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

        // Capture the latest id — all previous async ops will see their id is stale
        const id = ++toggleIdRef.current;

        // Debounce: only run async logic after user stops toggling
        debounceTimerRef.current = setTimeout(async () => {
          try {
            // Secondary guard: a newer toggle came in while timer was waiting
            if (id !== toggleIdRef.current) return;

            if (!value) {
              await LoginViewModel.clearSavedCredentials();
              if (id !== toggleIdRef.current) return;

              await LoginViewModel.setUseBiometricPreference(false);
              if (id !== toggleIdRef.current) return;

              vm.useBiometric = false;
              return;
            }

            // Validate capability before enabling
            const capability = await LoginViewModel.ensureCapability();
            if (id !== toggleIdRef.current) return;

            if (!capability.available) {
              const message = capability.needsEnrollment
                ? t('AUTH_BIOMETRIC_NOT_ENROLLED')
                : t('AUTH_BIOMETRIC_NOT_SUPPORTED');
              showFlashMessage({ title: t('NOTICE'), message, type: 'warning' });
              setUseBiometric(false);
              return;
            }

            // Don't save preference here - let handleLogin/handleRegister manage it
            // Set to false so it enters Case 1 (enableBiometricLogin) on next login
            vm.useBiometric = false;
          } catch (error) {
            if (id !== toggleIdRef.current) return;
            console.error('Error toggling biometric:', error);
            setUseBiometric(false);
            showFlashMessage({
              title: t('NOTICE'),
              message: 'Failed to validate biometric capability',
              type: 'danger',
            });
          }
        }, 300);
      },
      [vm]
    );

    // Validation helper
    const validateField = (field: string, value: string, checkAll?: boolean) => {
      const newErrors = { ...errors };

      switch (field) {
        case 'email':
          if (!value) newErrors.email = 'Email is required';
          else if (!emailRegex.test(value.trim())) newErrors.email = 'Invalid email address';
          else delete newErrors.email;
          break;

        case 'password':
        case 'confirm': {
          const pwd = field === 'password' ? value : password;
          const conf = field === 'confirm' ? value : confirm;
          const validation = sharedValidatePasswords(pwd, conf);
          if (validation.password) newErrors.password = validation.password;
          else delete newErrors.password;
          if (conf.length > 0 || checkAll) {
            if (validation.confirm) newErrors.confirm = validation.confirm;
            else delete newErrors.confirm;
          }
          break;
        }
      }

      setErrors(newErrors);
    };

    const hasErrors = Object.keys(errors).length > 0;
    const isEmailValid = emailRegex.test(email.trim());
    const passwordOk = isPasswordValidByPolicy(password);

    const isFormValid =
      !!email && !!password && !!confirm && isEmailValid && passwordOk && !hasErrors && agreeToC;

    useEffect(() => {
      setIsFormValid(isFormValid);
    }, [isFormValid, setIsFormValid]);

    const handleRegister = useCallback(async (bundleMessage?: string) => {
      const auth = AuthService.getInstance();
      console.log('🔐 [Biometric] handleLogin START:', {
        useBiometric_param: useBiometric,
        biometricType,
      });

      // Spec: warn + confirm before overwriting locally stored keys for this email.
      const normalizedEmail = email.trim().toLowerCase();
      if (await hasExistingAccountKeys(normalizedEmail)) {
        const confirmed = await confirmOverwriteKeys();
        if (!confirmed) return;
      }

      setLoadingProp(true);
      setLoading(true);

      try {
        const lockbox = lockboxProof ?? route?.params?.lockboxProof;
        const _senderCommitment = senderCommitment ?? route?.params?.senderCommitment;

        const ok = await Promise.race([
          auth.signup(
            email,
            password,
            lockbox,
            _senderCommitment,
            useBiometric,
            biometricType,
            claimedAmountUsd,
            tokenName,
            disableSuccessCallback,
            disableSuccessScreen,
            prewarmedKeysRef.current ?? undefined
          ),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Request timed out. Please try again.')), 20000)
          ),
        ]);

        if (ok) {
          push('VerifyEmailScreen', { email: email, mode: 'signup', bundle_uuid: bundle_uuid, bundleMessage: bundleMessage });
        }
      } catch (err: any) {
        console.error('Signup error:', err);
        const rawMessage = err?.message;

        let message =
          rawMessage === 'CREDENTIALS_ALREADY_EXISTS'
            ? 'Account already exists'
            : 'Unable to create account';

        if (rawMessage && hasTranslation(rawMessage)) {
          message = t(rawMessage);
        }

        showFlashMessage({
          title: 'Signup failed',
          message,
          type: 'danger',
        });

        if (disableSuccessCallback) {
          throw err;
        }
      } finally {
        setLoadingProp(false);
        setLoading(false);
      }
    }, [
      email,
      password,
      lockboxProof,
      route,
      disableSuccessCallback,
      disableSuccessScreen,
      claimedAmountUsd,
      tokenName,
      useBiometric,
    ]);

    useImperativeHandle(
      ref,
      () => ({
        register: handleRegister,
      }),
      [handleRegister]
    );

    const biometricLabel =
      biometricType === 'Face ID'
        ? t('FACE_ID')
        : biometricType === 'Touch ID'
          ? t('TOUCH_ID')
          : t('AUTH_USE_BIOMETRIC_GENERIC');

    return (
      <View className="flex-1 bg-white">
        <View className="flex-1 gap-y-2 px-6">
          <AuthInput
            icon={<EmailIcon />}
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              validateField('email', text);
            }}
            placeholder="Email address"
            keyboardType="email-address"
            error={!!errors.email}
            errorMessage={errors.email}
            editable={!loading}
          />

          <AuthInput
            icon={<PasswordIcon />}
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              validateField('password', text);
            }}
            placeholder="Password"
            secureTextEntry
            customView={<PasswordRules password={password} />}
            error={!!errors.password}
            errorMessage={errors.password}
            autoCapitalize="none"
            editable={!loading}
          />

          <AuthInput
            icon={<PasswordIcon />}
            value={confirm}
            onChangeText={(text) => {
              setConfirm(text);
              validateField('confirm', text, true);
            }}
            placeholder="Re-enter password"
            secureTextEntry
            onBlur={() => validateField('confirm', confirm, true)}
            error={!!errors.confirm}
            errorMessage={errors.confirm}
            returnKeyType="done"
            blurOnSubmit
            editable={!loading}
            onSubmitEditing={() => {
              if (!loading && isFormValid) {
                void handleRegister();
              }
            }}
          />

          <TouchableWithoutFeedback
            onPress={() => {
              if (loading) return;
              setAgreeToC(!agreeToC);
            }}>
            <View className="mt-3 flex-row items-center gap-x-2">
              <CheckSquareIcon isChecked={agreeToC} />
              <Text>
                I confirm that I have read and agreed to{' '}
                <Text
                  onPress={() => {
                    Linking.openURL(TOC_URL);
                  }}
                  className="text-[#FD4912]">
                  TOS
                </Text>
              </Text>
            </View>
          </TouchableWithoutFeedback>
          <View className="mt-3 flex-row items-center">
            <Switch
              value={useBiometric}
              onValueChange={(value) => {
                handleToggleBiometric(value);
              }}
              trackColor={{ false: '#ccc', true: '#FD4912' }}
              thumbColor={useBiometric ? '#fff' : '#f4f3f4'}
              disabled={!initialized || loading}
            />
            <Text className="ml-3 text-[15px] text-[#1D1D1D]">
              {t('AUTH_USE_BIOMETRIC', {
                method: biometricLabel,
              })}
            </Text>
          </View>
        </View>

        {!removeButtonCreateAccount && (
          <View className="mt-6 px-6 pb-12">
            <PrimaryButton
              title="Create Account"
              disabled={loading || !isFormValid}
              loading={loading}
              loadingText="Creating account..."
              onPress={handleRegister}
            />
          </View>
        )}
      </View>
    );
  }
);

CreateAccountView.displayName = 'CreateAccountView';

export default CreateAccountView;
