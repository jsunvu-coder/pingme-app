import { View, Text } from 'react-native';
import CheckAllIcon from 'assets/CheckAllIcon';

export function SuccessView() {
  return (
    <View className="flex-1 items-center justify-center">
      <CheckAllIcon color="#14B957" className="mb-4" />
      <Text className="mb-4 text-center text-2xl font-bold text-[#444444]">
        Your recovery QR code has been successfully secured.
      </Text>

      <View className="w-full text-base">
        <View className="mb-4 flex-row">
          <Text className="text-[#444444]">• </Text>
          <Text className="flex-1 text-[#444444]">
            For your protection, the QR code is no longer accessible.
          </Text>
        </View>
        <View className="mb-4 flex-row">
          <Text className="text-[#444444]">• </Text>
          <Text className="flex-1 text-[#444444]">
            If you forget your password in the future, use your saved QR code in the Forgot Password
            process to regain access.
          </Text>
        </View>
        <View className="mb-4 flex-row">
          <Text className="text-[#444444]">• </Text>
          <Text className="flex-1 text-[#444444]">
            Important: Keep your saved QR code confidential. Anyone with access can unlock your
            account.
          </Text>
        </View>
      </View>
    </View>
  );
}
