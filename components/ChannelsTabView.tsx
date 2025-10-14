import { View, Text, TouchableOpacity } from "react-native";

type ChannelsTabViewProps = {
  activeTab: string;
  onTabChange: (tab: string) => void;
};

export default function ChannelsTabView({
  activeTab,
  onTabChange,
}: ChannelsTabViewProps) {
  const channels = ["Email", "WhatsApp", "Telegram", "SMS"];

  return (
    <View className="flex-row mb-4 bg-gray-100 rounded-full p-1">
      {channels.map((label, idx) => {
        const isActive = label === activeTab;
        const containerClass = isActive
          ? "flex-1 py-2 rounded-full items-center bg-white"
          : "flex-1 py-2 rounded-full items-center";
        const textClass = isActive
          ? "font-medium text-gray-800"
          : "font-medium text-gray-500";

        return (
          <TouchableOpacity
            key={idx}
            onPress={() => onTabChange(label)}
            className={containerClass}
          >
            <Text className={textClass}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
