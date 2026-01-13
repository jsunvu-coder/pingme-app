import { useState } from 'react';
import { View } from 'react-native';
import { useRoute } from '@react-navigation/native';

import QrTabSwitch from './QrTabSwitch';
import NavigationBar from 'components/NavigationBar';
import ScanQRView from './ScanQRView';
import MyQRCodeView from './MyQrCodeScreen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type QRMode = 'scan' | 'myqr';

export default function QRCodeScreen() {
  const route = useRoute();
  const { mode = 'scan' } = (route.params as { mode?: QRMode }) || {};
  const [activeTab, setActiveTab] = useState<QRMode>(mode);

  const { bottom } = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: 'white', paddingBottom: bottom }}>
      <NavigationBar title="QR Code" />

      <View className="px-6">
        <QrTabSwitch activeTab={activeTab} setActiveTab={setActiveTab} />
      </View>

      {activeTab === 'scan' && <ScanQRView />}

      {activeTab === 'myqr' && <MyQRCodeView />}
    </View>
  );
}
