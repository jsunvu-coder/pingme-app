import { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Switch, Alert } from 'react-native';
import AuthInput from 'components/AuthInput';
import EmailIcon from 'assets/EmailIcon';
import PasswordIcon from 'assets/PasswordIcon';
import PrimaryButton from 'components/PrimaryButton';
import { useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { push } from 'navigation/Navigation';
import { LoginViewModel, BiometricType } from './LoginViewModel';

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

  const [email, setEmail] = useState(prefillUsername ?? route?.params?.prefillUsername ?? '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [useBiometric, setUseBiometric] = useState(false);
  const [biometricType, setBiometricType] = useState<BiometricType>(null);

  useEffect(() => {
    (async () => {
      const init = await vm.initialize();
      setBiometricType(init.biometricType);
      setUseBiometric(init.useBiometric);

      if (init.useBiometric && init.biometricType) {
        const result = await vm.tryBiometricAutoLogin(lockboxProof ?? route?.params?.lockboxProof);

        if (result.success && result.email && result.password) {
          // ✅ Fill UI with stored credentials; user will submit manually
          setEmail(result.email);
          setPassword(result.password);
        }
      }
    })();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    await vm.handleLogin(
      email,
      password,
      useBiometric,
      biometricType,
      lockboxProof ?? route?.params?.lockboxProof
    );
    setLoading(false);
  };

  return (
    <View className="flex-1 bg-white">
      <View className="flex-1 gap-y-2 px-6">
        <AuthInput
          icon={<EmailIcon />}
          value={email}
          onChangeText={setEmail}
          placeholder="Email address"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <View>
          <AuthInput
            icon={<PasswordIcon />}
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry
          />
          <TouchableOpacity
            className="absolute top-3 right-0 flex-row items-center justify-center px-4"
            onPress={() => push('ScanRecoveryScreen')}>
            <Text className="text-md mr-2 font-semibold text-[#FD4912]">Forgot Password</Text>
            <Ionicons name="scan-outline" size={22} color="#1D1D1D" />
          </TouchableOpacity>
        </View>

        <View className="mt-3 flex-row items-center">
          <Switch
            value={useBiometric}
            onValueChange={setUseBiometric}
            trackColor={{ false: '#ccc', true: '#FD4912' }}
            thumbColor={useBiometric ? '#fff' : '#f4f3f4'}
          />
          <Text className="ml-3 text-[15px] text-[#1D1D1D]">
            Use {biometricType ?? 'Face/Touch ID'} to log in next time
          </Text>
        </View>
      </View>

      <View className="mt-6 px-6 pb-6">
        <PrimaryButton
          title="Log In"
          onPress={handleLogin}
          disabled={loading}
          loading={loading}
          loadingText="Logging in..."
        />
      </View>
    </View>
  );
}
