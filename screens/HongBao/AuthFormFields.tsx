import { View, Text, TouchableOpacity } from 'react-native';
import AuthInput from 'components/AuthInput';
import EmailIcon from 'assets/EmailIcon';
import PasswordIcon from 'assets/PasswordIcon';
import PasswordRules from 'components/PasswordRules';
import { Ionicons } from '@expo/vector-icons';
import { push } from 'navigation/Navigation';
import { t } from 'i18n';

type AuthFormFieldsProps = {
  mode: 'login' | 'signup';
  email: string;
  password: string;
  confirmPassword?: string;
  onEmailChange: (email: string) => void;
  onPasswordChange: (password: string) => void;
  onConfirmPasswordChange?: (password: string) => void;
  onSubmit?: () => void;
  disabled?: boolean;
  showForgotPassword?: boolean;
  // Validation props for signup
  errors?: {
    email?: string;
    password?: string;
    confirm?: string;
  };
};

export default function AuthFormFields({
  mode,
  email,
  password,
  confirmPassword = '',
  onEmailChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
  disabled = false,
  showForgotPassword = true,
  errors = {},
}: AuthFormFieldsProps) {
  return (
    <View className="gap-y-2">
      {/* Email Input */}
      <AuthInput
        icon={<EmailIcon />}
        value={email}
        onChangeText={onEmailChange}
        placeholder={mode === 'signup' ? 'Email address' : t('AUTH_EMAIL_PLACEHOLDER')}
        editable={!disabled}
        keyboardType="email-address"
        autoCapitalize="none"
        error={mode === 'signup' && !!errors.email}
        errorMessage={errors.email}
      />

      {/* Password Input */}
      <View>
        <AuthInput
          icon={<PasswordIcon />}
          value={password}
          onChangeText={onPasswordChange}
          placeholder={mode === 'signup' ? 'Password' : t('AUTH_PASSWORD_PLACEHOLDER')}
          editable={!disabled}
          secureTextEntry
          returnKeyType={mode === 'signup' ? 'next' : 'done'}
          onSubmitEditing={mode === 'login' && onSubmit ? onSubmit : undefined}
          customView={mode === 'signup' ? <PasswordRules password={password} /> : undefined}
          error={mode === 'signup' && !!errors.password}
          errorMessage={errors.password}
          autoCapitalize="none"
        />
        {/* Forgot Password - only for login */}
        {mode === 'login' && showForgotPassword && (
          <TouchableOpacity
            className="absolute right-0 top-3 flex-row items-center justify-center px-4"
            onPress={() => push('ScanRecoveryScreen')}
          >
            <Text className="text-md mr-2 font-semibold text-[#FD4912]">
              {t('FORGOT_PASSWORD')}
            </Text>
            <Ionicons name="scan-outline" size={22} color="#1D1D1D" />
          </TouchableOpacity>
        )}
      </View>

      {/* Confirm Password (only for signup) */}
      {mode === 'signup' && onConfirmPasswordChange && (
        <AuthInput
          icon={<PasswordIcon />}
          value={confirmPassword}
          onChangeText={onConfirmPasswordChange}
          placeholder="Re-enter password"
          editable={!disabled}
          secureTextEntry
          error={!!errors.confirm}
          errorMessage={errors.confirm}
          returnKeyType="done"
          blurOnSubmit
          onSubmitEditing={onSubmit}
        />
      )}
    </View>
  );
}
