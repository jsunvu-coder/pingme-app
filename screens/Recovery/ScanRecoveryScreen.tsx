import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRScanner from 'screens/Pay/QrCode/QrScanner';
import { push } from 'navigation/Navigation';
import { Ionicons } from '@expo/vector-icons';

import NavigationBar from 'components/NavigationBar';
import UploadPhotoButton from 'screens/Pay/QrCode/UploadPhotoButton';

export default function ScanRecoveryScreen() {
  const handleScanSuccess = (data: string) => {
    push('RecoveryPasswordScreen', { recoveryCode: data });
  };

  return (
    <View className="flex-1 bg-white pt-6">
      <SafeAreaView edges={['top']} />

      <NavigationBar title="Scan recovery QR code" />

      <View className="flex-1">
        <View className="m-6 flex-row items-center rounded-2xl bg-[#00B050] px-4 py-3">
          <Ionicons name="information-circle" size={18} color="white" />
          <Text className="text-md ml-2 flex-1 text-white">
            Scan your recovery password QR code to reveal your current password.
          </Text>
        </View>

        <View className="flex-1 overflow-hidden">
          <QRScanner onScanSuccess={handleScanSuccess} />
        </View>

        <View className="mt-6 mb-24 items-center">
          <UploadPhotoButton />
        </View>
      </View>
    </View>
  );
}
