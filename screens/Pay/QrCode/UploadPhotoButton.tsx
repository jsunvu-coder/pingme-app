import React, { useState } from 'react';
import { TouchableOpacity, Text, Alert, ActivityIndicator, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  onScanSuccess?: (data: string) => void;
};

export default function UploadPhotoButton({ onScanSuccess }: Props) {
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (loading) return; // Prevent multiple presses

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Please allow photo access to upload.');
      return;
    }

    // Pick an image
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });

    if (result.canceled) return;

    setLoading(true);

    try {
      const scans = await Camera.scanFromURLAsync(result.assets[0].uri);

      if (scans.length > 0) {
        const qrData = scans[0].data;
        onScanSuccess?.(qrData);
      } else {
        Alert.alert('No QR Code Found', 'Please select a valid QR code image.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to decode QR code from image.');
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
