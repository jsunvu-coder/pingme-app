import { View, Text } from 'react-native';
import WarningIcon from 'assets/WarningIcon';

export function SecurityNotice() {
  return (
    <View className="flex-row rounded-xl bg-[#E82F2F] p-4">
      <View className="mr-2 h-5 w-5 items-center justify-center">
        <WarningIcon width={20} height={20} color="#ffffff" />
      </View>
      <View className="flex-1">
        <Text className="mb-1 text-[12px] font-medium text-white">SECURITY NOTICE</Text>
        <Text className="text-[12px] font-medium leading-5 text-white">
          Anyone with access to this QR code can gain full access to your account. Ensure it is kept
          strictly confidential.
        </Text>
      </View>
    </View>
  );
}
