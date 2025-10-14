import React from "react";
import { TouchableOpacity, Text } from "react-native";

interface SecondaryButtonProps {
  title: string;
  onPress?: () => void;
  className?: string;
}

export default function SecondaryButton({
  title,
  onPress,
  className = "",
}: SecondaryButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      className={`rounded-full py-4 bg-[#FFEDE7] ${className} justify-center`}
    >
      <Text className="text-[#FD4912] font-bold text-lg text-center">
        {title}
      </Text>
    </TouchableOpacity>
  );
}
