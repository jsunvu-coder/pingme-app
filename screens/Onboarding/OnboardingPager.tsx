import { Image, ScrollView, View } from 'react-native';
import OnboardingSlide from './OnboardingSlide';
import SecondaryButton from 'components/ScondaryButton';
import PrimaryButton from 'components/PrimaryButton';
import { push } from 'navigation/Navigation';

const Page1 = require('../../assets/intro-1.png');

export default function OnboardingPager({ navigation }: any) {
  const slides = [
    'No banks, no borders — just fast, simple transfers.',
    'Pay with just an email or chat handle.',
    '0 fees. Your funds, your control — always.',
  ];

  return (
    <View className="flex-1 bg-white">
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
        {slides.map((text, idx) => (
          <OnboardingSlide
            key={idx}
            image={<Image source={Page1} resizeMode="cover" className="w-full" />}
            title={text}
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
