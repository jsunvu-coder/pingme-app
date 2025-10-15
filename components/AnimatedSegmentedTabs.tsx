import { View, Animated, Dimensions, TouchableOpacity, Text } from "react-native";
import { useEffect, useRef } from "react";

type TabItem = {
  key: string;
  label: string;
  icon?: React.ComponentType<{ isActive: boolean }>;
};

type Props = {
  tabs: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
  activeColor?: string;
  inactiveColor?: string;
  children?: React.ReactNode;
};

export default function AnimatedSegmentedTabs({
  tabs,
  activeKey,
  onChange,
  activeColor = "black",
  inactiveColor = "#929393",
  children,
}: Props) {
  const screenWidth = Dimensions.get("window").width;
  const tabWidth = screenWidth / tabs.length - 16;
  const activeIndex = tabs.findIndex((t) => t.key === activeKey);
  const translateX = useRef(new Animated.Value(activeIndex)).current;

  useEffect(() => {
    Animated.spring(translateX, {
      toValue: activeIndex,
      useNativeDriver: false,
      friction: 8,
      tension: 60,
    }).start();
  }, [activeIndex]);

  const left = translateX.interpolate({
    inputRange: tabs.map((_, i) => i),
    outputRange: tabs.map((_, i) => i * tabWidth + 4),
  });

  return (
    <View>
      <View className="relative flex-row rounded-full border border-[#E9E9E9] bg-white p-1 overflow-hidden mb-6 mt-6">
        {/* Animated highlight */}
        <Animated.View
          style={{
            position: "absolute",
            top: 4,
            bottom: 4,
            left,
            width: tabWidth - 8,
            borderRadius: 9999,
            backgroundColor: activeColor,
          }}
        />

        {tabs.map((tab) => {
          const isActive = tab.key === activeKey;
          const Icon = tab.icon;
          return (
            <TouchableOpacity
              key={tab.key}
              className="flex-1 flex-row items-center justify-center py-2"
              onPress={() => onChange(tab.key)}
              activeOpacity={0.8}
            >
              {Icon && <Icon isActive={isActive} />}
              <Text
                className={`ml-1 font-semibold ${
                  isActive ? "text-white" : "text-gray-500"
                }`}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {children}
    </View>
  );
}
