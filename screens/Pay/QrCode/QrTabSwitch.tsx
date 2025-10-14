import { useState } from "react";
import { View } from "react-native";
import QRCode1Icon from "assets/QRCode1Icon";
import QRCode2Icon from "assets/QRCode2Icon";
import SegmentedTab from "components/SegmentedTab";
import { useNavigation } from "@react-navigation/native";

type Props = {
  activeTab?: "scan" | "myqr";
  setActiveTab: (tab: "scan" | "myqr") => void;
};

export default function QrTabSwitch({ activeTab = "scan", setActiveTab }: Props) {

  const handlePress = (tab: "scan" | "myqr") => {
    setActiveTab(tab);
  };

  return (
    <View className="relative flex-row rounded-full border border-[#E9E9E9] bg-white p-1 overflow-hidden">
      <SegmentedTab
        label="Scan QR"
        icon={<QRCode1Icon isActive={activeTab === "scan"} />}
        isActive={activeTab === "scan"}
        onPress={() => handlePress("scan")}
      />

      <SegmentedTab
        label="My QR"
        icon={<QRCode2Icon isActive={activeTab === "myqr"} />}
        isActive={activeTab === "myqr"}
        onPress={() => handlePress("myqr")}
      />
    </View>
  );
}
