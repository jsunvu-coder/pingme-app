import React, { useEffect, useState } from 'react';
import { Camera } from 'expo-camera';
import { View } from 'react-native';
import CameraPermissionView from './CameraPermissionView';
import { NoPermissionView } from './NoPermissionView';
import QRScanner from './QrScanner';
import { handleUrl } from './URLHandler';
import UploadPhotoButton from './UploadPhotoButton';

export default function ScanQRView() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [deniedPermanently, setDeniedPermanently] = useState(false);

  useEffect(() => {
    checkPermissionStatus();
  }, []);

  const handleQRCode = (data: string) => {
    handleUrl(data);
  };

  const checkPermissionStatus = async () => {
    const { status, canAskAgain } = await Camera.getCameraPermissionsAsync();
    if (status === 'granted') {
      setHasPermission(true);
    } else {
      setHasPermission(false);
      setDeniedPermanently(!canAskAgain);
    }
  };

  const requestPermission = async () => {
    const { status, canAskAgain } = await Camera.requestCameraPermissionsAsync();
    if (status === 'granted') {
      setHasPermission(true);
    } else {
      setHasPermission(false);
      setDeniedPermanently(!canAskAgain);
    }
  };

  const handleAllow = async () => {
    await requestPermission();
  };

  const handleNotAllow = () => {
    setHasPermission(false);
  };

  // === Case 1: Still loading
  if (hasPermission === null) {
    return <CameraPermissionView allowAction={handleAllow} notAllowAction={handleNotAllow} />;
  }

  // === Case 2: Permission not granted
  if (!hasPermission) {
    if (deniedPermanently) {
      return <NoPermissionView />;
    }

    return <CameraPermissionView allowAction={handleAllow} notAllowAction={handleNotAllow} />;
  }

  // === Case 3: Permission granted
  return (
    <View className="flex-1 bg-white">
      <View className="flex-[0.9]">
        <QRScanner onScanSuccess={handleQRCode} />
      </View>

      <View className="flex-[0.1] items-center justify-center pb-10">
        <UploadPhotoButton onScanSuccess={handleQRCode} />
      </View>
    </View>
  );
}
