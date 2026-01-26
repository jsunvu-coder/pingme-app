import { useState, forwardRef, useImperativeHandle, useCallback, useEffect } from 'react';
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
import { setRootScreen } from 'navigation/Navigation';
import { AccountDataService } from 'business/services/AccountDataService';
import { deepLinkHandler } from 'business/services/DeepLinkHandler';
import { shareFlowService } from 'business/services/ShareFlowService';
import { validatePasswordFields as sharedValidatePasswords } from './passwordValidation';
import { hasTranslation, t } from 'i18n';
import { showFlashMessage } from 'utils/flashMessage';
import { isPasswordValid as isPasswordValidByPolicy } from 'utils/passwordPolicy';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface CreateAccountViewRef {
  register: () => Promise<void>;
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
}

const CreateAccountView = forwardRef<CreateAccountViewRef, CreateAccountViewProps>(({
  lockboxProof,
  prefillUsername,
  amountUsdStr,
  tokenName,
  disableSuccessScreen,
  disableSuccessCallback,
  removeButtonCreateAccount,
  setIsFormValid = (valid: boolean) => valid,
}, ref) => {
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
  const passwordOk = isPasswordValidByPolicy(password);

  const isFormValid =
    !!email && !!password && !!confirm && isEmailValid && passwordOk && !hasErrors && agreeToC;

  useEffect(() => {
    setIsFormValid(isFormValid);
  }, [isFormValid, setIsFormValid]);

  const handleRegister = useCallback(async () => {
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
        // Only set pending claim if we want to show success screen
        if (!disableSuccessCallback) {
          if (lockbox && !disableSuccessScreen) {
            shareFlowService.setPendingClaim({
              amountUsdStr: claimedAmountUsd,
              from: 'signup',
              tokenName,
            });
          }
          setRootScreen(['MainTab']);

          const pendingLink = deepLinkHandler.getPendingLink();
          if (pendingLink) deepLinkHandler.resumePendingLink();
        }
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

      if(disableSuccessCallback) {
        throw err;
      }
    } finally {
      setLoading(false);
    }
  }, [email, password, lockboxProof, route, disableSuccessCallback, disableSuccessScreen, claimedAmountUsd, tokenName]);

  useImperativeHandle(ref, () => ({
    register: handleRegister,
  }), [handleRegister]);

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

      {!removeButtonCreateAccount && <View className="mt-6 px-6 pb-12">
        <PrimaryButton
          title="Create Account"
          disabled={loading || !isFormValid}
          loading={loading}
          loadingText="Creating account..."
          onPress={handleRegister}
        />
      </View>}
    </View>
  );
});

CreateAccountView.displayName = 'CreateAccountView';

export default CreateAccountView;
