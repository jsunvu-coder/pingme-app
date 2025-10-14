import { View, Text, ScrollView, TouchableOpacity } from "react-native";

type Props = {
  items: string[];
  title?: string;
  onSelect?: (item: string) => void; // ⬅️ optional callback for selection
};

export default function RecentList({ items, title, onSelect }: Props) {
  return (
    <View className="mt-6">
      {title && (
        <Text className="text-gray-500 text-xs font-semibold mb-2 uppercase tracking-wide">
          {title}
        </Text>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {items.map((item, idx) => (
          <TouchableOpacity
            key={idx}
            activeOpacity={0.8}
            onPress={() => onSelect?.(item)} // ⬅️ call when tapped
            className="bg-white border border-gray-200 rounded-full px-4 py-2"
          >
            <Text
              className="text-gray-800 text-sm"
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {item}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
