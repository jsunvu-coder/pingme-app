import { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import AuthInput from 'components/AuthInput';
import EmailIcon from 'assets/EmailIcon';
import PasswordIcon from 'assets/PasswordIcon';
import { AuthService } from 'business/services/AuthService';
import { setRootScreen, push } from 'navigation/Navigation';
import PrimaryButton from 'components/PrimaryButton';
import { AccountDataService } from 'business/services/AccountDataService';
import { useRoute } from '@react-navigation/native';
import { deepLinkHandler } from 'business/services/DeepLinkHandler';

export default function LoginView({ lockboxProof, prefillUsername, amountUsdStr }: any) {
  const route = useRoute<any>();
  const initialEmail = prefillUsername ?? route?.params?.prefillUsername ?? 'pingme15@test.com';
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
        setRootScreen(['MainTab']);

        const pendingLink = deepLinkHandler.getPendingLink();
        const hasPendingLink = pendingLink !== undefined && pendingLink !== null;

        if (hasPendingLink) {
          console.log('[Auth] Pending deep link detected → delaying resume by 0.5s...');
          setTimeout(() => {
            deepLinkHandler.resumePendingLink();
          }, 500); // ✅ 0.5-second delay
          return;
        }
      }
    } catch (err: any) {
      setLoading(false);
      console.error('Login error:', err);
      Alert.alert('Login failed', 'Invalid credentials');
    }
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

        <AuthInput
          icon={<PasswordIcon />}
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          secureTextEntry
        />

        <View className="mt-2 flex-row items-center justify-between">
          <Text className="font-medium text-[#FD4912]" onPress={() => push('ScanRecoveryScreen')}>
            Forgot password?
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
