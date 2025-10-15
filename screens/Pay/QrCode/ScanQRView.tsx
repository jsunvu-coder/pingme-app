import React, { useEffect, useState } from 'react';
import { Camera } from 'expo-camera';
import CameraPermissionView from './CameraPermissionView';
import { NoPermissionView } from './NoPermissionView';
import QRScanner from './QrScanner';
import { handleUrl } from './URLHandler';

export default function ScanQRView() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [deniedPermanently, setDeniedPermanently] = useState(false);

  useEffect(() => {
    checkPermissionStatus();
  }, []);

  const handleQRCode = (data: string) => {
    console.log('Scanned QR Code:', data);
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
  return <QRScanner onScanSuccess={handleQRCode} />;
}
