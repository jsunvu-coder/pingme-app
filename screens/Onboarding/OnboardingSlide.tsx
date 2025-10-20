import PageIndicator from 'components/PageIndicator';
import { View, Text, Dimensions } from 'react-native';

type Props = {
  image?: React.ReactNode;
  title: string;
  index: number;
};

export default function OnboardingSlide({ image, title, index }: Props) {
  const { width } = Dimensions.get('window');

  return (
    <View style={{ width }} className="flex-1 bg-white">
      {/* Top dark background area */}
      <View className="flex-1 items-center justify-center bg-[#1D1D1D]">
        {/* Image stays centered with dark background fill */}
        <View className="h-full w-full items-center justify-center">{image}</View>
      </View>

      {/* Bottom content area */}
      <View className="items-center bg-white p-6">
        <PageIndicator index={index} />
        <Text className="mt-6 text-center text-3xl font-medium text-[#0F0F0F]">{title}</Text>
      </View>
    </View>
  );
}
