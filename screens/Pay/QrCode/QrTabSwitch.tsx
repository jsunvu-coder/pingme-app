import { useState } from "react";
import { View, LayoutChangeEvent } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import QRCode1Icon from "assets/QRCode1Icon";
import QRCode2Icon from "assets/QRCode2Icon";
import SegmentedTab from "components/SegmentedTab";

export default function QrTabSwitch() {
  const [activeTab, setActiveTab] = useState<"scan" | "myqr">("scan");
  const [containerWidth, setContainerWidth] = useState(0);

  const indicatorX = useSharedValue(0);

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout;
    setContainerWidth(width);
  };

  const tabCount = 2;
  const padding = 4; // from class p-1 → 4px padding in tailwind
  const spacing = 2; // inner visual margin
  const tabWidth = (containerWidth - padding * 2) / tabCount;

  const moveIndicator = (tab: "scan" | "myqr") => {
    setActiveTab(tab);
    const targetX =
      tab === "scan"
        ? spacing
        : tabWidth + spacing; // move to next slot but maintain margin

    indicatorX.value = withSpring(targetX, {
      damping: 15,
      stiffness: 160,
      mass: 0.8,
    });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }));

  return (
    <View
      onLayout={handleLayout}
      className="relative flex-row rounded-full border border-[#E9E9E9] bg-white p-1 overflow-hidden"
    >
      {containerWidth > 0 && (
        <Animated.View
          style={[
            animatedStyle,
            {
              width: tabWidth - spacing * 2,
            },
          ]}
          className="absolute top-1 bottom-1 rounded-full bg-black"
        />
      )}

      <SegmentedTab
        label="Scan QR"
        icon={<QRCode1Icon isActive={activeTab === "scan"} />}
        isActive={activeTab === "scan"}
        onPress={() => moveIndicator("scan")}
      />

      <SegmentedTab
        label="My QR"
        icon={<QRCode2Icon isActive={activeTab === "myqr"} />}
        isActive={activeTab === "myqr"}
        onPress={() => moveIndicator("myqr")}
      />
    </View>
  );
}
