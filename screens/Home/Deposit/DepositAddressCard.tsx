import { View, Text, TouchableOpacity, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import WalletAddIcon from 'assets/WalletAddIcon';
import CopyIcon from 'assets/CopyIcon';
import WarningBox from './WarningBox';

interface Props {
  address: string;
}

export default function DepositAddressCard({ address }: Props) {
  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(address);
      Alert.alert('Copied', 'Deposit address copied to clipboard.');
    } catch (err) {
      console.error('Clipboard copy failed:', err);
      Alert.alert('Copy failed', 'Unable to copy the deposit address.');
    }
  };

  return (
    <View className="mt-8 rounded-2xl bg-white p-6">
      <View className="flex-row items-center">
        <View className="flex-1">
          <WalletAddIcon size={32} color="#000" />

          <Text className="mt-6 text-2xl text-gray-900" numberOfLines={1} ellipsizeMode="middle">
            {address}
          </Text>
        </View>

        <TouchableOpacity onPress={handleCopy} activeOpacity={0.7}>
          <CopyIcon />
        </TouchableOpacity>
      </View>

      {/* Separator */}
      <View className="my-6 h-1 bg-gray-200" />

      <WarningBox />
    </View>
  );
}
