import { useState } from 'react';
import { View, Text } from 'react-native';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PrimaryButton from 'components/PrimaryButton';
import { goBack } from 'navigation/Navigation';
import { TouchableOpacity } from 'react-native';
import CopyIcon from 'assets/CopyIcon';
import { showLocalizedAlert } from 'components/LocalizedAlert';
import * as Clipboard from 'expo-clipboard';
import LockIcon from 'assets/LockIcon';
import AuthInput from 'components/AuthInput';
import PasswordIcon from 'assets/PasswordIcon';

type RecoveryParams = {
  password: string;
};

type RootStackParamList = {
  RecoveryPasswordScreen: RecoveryParams;
};

export default function RecoveryPasswordScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'RecoveryPasswordScreen'>>();
  const { password } = route.params;
  const [loading] = useState(false);

  const handleCopyPassword = async () => {
    await Clipboard.setStringAsync(password);
    await showLocalizedAlert({
      title: 'Success',
      message: 'Password copied to clipboard',
    });
  };

  const handleBackToLogin = () => {
    goBack();
    goBack(); // Go back twice to reach the login screen
  };

  return (
    <View className="flex-1 bg-white">
      <View className="mt-12 items-center">
        <LockIcon />
      </View>

      <View className="px-6 pt-8">
        <Text className="mb-8 text-center text-3xl font-bold text-gray-900">
          Your current password
        </Text>

        <Text className="mb-4 text-center text-xl text-gray-600">
          This is your active password, revealed after scanning the recovery QR code.
        </Text>

        <View className="mt-8 rounded-xl">
          <AuthInput
            icon={<PasswordIcon />}
            value={password}
            placeholder="Password"
            editable={false}
            secureTextEntry
          />
        </View>

        <TouchableOpacity
          className="absolute right-6 bottom-8 h-10 w-10 items-center justify-center"
          onPress={handleCopyPassword}>
          <CopyIcon />
        </TouchableOpacity>
      </View>

      <View className="absolute right-0 bottom-0 left-0 p-6">
        <PrimaryButton title="Back to Log In" onPress={handleBackToLogin} loading={loading} />
        <SafeAreaView edges={['bottom']} />
      </View>
    </View>
  );
}
