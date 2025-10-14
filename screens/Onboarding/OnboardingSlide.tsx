import PageIndicator from "components/PageIndicator";
import { View, Text, Dimensions } from "react-native";

type Props = {
  image?: React.ReactNode;
  title: string;
  index: number;
};

export default function OnboardingSlide({ image, title, index }: Props) {
  const { width } = Dimensions.get("window");

  return (
    <View style={{ width }} className="flex-1">
      <View className="flex-1 justify-center overflow-hidden">{image}</View>

      <View className="items-center p-6">
        <PageIndicator index={index} />
        <Text className="text-3xl font-medium text-center text-[#0F0F0F] mt-6">
          {title}
        </Text>
      </View>
    </View>
  );
}
