import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Clipboard from 'expo-clipboard';
import { showFlashMessage } from 'utils/flashMessage';
import { t } from 'i18n';
import { ENV } from 'business/Config';

export default function PaymentRecipientCard({
  recipient,
  amount,
  txHash,
}: {
  recipient: string;
  amount: number;
  txHash?: string;
}) {
  const handleViewDetails = async () => {
    if (!txHash) return;
    const normalizedHash = txHash.trim().replace(/[^\da-fA-Fx]/g, '');
    const baseUrl =
      ENV === 'staging' ? 'https://testnet.monadvision.com' : 'https://monadvision.com';
    const url = `${baseUrl}/tx/${normalizedHash}`;

    try {
      await WebBrowser.openBrowserAsync(url);
    } catch (err) {
      console.error('Open tx details failed:', err);
      await Clipboard.setStringAsync(normalizedHash);
      showFlashMessage({
        title: t('ERROR', undefined, 'Error'),
        message: t('TX_HASH_COPIED', undefined, 'Unable to open link. Transaction hash copied.'),
        type: 'danger',
      });
    }
  };

  return (
    <View className="rounded-2xl bg-white px-6 py-8">
      <Text className="text-xl text-gray-800">
        You've sent payment to <Text className="font-semibold">{recipient}</Text>
      </Text>

      <TouchableOpacity className="mt-2" style={{ opacity: 0 }}>
        <Text className="text-lg text-[#FD4912]">Add recipient to Contact List</Text>
      </TouchableOpacity>

      <View className="mt-6 flex-row items-center justify-between border-t border-[#FFDBD0] pt-6">
        <Text className="text-lg text-gray-500">Amount</Text>
        <Text className="mr-1 text-2xl font-semibold">${amount.toFixed(2)}</Text>
        <TouchableOpacity disabled={!txHash} onPress={handleViewDetails} activeOpacity={0.8}>
          <Ionicons
            name="open-outline"
            size={24}
            color={txHash ? '#FD4912' : '#BEBEBE'}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}
