import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text } from 'react-native';
import { Camera, CameraView } from 'expo-camera';

type QRScannerProps = {
  onScanSuccess: (data: string, releaseScanLock: () => void) => void | Promise<void>;
};

export default function QRScanner({ onScanSuccess }: QRScannerProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scannedData, setScannedData] = useState<string | null>(null);
  const isProcessingRef = useRef(false);
  const lastDataRef = useRef<string | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  useEffect(
    () => () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    },
    []
  );

  const releaseScanLock = useCallback(() => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
    isProcessingRef.current = false;
    lastDataRef.current = null;
    setScannedData(null);
  }, []);

  const handleBarcodeScanned = useCallback(
    ({ data }: { data: string }) => {
      if (isProcessingRef.current) return;

      let decoded = data;
      try {
        decoded = decodeURIComponent(data);
      } catch {
        // ignore decode errors and use raw data
      }

      if (decoded === lastDataRef.current) return;

      isProcessingRef.current = true;
      lastDataRef.current = decoded;
      setScannedData(decoded);

      Promise.resolve(onScanSuccess(decoded, releaseScanLock))
        .catch((err) => {
          console.error('[QRScanner] onScanSuccess failed', err);
        })
        .finally(() => {
          if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
          // Fallback release in case handler never resets (e.g., navigation)
          resetTimerRef.current = setTimeout(() => {
            releaseScanLock();
          }, 6000);
        });
    },
    [onScanSuccess, releaseScanLock]
  );

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
