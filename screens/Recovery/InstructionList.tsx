import CircleInfoIcon from 'assets/CircleInfoIcon';
import { View, Text } from 'react-native';

export function InstructionList() {
  return (
    <View className="mt-4 flex-row gap-[8px]">
      <CircleInfoIcon color="#FB1028" className="shrink-0" />
      <View className="flex-1">
        <Text className="mb-2 text-[12px] font-medium text-[#FB1028]">
          This QR code is your one-time recovery credential.
        </Text>
        <View className="ml-2 text-[12px]">
          <View className="mb-1 flex-row">
            <Text className="text-white">• </Text>
            <Text className="flex-1 text-white">
              It serves as the master key to your PingMe account.
            </Text>
          </View>
          <View className="mb-1 flex-row">
            <Text className="text-white">• </Text>
            <Text className="flex-1 text-white">
              Please store it securely (download, print, or save in an encrypted password manager).
            </Text>
          </View>
          <View className="mb-1 flex-row">
            <Text className="text-white">• </Text>
            <Text className="flex-1 text-white">
              If you forget your password, scanning this QR code in the Forgot Password process will
              reveal your current password.
            </Text>
          </View>
          <View className="flex-row">
            <Text className="text-white">• </Text>
            <Text className="flex-1 text-white">
              For your protection, once you confirm that the QR code has been saved, it will be
              permanently hidden.
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
