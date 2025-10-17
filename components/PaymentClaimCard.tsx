import { View, Text, TouchableOpacity } from 'react-native';
import CopyIcon from 'assets/CopyIcon';
import { showLocalizedAlert } from './LocalizedAlert';
import * as Clipboard from 'expo-clipboard';

export default function PaymentClaimCard({
  content,
  passphrase,
}: {
  content: string;
  passphrase: string;
}) {
  const handleCopy = async () => {
    await Clipboard.setStringAsync(passphrase);
    await showLocalizedAlert({
      title: 'Success',
      message: 'Copied',
    });
  };

  return (
    <View className="rounded-2xl bg-white px-6 py-8">
      <Text className="text-lg text-gray-700">{content}</Text>

      <View className="mt-6 flex-row items-center justify-between border-t border-[#F5E1DC] pt-6">
        <Text className="text-xl text-gray-500">Passphrase</Text>

        <Text className="mr-2 text-xl">{passphrase}</Text>
        <TouchableOpacity
          className="flex-row items-center active:opacity-80"
          onPress={() => handleCopy}>
          <CopyIcon />
        </TouchableOpacity>
      </View>
    </View>
  );
}
