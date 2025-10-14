import { URL } from "business/Config";
import { Dimensions, View } from "react-native";
import QRCode from "react-native-qrcode-svg";

type Props = {
  value: string;
};

export default function MyQRCodeView({ value }: Props) {
  const { width } = Dimensions.get('window');
  const qrRawString = `${URL}/send/email=${value}`
  return (
    <View className="flex-1 justify-center items-center bg-white">
      <View className="flex-[0.5]" />
      <QRCode
        value={qrRawString}
        backgroundColor="white"
        size={width - 120}
        color="black"
      />
      <View className="flex-1" />
    </View>
  );
}
