import { View, Text, TouchableOpacity, Platform, ToastAndroid, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CopyIcon from 'assets/CopyIcon';
import * as Clipboard from 'expo-clipboard';
import { showFlashMessage } from 'utils/flashMessage';

type CardProps = {
  payLink: string;
  amount: number;
  openLinkVisible: boolean;
  linkType: 'payment' | 'request';
};

export default function PaymentLinkCard({
  payLink,
  amount,
  openLinkVisible = false,
  linkType,
}: CardProps) {
  const handleCopy = async () => {
    await Clipboard.setStringAsync(payLink);
    if (Platform.OS === 'ios') {
      showFlashMessage({ message: 'Copied' });
    }
  };

  const handleOpenLink = async () => {
    try {
      const supported = await Linking.canOpenURL(payLink);
      if (supported) {
        await Linking.openURL(payLink);
      } else {
        Alert.alert('Error', 'Cannot open this link.');
      }
    } catch (err) {
      console.error('Open link failed:', err);
      Alert.alert('Error', 'Unable to open the payment link.');
    }
  };

  return (
    <View className="rounded-2xl bg-white p-6">
      <View className="flex-row pr-10">
        <View className="flex-1">
          <Text className="mb-3 text-2xl font-semibold text-gray-800">
            {linkType === 'payment'
              ? 'Your payment link is ready to share'
              : 'Your request link is ready to share'}
          </Text>
          <View className="flex-row items-center">
            <Text className="text-2xl" numberOfLines={1} ellipsizeMode="middle">
              {payLink}
            </Text>

            <TouchableOpacity className="ml-4 active:opacity-80" onPress={handleCopy}>
              <CopyIcon />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Divider + Amount */}
      <View className="mt-6 flex-row items-center justify-between border-t border-[#FFDBD0] pt-6">
        <Text className="text-lg text-gray-500">Amount</Text>
        <Text className="mr-1 text-2xl font-semibold">${amount.toFixed(2)}</Text>
        {openLinkVisible && (
          <TouchableOpacity onPress={handleOpenLink}>
            <Ionicons name="open-outline" size={24} color="#FD4912" />
          </TouchableOpacity>
        )}
        {!openLinkVisible && <View />}
      </View>
    </View>
  );
}
