import { View, Text, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
const adCard = require('../../assets/ad_card.png');

export const AdCard = () => {
  return (
    <View className="mt-10 rounded-2xl bg-white p-5">
      <Text className="text-base text-gray-800">
        Sent money faster than a text with <Text className="font-semibold">@PingMe</Text>
      </Text>
      <Text className="mt-1 font-medium text-[#FD4912]">#JustPinged</Text>

      <View className="mt-8 mb-6 h-40 items-center justify-center rounded-xl bg-gray-100">
        <Image source={adCard} resizeMode="contain" className="w-full" />
      </View>
    </View>
  );
};
