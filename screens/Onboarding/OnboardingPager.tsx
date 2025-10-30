import { Image, ScrollView, View, Dimensions } from 'react-native';
import OnboardingSlide from './OnboardingSlide';
import PrimaryButton from 'components/PrimaryButton';
import { push } from 'navigation/Navigation';

const Page1 = require('../../assets/intro_1.png');
const Page2 = require('../../assets/intro_2.png');
const Page3 = require('../../assets/intro_3.png');

export default function OnboardingPager() {
  const slides = [
    {
      text: 'No banks, no borders — just fast, simple transfers.',
      image: Page1,
    },
    {
      text: 'Pay with just an email or chat handle.',
      image: Page2,
    },
    {
      text: '0 fees. Your funds, your control — always.',
      image: Page3,
    },
  ];

  const { width, height } = Dimensions.get('window');

  return (
    <View className="flex-1 bg-white">
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        className="flex-1">
        {slides.map((slide, idx) => (
          <OnboardingSlide
            key={idx}
            image={slide.image}
            title={slide.text}
            index={idx}
            width={width}
            height={height}
          />
        ))}
      </ScrollView>

      <View className="absolute right-0 bottom-32 left-0 px-8">
        <PrimaryButton title="Log In to PingMe" onPress={() => push('AuthScreen')} />
      </View>
    </View>
  );
}
