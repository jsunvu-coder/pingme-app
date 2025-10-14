import { View, Text } from "react-native";

export default function ConfirmRow({
  label,
  value,
  action,
}: {
  label: string;
  value: string;
  action?: React.ReactNode;
}) {
  return (
    <View className="flex-row justify-between items-center">
      <Text className="text-gray-500">{label}</Text>
      <View className="flex-row items-center">
        <Text className="text-gray-900 font-medium">{value}</Text>
        {action}
      </View>
    </View>
  );
}
