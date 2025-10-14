import { View, Text, Modal, Animated } from "react-native";
import { useRef, useEffect } from "react";
import ExclamationIcon from "assets/ExclaiminationIcon";
import CloseButton from "components/CloseButton";
import SecondaryButton from "components/ScondaryButton";

type Props = {
    visible: boolean;
    onClose: () => void;
    onConfirm: () => void;
};

export default function ConfirmRecoveryModal({ visible, onClose, onConfirm }: Props) {
    const slideAnim = useRef(new Animated.Value(300)).current;

    useEffect(() => {
        if (visible) {
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(slideAnim, {
                toValue: 300,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    const points = [
        "Once you proceed, the QR code will be permanently hidden.",
        "This recovery function cannot be accessed again.",
        "Without this QR code, you will not be able to recover your account if you forget your password.",
    ];

    return (
        <Modal visible={visible} transparent backdropColor="black" animationType="slide">
            <View className="flex-1 bg-black/50 justify-end">
                <View className="bg-white rounded-t-3xl px-6 pt-8 pb-10">
                    {/* Close button */}
                    <CloseButton onPress={onClose}/>

                    {/* Warning Icon */}
                    <View className="items-center mb-4">
                        <View className="w-14 h-14 items-center justify-center mb-3">
                            <ExclamationIcon size={48} color="#FFD952" />
                        </View>
                        <Text className="text-3xl font-semibold text-gray-900">
                            Confirm Recovery Key Saved
                        </Text>
                    </View>

                    <View className="bg-red-600 rounded-2xl p-3 flex-row gap-x-3 my-4">
                        <View className="mt-1">
                            <ExclamationIcon size={18} />
                        </View>
                        <View className="flex-1">
                            <Text className="text-white font-bold text-lg mb-0.5">
                                WARNING
                            </Text>
                            <Text className="text-white text-lg">
                                If you have not saved the QR code, close this modal and secure it now.
                            </Text>
                        </View>
                    </View>

                    {/* Bullet list */}
                    <View className="mt-2">
                        {points.map((text, idx) => (
                            <View key={idx} className="flex-row items-start ">
                                <Text className="text-gray-700 mr-2 text-4xl">•</Text>
                                <Text className="flex-1 text-gray-800 text-lg mt-2">
                                    {text}
                                </Text>
                            </View>
                        ))}
                    </View>

                    <View className="mt-8 mb-8">
                        <SecondaryButton title="Confirm & Hide QR Code" onPress={onConfirm} />
                    </View>
                </View>
            </View>
        </Modal>
    );
}
