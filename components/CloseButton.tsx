import { TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { goBack } from "navigation/Navigation";

type Props = {
    onPress?: () => void;
    className?: string;
    iconColor?: string;
    iconSize?: number;
};

export default function CloseButton({
    onPress,
    className = "",
    iconColor = "#C4C4C4",
    iconSize = 40,
}: Props) {
    const handleClose = () => {
        if (onPress) {
            onPress();
        } else {
            goBack();
        }
    };

    return (
        <View className={className || "flex-row justify-end mb-4"}>
            <TouchableOpacity onPress={handleClose}>
                <Ionicons name="close-outline" size={iconSize} color={iconColor} />
            </TouchableOpacity>
        </View>
    );
}
