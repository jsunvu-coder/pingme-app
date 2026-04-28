import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = {
  children: React.ReactNode;
  loading?: boolean;
  // When true, render an opaque full-screen container instead of the
  // bottom-sheet style. Used when the screen is opened from inside the app
  // (e.g. Notifications) where the previous screen would otherwise show
  // through the scrim / 120px top gap.
  fullscreen?: boolean;
};

export default function ModalContainer({ children, loading, fullscreen }: Props) {
  if (fullscreen) {
    return (
      <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: "#ffffff" }}>
        <View pointerEvents={loading ? "none" : "auto"} style={{ flex: 1 }}>
          {children}
        </View>
      </SafeAreaView>
    );
  }
  return (
    <View className="flex-1 bg-[#000000CC] justify-end">
      <View pointerEvents={loading ? "none" : "auto"} className="flex-1 rounded-t-3xl mt-[120px] bg-white">
        {children}
      </View>
    </View>
  );
}
