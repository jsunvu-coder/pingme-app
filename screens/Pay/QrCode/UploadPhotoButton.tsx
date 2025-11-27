import React, { useState } from 'react';
import { TouchableOpacity, Text, ActivityIndicator, View, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { showFlashMessage } from 'utils/flashMessage';

type Props = {
  onScanSuccess?: (data: string, releaseScanLock: () => void) => void;
};

export default function UploadPhotoButton({ onScanSuccess }: Props) {
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (loading) return; // Prevent multiple presses

    if (Platform.OS === 'android' && Platform.Version < 33) {
      showFlashMessage({
        title: 'Not supported',
        message:
          'Photo uploads require the Android Photo Picker (Android 13+). Please update your device.',
        type: 'warning',
      });
      return;
    }

    // Pick an image
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
      selectionLimit: 1,
      allowsMultipleSelection: false,
    });

    if (result.canceled) return;

    setLoading(true);

    try {
      const scans = await Camera.scanFromURLAsync(result.assets[0].uri);

      if (scans.length > 0) {
        const qrData = scans[0].data;
        onScanSuccess?.(qrData, () => {});
      } else {
        showFlashMessage({
          title: 'No QR Code Found',
          message: 'Please select a valid QR code image.',
          type: 'warning',
        });
      }
    } catch (error) {
      console.error(error);
      showFlashMessage({
        title: 'Error',
        message: 'Failed to decode QR code from image.',
        type: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={loading}
      onPress={handleUpload}
      className="mt-6 flex-row items-center justify-center">
      {loading ? (
        <View className="flex-row items-center">
          <ActivityIndicator size="small" color="#FD4912" />
          <Text className="ml-2 text-lg font-medium text-[#FD4912]">Processing...</Text>
        </View>
      ) : (
        <View className="flex-row items-center">
          <Ionicons name="image-outline" size={18} color="#FD4912" />
          <Text className="ml-2 text-lg font-medium text-[#FD4912]">Upload Photo</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
