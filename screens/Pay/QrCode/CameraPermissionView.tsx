import { View, Text } from 'react-native';
import CameraIcon from 'assets/CameraIcon';
import SecondaryButton from 'components/ScondaryButton';
import PrimaryButton from 'components/PrimaryButton';

export default function CameraPermissionView({
  allowAction,
  notAllowAction,
}: {
  allowAction: () => void;
  notAllowAction: () => void;
}) {
  return (
    <View className="flex-1 items-center justify-center px-6 py-8">
      <View className="flex-1" />

      <CameraIcon />

      <View className="items-center">
        <Text className="mt-6 text-2xl font-bold text-gray-800">Allow Camera Access</Text>
        <Text className="text-md mt-6 px-4 text-center leading-6 text-gray-500">
          To scan QR codes and securely complete payments, PingMe requires access to your device’s
          camera.
        </Text>

        <View className="mt-8 flex-row gap-x-4">
          <View className="flex-1">
            <SecondaryButton title="Don't Allow" onPress={notAllowAction} />
          </View>
          <View className="flex-1">
            <PrimaryButton title="Allow" onPress={allowAction} />
          </View>
        </View>
      </View>

      <View className="flex-[1.5]" />
    </View>
  );
}
