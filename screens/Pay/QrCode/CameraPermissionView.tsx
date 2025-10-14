import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CameraIcon from 'assets/CameraIcon';
import SecondaryButton from 'components/ScondaryButton';
import PrimaryButton from 'components/PrimaryButton';

export default function CameraPermissionView() {
  return (
    <View className="items-center">
      <CameraIcon />

      <Text className="mt-6 text-3xl font-bold text-gray-800">Allow Camera Access</Text>

      <Text className="mt-6 px-4 text-center leading-6 text-gray-500 text-md">
        To scan QR codes and securely complete payments, PingMe requires access to your device’s
        camera.
      </Text>

      <View className="mt-8 flex-row justify-center gap-x-4">
        <SecondaryButton title="Don't Allow" className="flex-1" />
        <PrimaryButton title="Allow" className="flex-1" />
      </View>
    </View>
  );
}
