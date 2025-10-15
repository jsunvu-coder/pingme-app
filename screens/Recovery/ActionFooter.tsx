import { View, Text, TouchableOpacity } from 'react-native';
import PrimaryButton from 'components/PrimaryButton';
import CheckLineIcon from 'assets/CheckLineIcon';

type ActionFooterProps = {
  onDownload: () => void;
  onContinue: () => void;
};

export function ActionFooter({ onDownload, onContinue }: ActionFooterProps) {
  return (
    <View className="items-center">
      <PrimaryButton className="mb-6 w-[240px]" title="Download QR Code" onPress={onDownload} />

      <TouchableOpacity activeOpacity={0.8} onPress={onContinue} className="flex-row items-center">
        <CheckLineIcon color="#ffffff" />
        <Text className="ml-2 text-[16px] text-[#FD4912]">I have securely saved my QR code</Text>
      </TouchableOpacity>
    </View>
  );
}
