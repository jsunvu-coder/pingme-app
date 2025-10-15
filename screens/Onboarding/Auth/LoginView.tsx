import { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import AuthInput from 'components/AuthInput';
import EmailIcon from 'assets/EmailIcon';
import PasswordIcon from 'assets/PasswordIcon';
import { AuthService } from 'business/services/AuthService';
import { setRootScreen, presentOverMain } from 'navigation/Navigation';
import PrimaryButton from 'components/PrimaryButton';
import { AccountDataService } from 'business/services/AccountDataService';
import { useRoute } from '@react-navigation/native';

export default function LoginView({
  navigation,
  lockboxProof,
  prefillUsername,
  amountUsdStr,
}: any) {
  const route = useRoute<any>();
  const initialEmail = prefillUsername ?? route?.params?.prefillUsername ?? 'pingme01@test.com';
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('12345678');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);

    const authService = AuthService.getInstance();
    try {
      const ok = await authService.signin(
        email,
        password,
        lockboxProof ?? route?.params?.lockboxProof
      );
      setLoading(false);

      if (ok) {
        AccountDataService.getInstance().email = email;
        const proof = lockboxProof ?? route?.params?.lockboxProof;
        if (proof) {
          presentOverMain('ShareScreen', { mode: 'claimed', amountUsdStr, from: 'login' });
        } else {
          setRootScreen(['MainTab']);
        }
      }
    } catch (err: any) {
      setLoading(false);
      console.error('Login error:', err);
      Alert.alert('Login failed', err.message || 'Invalid credentials');
    }
  };

  return (
    <View className="flex-1 bg-white">
      <View className="flex-1 gap-y-2 px-6 py-8">
        <AuthInput
          icon={<EmailIcon />}
          value={email}
          onChangeText={setEmail}
          placeholder="Email address"
          keyboardType='email-address'
        />

        <AuthInput
          icon={<PasswordIcon />}
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          secureTextEntry
        />

        <View className="mt-2 flex-row items-center justify-between">
          <Text
            className="font-medium text-[#FD4912]"
            onPress={() => navigation.navigate('ForgotPassword')}>
            Forgot password?
          </Text>
        </View>
      </View>

      <View className="px-6 pb-6">
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
