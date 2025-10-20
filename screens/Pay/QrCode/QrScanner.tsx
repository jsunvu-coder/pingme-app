import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import { Camera, CameraView } from 'expo-camera';

type QRScannerProps = {
  onScanSuccess: (data: string) => void;
};

export default function QRScanner({ onScanSuccess }: QRScannerProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scannedData, setScannedData] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (!scannedData) {
      setScannedData(data);
      onScanSuccess(data);
      setTimeout(() => setScannedData(null), 3000);
    }
  };

  if (hasPermission === null) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <Text className="text-white">Requesting camera permission...</Text>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <Text className="text-white">Camera permission denied.</Text>
      </View>
    );
  }

  return (
    <View className="m-6 flex-1 overflow-hidden rounded-3xl bg-black">
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        onBarcodeScanned={handleBarcodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      />
    </View>
  );
}
