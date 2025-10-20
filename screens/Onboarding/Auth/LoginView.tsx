import { useEffect, useState } from 'react';
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
  const vm = new LoginViewModel();

  const initialEmail = prefillUsername ?? route?.params?.prefillUsername ?? '';
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [useBiometric, setUseBiometric] = useState(false);
  const [biometricType, setBiometricType] = useState<BiometricType>(null);

  useEffect(() => {
    (async () => {
      const { biometricType, useBiometric, savedEmail, savedPassword } = await vm.initialize();
      setBiometricType(biometricType);
      setUseBiometric(useBiometric);
      if (savedEmail) setEmail(savedEmail);
      if (savedPassword) setPassword(savedPassword);

      const shouldAutoLogin = lockboxProof === undefined;
      console.log('shouldAutoLogin:', shouldAutoLogin);
      // 🚫 Skip Face ID auto login when tabs are visible
      if (shouldAutoLogin) {
        await vm.tryBiometricAutoLogin(lockboxProof ?? route?.params?.lockboxProof);
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
          autoFocus
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
