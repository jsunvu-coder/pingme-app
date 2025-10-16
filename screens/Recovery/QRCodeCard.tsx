import { View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

type QRCodeCardProps = {
  value: string;
  getRef?: (ref: any | null) => void;
};

export function QRCodeCard({ value, getRef }: QRCodeCardProps) {
  return (
    <View className="mt-4 items-center justify-center">
      <View className="rounded-2xl bg-white p-3">
        <QRCode value={value} size={240} color="#000" backgroundColor="#fff" getRef={getRef} />
      </View>
    </View>
  );
}
