import { useCallback, useEffect, useMemo, useState } from 'react';
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

export default function LoginView({
  lockboxProof,
  prefillUsername,
  from,
}: {
  lockboxProof?: string;
  prefillUsername?: string;
  from?: string;
  amountUsdStr?: string;
}) {
  const route = useRoute<any>();
  const vm = useMemo(() => new LoginViewModel(), []);
  const routeLockboxProof = route?.params?.lockboxProof;

  const [email, setEmail] = useState(
    prefillUsername ?? route?.params?.prefillUsername ?? 'test_email35412@test.com'
  );
  const [password, setPassword] = useState('test_pass_74282');
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

      // ✅ Only auto trigger Face ID — DO NOT auto login
      if (!(init.useBiometric && init.biometricType)) return;

      const result = await vm.autoTriggerBiometric(); // new safe method
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
      setUseBiometric(value);

      if (!value) {
        await vm.clearStoredCredentials();
        return;
      }

      const capability = await LoginViewModel.ensureCapability();
      if (!capability.available) {
        const message = capability.needsEnrollment
          ? t('AUTH_BIOMETRIC_NOT_ENROLLED')
          : t('AUTH_BIOMETRIC_NOT_SUPPORTED');
        showFlashMessage({ title: t('NOTICE'), message, type: 'warning' });
        setUseBiometric(false);
      }
    },
    [vm]
  );

  const handleLogin = async () => {
    Keyboard.dismiss();
    if (!email || !password) {
      showFlashMessage({
        title: t('AUTH_LOGIN_ERROR_TITLE'),
        message: t('AUTH_LOGIN_ERROR_MISSING_FIELDS'),
        type: 'warning',
      });
      return;
    }

    setLoading(true);
    const result = await vm.handleLogin(
      email,
      password,
      useBiometric,
      biometricType,
      lockboxProof ?? routeLockboxProof, // 🔒 Keep proof logic intact
      lockboxProof || routeLockboxProof
        ? {
            mode: 'claimed',
            amountUsdStr: amountUsdStr ?? route?.params?.amountUsdStr,
            from,
          }
        : undefined
    );
    setLoading(false);

    if (result?.success) {
      setUseBiometric(result.biometricEnabled);
    }
  };

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
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <View>
          <AuthInput
            icon={<PasswordIcon />}
            value={password}
            onChangeText={setPassword}
            placeholder={t('AUTH_PASSWORD_PLACEHOLDER')}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={() => {
              handleLogin();
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
            disabled={!initialized}
          />
          <Text className="ml-3 text-[15px] text-[#1D1D1D]">
            {t('AUTH_USE_BIOMETRIC', {
              method: biometricLabel,
            })}
          </Text>
        </View>
      </View>

      <View className="mt-6 px-6 pb-12">
        <PrimaryButton
          title={t('AUTH_LOGIN_BUTTON')}
          onPress={handleLogin}
          disabled={loading}
          loading={loading}
          loadingText={t('AUTH_LOGIN_LOADING')}
        />
      </View>
    </View>
  );
}
