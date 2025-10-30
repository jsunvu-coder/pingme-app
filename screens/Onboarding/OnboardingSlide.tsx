import { View, Text, ImageBackground, Dimensions } from 'react-native';
import PageIndicator from 'components/PageIndicator';

type Props = {
  image: any;
  title: string;
  index: number;
  width: number;
  height: number;
};

const textHeight = Dimensions.get('window').height * 0.35;

export default function OnboardingSlide({ image, title, index, width, height }: Props) {
  return (
    <ImageBackground
      source={image}
      resizeMode="cover"
      style={{ width, height }}
      className="flex-1 justify-end">
      <View className="bg-black/40 px-12" style={{ height: textHeight, marginHorizontal: 24 }}>
        <PageIndicator index={index} />
        <Text className="mt-6 text-center text-3xl font-semibold text-white">{title}</Text>
      </View>
    </ImageBackground>
  );
}
