import { useCallback, useEffect, useMemo, useState, forwardRef, useImperativeHandle } from 'react';
import { View, Text, TouchableOpacity, Switch, Keyboard } from 'react-native';
import AuthInput from 'components/AuthInput';
import EmailIcon from 'assets/EmailIcon';
import PasswordIcon from 'assets/PasswordIcon';
import PrimaryButton from 'components/PrimaryButton';
import { useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { push } from 'navigation/Navigation';
import { t } from 'i18n';
import { LoginViewModel, BiometricType } from './LoginViewModel';
import { showFlashMessage } from 'utils/flashMessage';
import * as SecureStore from 'expo-secure-store';
import { Utils } from 'business/Utils';

export interface LoginViewRef {
  login: () => Promise<void>;
}

interface LoginViewProps {
  lockboxProof?: string;
  prefillUsername?: string;
  from?: 'login' | 'signup';
  amountUsdStr?: string;
  tokenName?: string;
  disableSuccessScreen?: boolean;
  removeButtonLogin?: boolean;
  disableSuccessCallback?: boolean;
  altHandleLogin?: () => Promise<void>;
}

const LoginView = forwardRef<LoginViewRef, LoginViewProps>(({
  lockboxProof,
  prefillUsername,
  from,
  amountUsdStr,
  tokenName,
  disableSuccessScreen,
  removeButtonLogin,
  disableSuccessCallback,
  altHandleLogin
}, ref) => {
  const route = useRoute<any>();
  const vm = useMemo(() => new LoginViewModel(), []);
  const routeLockboxProof = route?.params?.lockboxProof;

  const [email, setEmail] = useState(prefillUsername ?? route?.params?.prefillUsername ?? '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [useBiometric, setUseBiometric] = useState(false);
  const [biometricType, setBiometricType] = useState<BiometricType>(null);
  const [initialized, setInitialized] = useState(false);

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

      const result = await vm.autoTriggerBiometric();
      if (!result.success || !result.email || !result.password || cancelled) return;

      // Fill credentials but don't login automatically
      setEmail(result.email);
      setPassword(result.password);
    })();

    return () => {
      cancelled = true;
    };
  }, [vm]);

  const handleToggleBiometric = useCallback(
    async (value: boolean) => {
      try {
        setUseBiometric(value);

        if (!value) {
          // User explicitly disabled biometric - clear both credentials AND preference
          await LoginViewModel.clearSavedCredentials();
          await LoginViewModel.setUseBiometricPreference(false);
          // IMPORTANT: Update ViewModel instance state to keep it in sync with storage
          vm.useBiometric = false;
          return;
        }

        // Validate capability before enabling
        const capability = await LoginViewModel.ensureCapability();
        if (!capability.available) {
          const message = capability.needsEnrollment
            ? t('AUTH_BIOMETRIC_NOT_ENROLLED')
            : t('AUTH_BIOMETRIC_NOT_SUPPORTED');
          showFlashMessage({ title: t('NOTICE'), message, type: 'warning' });
          setUseBiometric(false);
          return;
        }

        // Don't save preference here - let handleLogin manage it during actual login
        // This prevents the case where biometric is enabled but no credentials are saved
        // But DO update the instance state so handleLogin knows user wants to enable it
        vm.useBiometric = false; // Set to false so handleLogin enters Case 1 (enableBiometricLogin)
      } catch (error) {
        console.error('Error toggling biometric:', error);
        setUseBiometric(false);
        showFlashMessage({
          title: t('NOTICE'),
          message: 'Failed to validate biometric capability',
          type: 'danger',
        });
      }
    },
    [vm]
  );

  const handleLogin = useCallback(async () => {
    Keyboard.dismiss();
    if (!email || !password) {
      showFlashMessage({
        title: t('AUTH_LOGIN_ERROR_TITLE'),
        message: t('AUTH_LOGIN_ERROR_MISSING_FIELDS'),
        type: 'warning',
      });
      if(disableSuccessCallback) {
        throw new Error(t('AUTH_LOGIN_ERROR_MISSING_FIELDS'));
      }
      return;
    }

    setLoading(true);
    try {
      const fromParam: 'login' | 'signup' =
        (from ?? route?.params?.from) === 'signup' ? 'signup' : 'login';
      const loginPromise = vm.handleLogin(
        email,
        password,
        useBiometric,
        biometricType,
        lockboxProof ?? routeLockboxProof, // 🔒 Keep proof logic intact
        lockboxProof || routeLockboxProof
          ? {
              mode: 'claimed',
              amountUsdStr: amountUsdStr ?? route?.params?.amountUsdStr,
              from: fromParam,
              tokenName: tokenName,
              disableSuccessScreen: disableSuccessScreen ?? route?.params?.disableSuccessScreen,
            }
          : undefined,
          disableSuccessCallback
      );

      const result = await Promise.race([
        loginPromise,
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('Something went wrong. Please close the app and login again. ')),
            20000
          )
        ),
      ]);

      if (result?.success) {
        setUseBiometric(result.biometricEnabled);
      } else {
        setLoading(false);
        if(disableSuccessCallback) {
          throw new Error(t('AUTH_LOGIN_INVALID_CREDENTIALS'));
        }
      }
    } catch (err: any) {
      showFlashMessage({
        title: t('AUTH_LOGIN_FAILED_TITLE'),
        message: err?.message || t('AUTH_LOGIN_INVALID_CREDENTIALS'),
        type: 'danger',
      });
      setLoading(false);
      if(disableSuccessCallback) {
        throw new Error(err?.message || t('AUTH_LOGIN_INVALID_CREDENTIALS'));
      }
    }
  }, [email, password, useBiometric, biometricType, lockboxProof, routeLockboxProof, from, amountUsdStr, tokenName, disableSuccessScreen, route, vm]);

  useImperativeHandle(ref, () => ({
    login: handleLogin,
  }), [handleLogin]);



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
          onChangeText={setEmail}
          placeholder={t('AUTH_EMAIL_PLACEHOLDER')}
          editable={!loading}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <View>
          <AuthInput
            icon={<PasswordIcon />}
            value={password}
            onChangeText={setPassword}
            placeholder={t('AUTH_PASSWORD_PLACEHOLDER')}
            editable={!loading}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={() => {
              altHandleLogin ? altHandleLogin() : handleLogin();
            }}
          />
          <TouchableOpacity
            className="absolute top-3 right-0 flex-row items-center justify-center px-4"
            onPress={() => push('ScanRecoveryScreen')}>
            <Text className="text-md mr-2 font-semibold text-[#FD4912]">
              {t('FORGOT_PASSWORD')}
            </Text>
            <Ionicons name="scan-outline" size={22} color="#1D1D1D" />
          </TouchableOpacity>
        </View>

        <View className="mt-3 flex-row items-center">
          <Switch
            value={useBiometric}
            onValueChange={(value) => {
              void handleToggleBiometric(value);
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

      {!removeButtonLogin && <View className="mt-6 px-6 pb-12">
        <PrimaryButton
          title={t('AUTH_LOGIN_BUTTON')}
          onPress={handleLogin}
          disabled={loading}
          loading={loading}
          loadingText={t('AUTH_LOGIN_LOADING')}
        />
      </View>}
    </View>
  );
});

LoginView.displayName = 'LoginView';

export default LoginView;
