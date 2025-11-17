import { useState } from 'react';
import { View } from 'react-native';
import { useRoute } from '@react-navigation/native';

import QrTabSwitch from './QrTabSwitch';
import NavigationBar from 'components/NavigationBar';
import ScanQRView from './ScanQRView';
import MyQRCodeView from './MyQrCodeScreen';

type QRMode = 'scan' | 'myqr';

export default function QRCodeScreen() {
  const route = useRoute();
  const { mode = 'scan' } = (route.params as { mode?: QRMode }) || {};
  const [activeTab, setActiveTab] = useState<QRMode>(mode);

  return (
    <View className="flex-1 bg-white">
      <NavigationBar title="QR Code" />

      <View className="px-6">
        <QrTabSwitch activeTab={activeTab} setActiveTab={setActiveTab} />
      </View>

      {activeTab === 'scan' && <ScanQRView />}

      {activeTab === 'myqr' && <MyQRCodeView />}
    </View>
  );
}
