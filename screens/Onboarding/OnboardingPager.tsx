import OutlineButton from 'components/OutlineButton';
import PrimaryButton from 'components/PrimaryButton';
import { push } from 'navigation/Navigation';
import { Dimensions, Text, View } from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import OnboardingSlide from './OnboardingSlide';
import ArrowUpRightIcon from 'assets/ArrowUpRightIcon';
import AniPageIndicator from 'components/AniPageIndicator';
import AniTitles from './AniTitles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
      text: '0 fees. Your funds, your \n control — always.',
      image: Page3,
    },
  ];

  const { width } = Dimensions.get('window');
  const { bottom } = useSafeAreaInsets();
  const scrollX = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  return (
    <View className="flex-1 bg-white">
      <Animated.ScrollView
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        className="flex-1">
        {slides.map((slide, idx) => (
          <OnboardingSlide key={idx} image={slide.image} width={width} />
        ))}
      </Animated.ScrollView>
      <View style={{ position: 'absolute', right: 0, bottom: bottom + 48, left: 0 }}>
        <AniPageIndicator scrollX={scrollX} length={slides.length} />
        <AniTitles scrollX={scrollX} slides={slides} />
        <PrimaryButton
          title="Log In to PingMe"
          onPress={() => push('AuthScreen')}
          className="mx-8 mt-8"
        />
        {/* TODO: Add sign up flow */}
        {/* <OutlineButton
          title="Sign Up"
          onPress={() => true}
          className="mx-8 mt-6"
          borderColor="#FD4912"
          textColor="white"
          icon={<ArrowUpRightIcon size={32} color={'white'} />}
        /> */}
      </View>
    </View>
  );
}
