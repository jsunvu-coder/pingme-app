import { APP_URL } from 'business/Config';
import { Dimensions, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

type Props = {
  value: string;
};

export default function MyQRCodeView({ value }: Props) {
  const { width } = Dimensions.get('window');
  // ✅ Encode to make it scanner-safe for expo-camera
  const qrRawString = encodeURIComponent(`${APP_URL}/send/email=${value}`);

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <View className="flex-[0.5]" />
      <QRCode
        value={qrRawString}
        backgroundColor="white"
        size={width - 120}
        color="black"
        ecl="M" // medium error correction for balance
      />
      <View className="flex-1" />
    </View>
  );
}
