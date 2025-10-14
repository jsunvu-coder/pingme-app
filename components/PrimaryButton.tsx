import { TouchableOpacity, Text, ActivityIndicator, View } from "react-native";

export default function PrimaryButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  loadingText,
  className
}: {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  loadingText?: string, 
  className?: string;
}) {
  return (
    <TouchableOpacity
      disabled={disabled || loading}
      onPress={onPress}
      className={`${disabled || loading ? "bg-[#E9E9E9]" : "bg-[#FD4912]"
        } py-4 px-8 rounded-full border border-transparent flex-row items-center justify-center ${className}`}
      activeOpacity={0.8}
    >
      {loading ? (
        <View className="flex-row">
          <View className="flex-1" />

          <Text className="text-[#909090] text-center font-bold text-lg">
            {loadingText || "Processing..."}
          </Text>

          <View className="flex-1" />
          <ActivityIndicator color="#B5B5B5" className="mr-6" />
        </View>
      ) : (
        <Text className="text-white text-center font-bold text-lg">
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}
