import { useState } from 'react';
import { View, Text, Linking, TouchableWithoutFeedback } from 'react-native';
import { useRoute } from '@react-navigation/native';
import PasswordRules from 'components/PasswordRules';
import AuthInput from 'components/AuthInput';
import EmailIcon from 'assets/EmailIcon';
import PasswordIcon from 'assets/PasswordIcon';
import CheckSquareIcon from 'assets/CheckSquareIcon';
import { TOC_URL } from 'business/Config';
import PrimaryButton from 'components/PrimaryButton';
import { AuthService } from 'business/services/AuthService';
import { presentOverMain, setRootScreen } from 'navigation/Navigation';
import { AccountDataService } from 'business/services/AccountDataService';
import { deepLinkHandler } from 'business/services/DeepLinkHandler';
import { shareFlowService } from 'business/services/ShareFlowService';
import { passwordRegex, validatePasswordFields as sharedValidatePasswords } from './passwordValidation';
import { showFlashMessage } from 'utils/flashMessage';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function CreateAccountView({ lockboxProof, prefillUsername, amountUsdStr }: any) {
  const route = useRoute<any>();
  const initialEmail =
    prefillUsername ?? route?.params?.prefillUsername ?? route?.params?.username ?? '';
  const claimedAmountUsd = amountUsdStr ?? route?.params?.amountUsdStr;

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agreeToC, setAgreeToC] = useState(false);
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
      case 'confirm': {
        const pwd = field === 'password' ? value : password;
        const conf = field === 'confirm' ? value : confirm;
        const validation = sharedValidatePasswords(pwd, conf);
        if (validation.password) newErrors.password = validation.password;
        else delete newErrors.password;
        if (validation.confirm) newErrors.confirm = validation.confirm;
        else delete newErrors.confirm;
        break;
      }
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
      const ok = await Promise.race([
        auth.signup(email, password, lockbox),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Request timed out. Please try again.')), 20000)
        ),
      ]);

      if (ok) {
        AccountDataService.getInstance().email = email;
        if (lockbox) {
          shareFlowService.setPendingClaim({
            amountUsdStr: claimedAmountUsd,
            from: 'signup',
          });
        }
        setRootScreen(['MainTab']);

        const pendingLink = deepLinkHandler.getPendingLink();
        if (pendingLink) deepLinkHandler.resumePendingLink();
      }
    } catch (err: any) {
      console.error('Signup error:', err);
      const message =
        err?.message === 'CREDENTIAL_EXISTS'
          ? 'Signup failed: Credentials already exist'
          : err?.message || 'Unable to create account';
      showFlashMessage({
        title: 'Signup failed',
        message,
        type: 'danger',
      });
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
            validateField('confirm', text);
          }}
          placeholder="Re-enter password"
          secureTextEntry
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
      </View>

      <View className="mt-6 px-6 pb-12">
        <PrimaryButton
          title="Create Account"
          disabled={loading || !isFormValid}
          loading={loading}
          loadingText="Creating account..."
          onPress={handleRegister}
        />
      </View>
    </View>
  );
}
