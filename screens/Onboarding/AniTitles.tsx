import React from 'react';
import { Dimensions, Text, View } from 'react-native';
import Animated, { SharedValue, interpolate, useAnimatedStyle } from 'react-native-reanimated';

type Props = {
  scrollX: SharedValue<number>;
  slides: any[];
};

export default function AniTitles({ scrollX, slides }: Props) {
  return (
    <View className="mt-4 h-20">
      {slides.map(({ text }, index) => (
        <AniTitle key={index} title={text} position={index} scrollX={scrollX} />
      ))}
    </View>
  );
}

function AniTitle({
  position,
  scrollX,
  title,
}: {
  position: number;
  scrollX: SharedValue<number>;
  title: string;
}) {
  const { width } = Dimensions.get('window');
  const animatedStyle = useAnimatedStyle(() => {
    const activeIndex = scrollX.value / width;
    const inputRange = [position - 2, position - 1, position, position + 1, position + 2];
    const opacity = interpolate(activeIndex, inputRange, [0, 0, 1, 0, 0]);
    return {
      opacity,
      position: 'absolute',
      top: 0,
      width,
    };
  });

  return (
    <Animated.View style={animatedStyle}>
      <Text className="px-8 text-center text-3xl font-semibold text-white">{title}</Text>
    </Animated.View>
  );
}
