import { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AuthInput from 'components/AuthInput';
import PasswordIcon from 'assets/PasswordIcon';
import PasswordRules from 'components/PasswordRules';
import PrimaryButton from 'components/PrimaryButton';
import { goBack } from 'navigation/Navigation';
import { AuthService } from 'business/services/AuthService';
import { showFlashMessage } from 'utils/flashMessage';
import NavigationBar from 'components/NavigationBar';
import { t } from 'i18n';

const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

const validatePasswordFields = (password: string, confirm: string) => {
  const validation: { password?: string; confirm?: string } = {};

  if (!password) {
    validation.password = t('AUTH_PASSWORD_REQUIRED');
  } else if (!passwordRegex.test(password)) {
    validation.password = t('AUTH_PASSWORD_RULE');
  }

  if (!confirm) {
    validation.confirm = t('AUTH_PASSWORD_CONFIRM_REQUIRED');
  } else if (password && confirm !== password) {
    validation.confirm = t('AUTH_PASSWORD_MISMATCH');
  }

  return validation;
};

export default function ChangePasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setErrors(validatePasswordFields(value, confirm));
  };

  const handleConfirmChange = (value: string) => {
    setConfirm(value);
    setErrors(validatePasswordFields(password, value));
  };

  const isPasswordValid = passwordRegex.test(password);
  const doPasswordsMatch = confirm.length > 0 && confirm === password;
  const isFormValid = !!password && !!confirm && isPasswordValid && doPasswordsMatch;

  const handleUpdatePassword = async () => {
    const validation = validatePasswordFields(password, confirm);
    setErrors(validation);

    const hasValidationErrors = Object.keys(validation).length > 0;
    if (hasValidationErrors) return;

    setLoading(true);

    try {
      await AuthService.getInstance().changePassword(password);
      showFlashMessage({
        type: 'success',
        icon: 'success',
        title: t('AUTH_PASSWORD_UPDATED_TITLE'),
        message: t('AUTH_PASSWORD_UPDATED_MESSAGE'),
        onHide: () => goBack(),
      });
    } catch (err: any) {
      console.error('Change password error:', err);
      showFlashMessage({
        type: 'danger',
        icon: 'danger',
        title: t('AUTH_PASSWORD_UPDATE_FAILED_TITLE'),
        message: err?.message || t('AUTH_PASSWORD_UPDATE_FAILED_MESSAGE'),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <SafeAreaView edges={['top']} />

      <NavigationBar title={t('CHANGE_PASSWORD')} />

      <View className="flex-1 px-6">
        <View className="mt-10 gap-y-8">
          <AuthInput
            icon={<PasswordIcon />}
            value={password}
            onChangeText={handlePasswordChange}
            placeholder={t('AUTH_PASSWORD_PLACEHOLDER')}
            secureTextEntry
            customView={<PasswordRules password={password} />}
            error={!!errors.password}
            errorMessage={errors.password}
          />

          <AuthInput
            icon={<PasswordIcon />}
            value={confirm}
            onChangeText={handleConfirmChange}
            placeholder={t('AUTH_PASSWORD_CONFIRM_PLACEHOLDER')}
            secureTextEntry
            error={!!errors.confirm}
            errorMessage={errors.confirm}
          />
        </View>
      </View>

      <View className="px-6 pb-6">
        <PrimaryButton
          title={t('AUTH_UPDATE_PASSWORD_BUTTON')}
          onPress={handleUpdatePassword}
          disabled={loading || !isFormValid}
          loading={loading}
          loadingText={t('AUTH_UPDATE_PASSWORD_LOADING')}
        />
        <SafeAreaView edges={['bottom']} />
      </View>
    </View>
  );
}
