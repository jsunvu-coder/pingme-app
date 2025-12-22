import React from 'react';
import { Dimensions, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolate,
  SharedValue,
  interpolateColor,
} from 'react-native-reanimated';

type Props = {
  scrollX: SharedValue<number>;
  length: number;
};

export default function AniPageIndicator({ scrollX, length }: Props) {
  console.log('length', length);
  console.log('Array.from({ length: length })', Array.from({ length: length }));
  return (
    <View className="mt-4 flex-row items-center justify-center gap-x-2">
      {Array.from({ length: length }).map((_, index) => (
        <IndicatorDot key={index} position={index} scrollX={scrollX} />
      ))}
    </View>
  );
}

function IndicatorDot({ position, scrollX }: { position: number; scrollX: SharedValue<number> }) {
  const { width } = Dimensions.get('window');
  const animatedStyle = useAnimatedStyle(() => {
    const activeIndex = scrollX.value / width;
    const inputRange = [position - 2, position - 1, position, position + 1, position + 2];
    const dotWidth = interpolate(activeIndex, inputRange, [8, 8, 32, 8, 8]);
    console.log('dotWidth', dotWidth);
    return {
      width: dotWidth,
      backgroundColor: interpolateColor(activeIndex, inputRange, [
        'transparent',
        'transparent',
        'white',
        'transparent',
        'transparent',
      ]),
    };
  });

  return (
    <Animated.View
      style={[
        animatedStyle,
        {
          height: 8,
          borderRadius: 4,
          borderColor: 'white',
          borderWidth: 1,
          opacity: 1,
        },
      ]}
    />
  );
}
