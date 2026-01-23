import React, { useEffect, useState } from 'react';
import { Camera } from 'expo-camera';
import { ActivityIndicator, Text, View } from 'react-native';
import CameraIcon from 'assets/CameraIcon';
import PrimaryButton from 'components/PrimaryButton';
import { NoPermissionView } from './NoPermissionView';
import QRScanner from './QrScanner';
import { handleUrl } from './URLHandler';
import UploadPhotoButton from './UploadPhotoButton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ScanQRView() {
  const [hasPermission, setHasPermission] = useState(false);
  const [deniedPermanently, setDeniedPermanently] = useState(false);
  const [permissionLoading, setPermissionLoading] = useState(true);

  const handleQRCode = (data: string, releaseScanLock: () => void) => {
    handleUrl(data, releaseScanLock);
  };

  useEffect(() => {
    const initializePermission = async () => {
      setPermissionLoading(true);
      try {
        const { status, canAskAgain } = await Camera.requestCameraPermissionsAsync();
        setHasPermission(status === 'granted');
        if (status === 'granted') {
          setHasPermission(true);
          setDeniedPermanently(false);
        } else if (canAskAgain) {
          await requestPermission();
          return;
        } else {
          setHasPermission(false);
          setDeniedPermanently(true);
        }
      } finally {
        setPermissionLoading(false);
      }
    };

    initializePermission();
  }, []);

  const requestPermission = async () => {
    setPermissionLoading(true);
    try {
      const { status, canAskAgain } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
      setDeniedPermanently(!canAskAgain && status !== 'granted');
    } finally {
      setPermissionLoading(false);
    }
  };

  const { bottom } = useSafeAreaInsets();

  const renderPermissionPrompt = () => (
    <View className="flex-1 items-center justify-center px-6 py-8">
      <View className="flex-1" />
      <CameraIcon />
      <View className="items-center">
        <Text className="mt-6 text-2xl font-bold text-gray-800">Allow Camera Access</Text>
        <Text className="text-md mt-6 px-4 text-center leading-6 text-gray-500">
          To scan QR codes and securely complete payments, PingMe requires access to your device’s
          camera.
        </Text>
        <View className="mt-8 w-full">
          <PrimaryButton title="Allow Camera Access" onPress={requestPermission} />
        </View>
      </View>
      <View className="flex-[1.5]" />
    </View>
  );

  if (permissionLoading && !hasPermission) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#FD4912" />
        <Text className="mt-4 text-base text-gray-500">Requesting camera permission...</Text>
      </View>
    );
  }

  if (!hasPermission) {
    if (deniedPermanently) return <NoPermissionView />;
    return renderPermissionPrompt();
  }

  // === Case 3: Permission granted
  return (
    <View className="flex-1 bg-white">
      <View className="flex-1">
        <QRScanner onScanSuccess={handleQRCode} />
      </View>

      <UploadPhotoButton onScanSuccess={handleQRCode} />
    </View>
  );
}
