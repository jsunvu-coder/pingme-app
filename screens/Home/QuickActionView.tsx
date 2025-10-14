import { View, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import IconButton from "components/IconButton";

import ArrowUpRightIcon from "assets/ArrowUpRightIcon";
import ArrowDownLeftIcon from "assets/ArrowDownLeftIcon";
import QRCode1Icon from "assets/QRCode1Icon";
import QRCode2Icon from "assets/QRCode2Icon";

export default function QuickActionsView() {
  const navigation = useNavigation<any>(); 

  const handleActionPress = (label: string) => {
    switch (label) {
      case "Send":
        navigation.navigate("Ping Now", { mode: "send" });
        break;
      case "Request":
        navigation.navigate("Ping Now", { mode: "request" });
        break;
      case "Scan":
        console.log("🔹 Open QR scanner");
        break;
      case "Show":
        console.log("🔹 Show my QR code");
        break;
      default:
        break;
    }
  };

  const quickActions = [
    { icon: <ArrowUpRightIcon color="white" />, label: "Send" },
    { icon: <ArrowDownLeftIcon color="white" />, label: "Request" },
    { icon: <QRCode1Icon color="white" size={36} />, label: "Scan" },
    { icon: <QRCode2Icon color="white" size={36} />, label: "Show" },
  ];

  return (
    <View>
      <Text className="text-gray-400 text-lg mb-4">Quick Actions</Text>

      <View className="flex-row justify-between">
        {quickActions.map((action, i) => (
          <IconButton
            key={i}
            icon={action.icon}
            label={action.label}
            onPress={() => handleActionPress(action.label)}
          />
        ))}
      </View>
    </View>
  );
}
