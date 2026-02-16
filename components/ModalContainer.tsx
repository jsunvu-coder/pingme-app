import { View } from "react-native";

export default function ModalContainer({ children, loading }: { children: React.ReactNode, loading?: boolean }) {
  return (
    <View pointerEvents={loading ? "none" : "auto"} className="flex-1 bg-[#000000CC] justify-end">
      <View className="flex-1 rounded-t-3xl mt-[120px] bg-white">
        {children}
      </View>
    </View>
  );
}
