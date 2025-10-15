import { useState } from 'react';
import { View, Text, Linking, Alert, TouchableWithoutFeedback } from 'react-native';
import { useRoute } from '@react-navigation/native';
import PasswordRules from 'components/PasswordRules';
import AuthInput from 'components/AuthInput';
import EmailIcon from 'assets/EmailIcon';
import PasswordIcon from 'assets/PasswordIcon';
import CheckSquareIcon from 'assets/CheckSquareIcon';
import { TOC_URL } from 'business/Config';
import PrimaryButton from 'components/PrimaryButton';
import { AuthService } from 'business/services/AuthService';
import { setRootScreen, presentOverMain } from 'navigation/Navigation';
import { AccountDataService } from 'business/services/AccountDataService';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CreateAccountView({ lockboxProof, prefillUsername, amountUsdStr }: any) {
  const route = useRoute<any>();
  const initialEmail =
    prefillUsername ?? route?.params?.prefillUsername ?? route?.params?.username ?? '';
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agreeToC, setAgreeToC] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirm?: string }>({});

  // Real-time validation
  const validateField = (field: string, value: string) => {
    const newErrors = { ...errors };

    switch (field) {
      case 'email':
        if (!value) {
          newErrors.email = 'Email is required';
        } else {
          delete newErrors.email;
        }
        break;
      case 'password':
        if (!value) {
          newErrors.password = 'Password is required';
        } else {
          delete newErrors.password;
        }
        break;
      case 'confirm':
        if (!value) {
          newErrors.confirm = 'Please re-enter password';
        } else if (password && value !== password) {
          newErrors.confirm = 'Passwords do not match';
        } else {
          delete newErrors.confirm;
        }
        break;
    }

    setErrors(newErrors);
  };

  const hasErrors = Object.keys(errors).length > 0;
  const isFormValid = email && password && confirm && !hasErrors && agreeToC;

  const handleRegister = async () => {
    setLoading(true);
    const auth = AuthService.getInstance();
    try {
      const ok = await auth.signup(email, password, lockboxProof ?? route?.params?.lockboxProof);
      if (ok) {
        AccountDataService.getInstance().email = email;
        const proof = lockboxProof ?? route?.params?.lockboxProof;
        if (proof) {
          presentOverMain('ShareScreen', { mode: 'claimed', amountUsdStr, from: 'signup' });
        } else {
          setRootScreen(['MainTab']);
        }
      }
    } catch (err: any) {
      console.error('Signup error:', err);
      Alert.alert('Signup failed', err?.message || 'Unable to create account');
    } finally {
      setLoading(false);
    }
  };

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
          error={!!errors.email}
          errorMessage={errors.email}
        />

        <AuthInput
          icon={<PasswordIcon />}
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            validateField('password', text);
            // Re-validate confirm when password changes
            if (confirm) {
              validateField('confirm', confirm);
            }
          }}
          placeholder="Password"
          secureTextEntry
          customView={<PasswordRules password={password} />}
          error={!!errors.password}
          errorMessage={errors.password}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <AuthInput
          icon={<PasswordIcon />}
          value={confirm}
          onChangeText={(text) => {
            setConfirm(text);
            validateField('confirm', text);
          }}
          placeholder="Re-enter password"
          secureTextEntry
          error={!!errors.confirm}
          errorMessage={errors.confirm}
        />

        <TouchableWithoutFeedback onPress={() => setAgreeToC(!agreeToC)}>
          <View className="flex-row items-center gap-x-2">
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
      </View>

      <PrimaryButton
        className="mx-6 mb-6"
        title="Create Account"
        disabled={loading || !isFormValid}
        loading={loading}
        loadingText="Creating account..."
        onPress={handleRegister}
      />
    </View>
  );
}
