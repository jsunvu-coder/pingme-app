import { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AuthInput from 'components/AuthInput';
import PasswordIcon from 'assets/PasswordIcon';
import PasswordRules from 'components/PasswordRules';
import PrimaryButton from 'components/PrimaryButton';
import BackIcon from 'assets/BackIcon';
import { goBack } from 'navigation/Navigation';
import { AuthService } from 'business/services/AuthService';
import { showFlashMessage } from 'utils/flashMessage';
import NavigationBar from 'components/NavigationBar';

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

const validatePasswordFields = (password: string, confirm: string) => {
  const validation: { password?: string; confirm?: string } = {};

  if (!password) {
    validation.password = 'Password is required';
  } else if (!passwordRegex.test(password)) {
    validation.password =
      'Password must be at least 8 characters and include uppercase, lowercase, and a number';
  }

  if (!confirm) {
    validation.confirm = 'Please re-enter password';
  } else if (password && confirm !== password) {
    validation.confirm = 'Passwords do not match';
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
  const isFormValid =
    !!password &&
    !!confirm &&
    isPasswordValid &&
    doPasswordsMatch &&
    Object.keys(errors).length === 0;

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
        title: 'Password updated',
        message: 'Your password has been updated.',
        onHide: () => goBack(),
      });
    } catch (err: any) {
      console.error('Change password error:', err);
      showFlashMessage({
        type: 'danger',
        icon: 'danger',
        title: 'Update failed',
        message: err?.message || 'Unable to update password',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <SafeAreaView edges={['top']} />

      <NavigationBar title="Change password" />

      <View className="flex-1 px-6">
        <View className="mt-10 gap-y-8">
          <AuthInput
            icon={<PasswordIcon />}
            value={password}
            onChangeText={handlePasswordChange}
            placeholder="Password"
            secureTextEntry
            customView={<PasswordRules password={password} />}
            error={!!errors.password}
            errorMessage={errors.password}
          />

          <AuthInput
            icon={<PasswordIcon />}
            value={confirm}
            onChangeText={handleConfirmChange}
            placeholder="Re-enter password"
            secureTextEntry
            error={!!errors.confirm}
            errorMessage={errors.confirm}
          />
        </View>
      </View>

      <View className="px-6 pb-6">
        <PrimaryButton
          title="Update Password"
          onPress={handleUpdatePassword}
          disabled={loading || !isFormValid}
          loading={loading}
          loadingText="Updating..."
        />
        <SafeAreaView edges={['bottom']} />
      </View>
    </View>
  );
}
