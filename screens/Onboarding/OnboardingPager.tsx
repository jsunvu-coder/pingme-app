import { Image, ScrollView, View } from 'react-native';
import OnboardingSlide from './OnboardingSlide';
import SecondaryButton from 'components/ScondaryButton';
import { push } from 'navigation/Navigation';

const Page1 = require('../../assets/intro_1.png');
const Page2 = require('../../assets/intro_2.png');
const Page3 = require('../../assets/intro_3.png');

export default function OnboardingPager({ navigation }: any) {
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

  return (
    <View className="flex-1 bg-white">
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
        {slides.map((slide, idx) => (
          <OnboardingSlide
            key={idx}
            image={<Image source={slide.image} resizeMode="contain" className="w-full" />}
            title={slide.text}
            index={idx}
          />
        ))}
      </ScrollView>

      <View className="mb-16 h-[15%] px-8 pt-8">
        <SecondaryButton title="Log In" onPress={() => push('AuthScreen')} />
      </View>
    </View>
  );
}
