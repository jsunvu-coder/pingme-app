import { useState } from 'react';
import { View, Text, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AuthInput from 'components/AuthInput';
import PasswordIcon from 'assets/PasswordIcon';
import PasswordRules from 'components/PasswordRules';
import PrimaryButton from 'components/PrimaryButton';
import BackIcon from 'assets/BackIcon';
import { goBack } from 'navigation/Navigation';
import { AuthService } from 'business/services/AuthService';
import NavigationBar from 'components/NavigationBar';

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export default function ChangePasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});

  const validateField = (value: string) => {
    const newErrors = { ...errors };
    if (!value) {
      newErrors.password = 'Password is required';
    } else if (!passwordRegex.test(value)) {
      newErrors.password =
        'Password must be at least 8 characters and include uppercase, lowercase, and a number';
    } else {
      delete newErrors.password;
    }

    if (confirm) {
      if (value !== confirm) newErrors.confirm = 'Passwords do not match';
      else delete newErrors.confirm;
    }

    setErrors(newErrors);
  };

  const hasErrors = Object.keys(errors).length > 0;
  const isPasswordValid = passwordRegex.test(password);

  const isFormValid = !!password && !!confirm && isPasswordValid && !hasErrors;

  const handleUpdatePassword = async () => {
    validateField(password);

    if (!isFormValid) return;

    setLoading(true);

    try {
      await AuthService.getInstance().changePassword(password);
      Alert.alert('Success', 'Your password has been updated.', [
        {
          text: 'OK',
          onPress: () => goBack(),
        },
      ]);
    } catch (err: any) {
      console.error('Change password error:', err);
      Alert.alert('Update failed', err?.message || 'Unable to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <SafeAreaView edges={['top']} />

      <View className="flex-1">
        <NavigationBar title="Change Password" />

        <View className="mx-6 mt-10">
          <AuthInput
            icon={<PasswordIcon />}
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              validateField(text);
            }}
            placeholder="Password"
            secureTextEntry
            customView={<PasswordRules password={password} />}
            error={!!errors.password}
            errorMessage={errors.password}
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
