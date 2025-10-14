import React, { useState } from "react";
import { View } from "react-native";
import { CameraView } from "expo-camera";

type QRScannerProps = {
  onScanSuccess: (data: string) => void;
};

export default function QRScanner({ onScanSuccess }: QRScannerProps) {
  const [scannedData, setScannedData] = useState<string | null>(null);

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (!scannedData) {
      setScannedData(data);
      console.log("QR Scanned:", data);
      onScanSuccess(data);
      setTimeout(() => setScannedData(null), 3000);
    }
  };

  return (
    <View className="flex-1 mt-6 bg-black">
      <CameraView
        style={{ flex: 1}}
        facing='back'
        onBarcodeScanned={handleBarcodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
      />
    </View>
  );
}
