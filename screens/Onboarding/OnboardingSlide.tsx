import { View, Text, ImageBackground, Dimensions } from 'react-native';

type Props = {
  image: any;
  width: number;
};

export default function OnboardingSlide({ image, width }: Props) {
  return <ImageBackground source={image} resizeMode="cover" style={{ width }} />;
}
