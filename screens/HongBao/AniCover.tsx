import { useIsFocused } from '@react-navigation/native';
import QuestionCircleIcon from 'assets/QuestionCircleIcon';
import { forwardRef, useEffect, useImperativeHandle } from 'react';
import { Dimensions, Image, ImageBackground, Platform, StatusBar, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const HongbaoCoverLibImage = require('../../assets/HongBaoAni/Hongbao_opened_2.png');
const HongbaoCoverBaseImage = require('../../assets/HongBaoAni/Hongbao_opened_3.png');
const HongbaoCoverClosedImage = require('../../assets/HongBaoAni/Hongbao_close.png');
const HongbaoCoverClosedNonShadowImage = require('../../assets/HongBaoAni/Hongbao_close_non_shadow.png');
const HongbaoCoverBgImage = require('../../assets/HongBaoAni/HongbaoBg.png');

const INPUT_RANGE = [0, 0.45, 0.47, 1, 1.46, 1.47, 2];

const { width, height: windowHeight } = Dimensions.get('window');

const COVER_WIDTH = 0.94 * width;
const COVER_HEIGHT = COVER_WIDTH / (351 / 666);


const CONTAINER_HEIGHT = Platform.OS === 'ios' ? 0.82 * windowHeight : 0.9 * windowHeight;
const CONTAINER_WIDTH = COVER_WIDTH - 28;

export interface AniCoverRef {
  continueProgress: () => void;
  resetProgress: () => void;
}

interface AniCoverProps {
  children: React.ReactNode;
  offsetAdjustment?: number;
}

const AniCover = forwardRef<AniCoverRef, AniCoverProps>(({children, offsetAdjustment = 0}, ref) => {
  const BOTTOM_OFFSET = -0.57 * COVER_HEIGHT + offsetAdjustment;
  
  
  const isFocused = useIsFocused();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, { duration: 2500 });
  }, [isFocused]);

  const continueProgress = () => {
    progress.value = withTiming(4.75, { duration:4200 });
  };

  const resetProgress = () => {
    progress.value = 0;
    progress.value = withTiming(1, { duration: 2500 });
  };

  // Expose methods to parent component via ref
  useImperativeHandle(ref, () => ({
    continueProgress,
    resetProgress,
  }));

  const coverAnimatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      progress.value,
      [0, 0.45, 0.47, 1, 1.45, 1.47, 2],
      [0, BOTTOM_OFFSET, BOTTOM_OFFSET, 0, BOTTOM_OFFSET, BOTTOM_OFFSET, BOTTOM_OFFSET, ]
    );

    const opacity = interpolate(progress.value, [0, 0.2, 1], [0, 1, 1, 1]);
    
    return {
      transform: [{ translateY }, { scale: 1 }],
      opacity,
      position: 'absolute',
      width: '100%',
      height: 3 * windowHeight,
      bottom: BOTTOM_OFFSET,
    };
  });

  const textAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      progress.value,
      [0, 2.5, 3, 3.5, 5],
      [0, 0, 0, 1, 1]
    );

    const bottom = interpolate(
      progress.value,
      [0, 2.5, 3, 3.5, 5],
      [0, 0, 0, 0.4 * windowHeight, 0.4 * windowHeight]
    );

    return {
      opacity,
      position: 'absolute',
      width: '100%',
      bottom,
      left: 0,
      right: 0,
      paddingHorizontal: 16,
    };
  });

  const coverClosedAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      progress.value,
      [...INPUT_RANGE, 2.5, 3.5],
      [1, 1, 0, 0, 0, 0, 1, 1, 0, 0]
    );
    const scale = interpolate(
      progress.value,
      [0, 2, 3.5],
      [1, 1, 0.2]
    );
    const rotate = interpolate(
      progress.value,
      [0, 2, 3.5],
      [0, 0, 36]
    );
    const translateY = interpolate(
      progress.value,
      [0, 2, 2.5, 3.5, 4],
      [0, 0, 0,0.32 * windowHeight, 0]
    );
    
    return {
      transform: [{ scale }, { rotate: `${rotate}deg` }],
      opacity,
      position: 'absolute',
      bottom: translateY,
      left: 16,
    };
  });

  const coverClosedNonShadowAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      progress.value,
      [0, 2.5, 3.5],
      [0, 1, 1]
    );
    const scale = interpolate(
      progress.value,
      [0, 2, 3.5, 4],
      [1, 1, 0.2, 0.2]
    );
    const rotate = interpolate(
      progress.value,
      [0, 2, 3.5, 4],
      [0, 0, 36, 36]
    );
    const translateY = interpolate(
      progress.value,
      [0, 2, 2.5, 3.5, 3.7, 4, 4.25, 4.5, 4.75],
      [0, 0, 0, 0.32 * windowHeight, 0.32 * windowHeight + 5, 0.32 * windowHeight - 5, 0.32 * windowHeight + 5, 0.32 * windowHeight - 5, 0.32 * windowHeight + 5, 0.32 * windowHeight]
    );
    
    return {
      transform: [{ scale }, { rotate: `${rotate}deg` }],
      opacity,
      position: 'absolute',
      bottom: translateY,
      left: 16,
    };
  });

  const coverLibAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      progress.value,
      INPUT_RANGE,
      [0, 0, 1, 1, 1, 1, 0, 0]
    );
    
    return {
      opacity,
      position: 'absolute',
      bottom: 0,
      left: 16,
    };
  });
  
  const containerAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      progress.value,
      [0, 0.46, 0.5, 1, 1.46, 1.5, 2],
      [0, 0, 1, 1, 1, 0, 0, 0]
    );
    const translateY = interpolate(
      progress.value,
      INPUT_RANGE,
      [0.8 * CONTAINER_HEIGHT, 0.8 * CONTAINER_HEIGHT, 0.8 * CONTAINER_HEIGHT, 0, 0.8 * CONTAINER_HEIGHT, 0.8 * CONTAINER_HEIGHT, 0]
    );
    const height = interpolate(
      progress.value,
      INPUT_RANGE,
      [0, 0, CONTAINER_HEIGHT, CONTAINER_HEIGHT, CONTAINER_HEIGHT, CONTAINER_HEIGHT, 0, 0]
    );
    
    return {
      transform: [{ translateY }],
      opacity,
      height,
      width: CONTAINER_WIDTH,
      left: 28,
      position: 'absolute',
      bottom: -1 * BOTTOM_OFFSET,
    };
  });

  return (
    <View style={{ flex: 1, backgroundColor: '#F5E9E1' }}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView edges={['top']} />
      
      <View className="flex flex-1 justify-end">
        <Animated.View style={coverAnimatedStyle}>
          <Animated.View pointerEvents="none" style={coverClosedNonShadowAnimatedStyle}>
            <Image
              source={HongbaoCoverClosedNonShadowImage}
              style={{ width: COVER_WIDTH, height: COVER_HEIGHT }}
              resizeMode="contain"
            />
          </Animated.View>
          <Animated.View pointerEvents="none" style={coverClosedAnimatedStyle}>
            <Image
              source={HongbaoCoverClosedImage}
              style={{ width: COVER_WIDTH, height: COVER_HEIGHT }}
              resizeMode="contain"
            />
          </Animated.View>

          <Animated.View pointerEvents="none" style={coverLibAnimatedStyle}>
            <Image
              source={HongbaoCoverLibImage}
              style={{ width: COVER_WIDTH, height: COVER_HEIGHT }}
              resizeMode="contain"
            />
          </Animated.View>

          <Animated.View style={containerAnimatedStyle}>
            <ImageBackground
              source={HongbaoCoverBgImage}
              resizeMode="stretch"
              style={{ flex: 1, height: CONTAINER_HEIGHT, width: CONTAINER_WIDTH }}
            >
              <View className="flex-1 m-8 ml-4">
                <View style={{ flex: 1 }}>
                  <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ 
                      paddingHorizontal: 16, 
                      paddingBottom: 0.25 * CONTAINER_HEIGHT 
                    }}
                    showsVerticalScrollIndicator={true}
                    bounces={false}
                    overScrollMode="never"
                    nestedScrollEnabled={true}
                    scrollEventThrottle={16}
                  >
                    {children}
                  </ScrollView>
                </View>
              </View>
            </ImageBackground>
          </Animated.View>

          <Animated.View pointerEvents="none" style={coverLibAnimatedStyle}>
            <Image
              source={HongbaoCoverBaseImage}
              style={{ width: COVER_WIDTH, height: COVER_HEIGHT }}
              resizeMode="contain"
            />
          </Animated.View>
        </Animated.View>
        <Animated.View style={textAnimatedStyle}>
          <Text className="text-center font-bold text-3xl text-[#982C0B]">
          Share the link - they'll see the message and claim their Hongbao.
          </Text>
          <View className="flex-row items-center justify-center mt-6">
            <Text className="text-base text-black">
              Hurry up! The link will be expired in 7 days!
            </Text>
            <TouchableOpacity className="ml-2">
              <QuestionCircleIcon/>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </View>
  );
});

AniCover.displayName = 'AniCover';

export default AniCover;
