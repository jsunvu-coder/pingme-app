import { useState, useEffect } from "react";
import { View, LayoutChangeEvent } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import LoginIcon from "assets/LoginIcon";
import AddUserIcon from "assets/AddUserIcon";
import SegmentedTab from "components/SegmentedTab";

type Props = {
  activeTab: "signup" | "login";
  onChange: (tab: "signup" | "login") => void;
};

export default function AuthTabs({ activeTab, onChange }: Props) {
  const tabs = [
    { key: "signup", label: "Sign Up", icon: AddUserIcon },
    { key: "login", label: "Log In", icon: LoginIcon },
  ];


  return (
    <View
      className="relative flex-row rounded-full mx-6 border border-[#E9E9E9] bg-gray-50 p-1 mb-8 overflow-hidden"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        const Icon = tab.icon;

        return (
          <SegmentedTab
            key={tab.key}
            icon={<Icon isActive={isActive} />}
            isActive={isActive}
            label={tab.label}
            onPress={() => onChange(tab.key as "signup" | "login")}
          />
        );
      })}
    </View>
  );
}
