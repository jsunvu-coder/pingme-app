import { useState } from "react";
import { View, Text, TouchableOpacity, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import WalletAddIcon from "assets/WalletAddIcon";

export default function FilterDropdown() {
  const [expanded, setExpanded] = useState(false);

  const toggleExpand = () => setExpanded(!expanded);

  return (
    <View className="mt-6">
      {/* Top bar */}
      <TouchableOpacity
        onPress={toggleExpand}
        activeOpacity={0.8}
        className="border border-[#FD4912] rounded-2xl flex-row justify-between items-center px-4 py-3 bg-white"
      >
        <Text className="text-base text-gray-800 font-medium">Show All</Text>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={18}
          color="#FD4912"
        />
      </TouchableOpacity>

      {/* Dropdown menu */}
      {expanded && (
        <View className="bg-white rounded-2xl mt-2 overflow-hidden shadow-sm border border-gray-100">
          {/* Option 1: Show All */}
          <TouchableOpacity
            className="flex-row items-center px-4 py-3 bg-[#FFF6F3]"
            activeOpacity={0.7}
          >
            <WalletAddIcon size={20} color="#FD4912" />
            <Text className="text-gray-800 text-base font-medium ml-2">
              Show All
            </Text>
          </TouchableOpacity>

          {/* Option 2: Sent */}
          <TouchableOpacity
            className="flex-row items-center px-4 py-3 border-t border-gray-100"
            activeOpacity={0.7}
          >
            <Ionicons name="remove-outline" size={20} color="#FD4912" />
            <Text className="text-gray-800 text-base font-medium ml-2">
              Sent
            </Text>
          </TouchableOpacity>

          {/* Option 3: Received */}
          <TouchableOpacity
            className="flex-row items-center px-4 py-3 border-t border-gray-100"
            activeOpacity={0.7}
          >
            <Ionicons name="add-outline" size={20} color="#FD4912" />
            <Text className="text-gray-800 text-base font-medium ml-2">
              Received
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
