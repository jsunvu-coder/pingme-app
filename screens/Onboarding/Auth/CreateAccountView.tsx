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
import { setRootScreen } from 'navigation/Navigation';
import { AccountDataService } from 'business/services/AccountDataService';
import { deepLinkHandler } from 'business/services/DeepLinkHandler';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/; // 8+ chars, upper, lower, digit

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

  // Validation helper
  const validateField = (field: string, value: string) => {
    const newErrors = { ...errors };

    switch (field) {
      case 'email':
        if (!value) newErrors.email = 'Email is required';
        else if (!emailRegex.test(value.trim())) newErrors.email = 'Invalid email address';
        else delete newErrors.email;
        break;

      case 'password':
        if (!value) newErrors.password = 'Password is required';
        else if (!passwordRegex.test(value))
          newErrors.password =
            'Password must be at least 8 characters and include uppercase, lowercase, and a number';
        else delete newErrors.password;

        // Revalidate confirm password
        if (confirm && value !== confirm) {
          newErrors.confirm = 'Passwords do not match';
        } else if (confirm) {
          delete newErrors.confirm;
        }
        break;

      case 'confirm':
        if (!value) newErrors.confirm = 'Please re-enter password';
        else if (password && value !== password) newErrors.confirm = 'Passwords do not match';
        else delete newErrors.confirm;
        break;
    }

    setErrors(newErrors);
  };

  const hasErrors = Object.keys(errors).length > 0;
  const isEmailValid = emailRegex.test(email.trim());
  const isPasswordValid = passwordRegex.test(password);

  const isFormValid =
    !!email && !!password && !!confirm && isEmailValid && isPasswordValid && !hasErrors && agreeToC;

  const handleRegister = async () => {
    setLoading(true);
    const auth = AuthService.getInstance();

    try {
      const lockbox = lockboxProof ?? route?.params?.lockboxProof;
      const ok = await auth.signup(email, password, lockbox);

      if (ok) {
        AccountDataService.getInstance().email = email;
        setRootScreen(['MainTab']);

        const pendingLink = deepLinkHandler.getPendingLink();
        if (pendingLink) deepLinkHandler.resumePendingLink();
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
          }}
          placeholder="Password"
          secureTextEntry
          customView={<PasswordRules password={password} />}
          error={!!errors.password}
          errorMessage={errors.password}
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
      </View>

      <PrimaryButton
        className="m-6"
        title="Create Account"
        disabled={loading || !isFormValid}
        loading={loading}
        loadingText="Creating account..."
        onPress={handleRegister}
      />
    </View>
  );
}
