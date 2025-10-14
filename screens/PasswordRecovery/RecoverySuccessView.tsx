import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function RecoverySuccessView() {
    const points = [
        "For your protection, the QR code is no longer accessible.",
        "If you forget your password in the future, use your saved QR code in the Forgot Password process to regain access.",
        "Important: Keep your saved QR code confidential. Anyone with access can unlock your account.",
    ];

    return (
        <View className="flex-1 bg-[#fafafa]">
            <View className="flex-1 justify-center items-center px-8">
                <View className="mb-6">
                    <Ionicons name="checkmark-done-outline" size={80} color="#14B957" />
                </View>

                <Text className="text-center text-2xl font-bold text-[#444444] mb-6">
                    Your recovery QR code has{"\n"}been successfully secured.
                </Text>

                <View className="mt-2 self-stretch">
                    {points.map((text, idx) => (
                        <View key={idx} className="flex-row items-start mb-4">
                            <Text className="text-[#444444] mr-2 text-3xl leading-6 mt-1">•</Text>
                            <Text className="flex-1 text-[#444444] text-xl leading-6">
                                {text}
                            </Text>
                        </View>
                    ))}
                </View>

                <View className="h-[25%]"/>
            </View>
        </View>
    );
}
