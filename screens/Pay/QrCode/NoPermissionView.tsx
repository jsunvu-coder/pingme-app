import React, {  } from "react";
import { View, Text, Linking } from "react-native";
import PrimaryButton from "components/PrimaryButton";

export const NoPermissionView = () => {
    return <View className="flex-1 justify-center items-center px-8 bg-white">
        <Text className="text-center text-gray-800 text-2xl font-semibold">
            Camera access is disabled.
        </Text>
        <Text className="mt-4 mb-6 text-center text-gray-500 text-lg">
            To scan QR codes, please enable camera access in your device
            settings.
        </Text>
        <PrimaryButton
            title="Open Settings"
            onPress={() => Linking.openSettings()}
        />
    </View>
}