import { useIsFocused, useRoute } from '@react-navigation/native';
import { useEffect } from 'react';
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
const HongbaoCoverBgImage = require('../../assets/HongBaoAni/HongbaoBg.png');

const INPUT_RANGE = [0, 0.45, 0.47, 1, 1.45, 1.47, 2];

const { width, height : windowHeight } = Dimensions.get('window');

const COVER_WIDTH = 0.94 * width;
const COVER_HEIGHT = COVER_WIDTH / (351/666);

// const BOTTOM_OFFSET = Platform.OS === 'ios' ? -0.6 * COVER_HEIGHT: -0.65 * COVER_HEIGHT;
const BOTTOM_OFFSET =  -0.55 * COVER_HEIGHT;

const CONTAINER_HEIGHT = Platform.OS === 'ios' ? 0.82 * windowHeight: 0.9 * windowHeight;
const CONTAINER_WIDTH = COVER_WIDTH - 28;

export default function HongBaoScreen() {
  const route = useRoute<any>();
  const isFocused = useIsFocused();
  
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, { duration: 2500 });
    // return () => {
    //   progress.value = 0;
    // };
  }, [isFocused]);

  const resetProgress = () => {
    progress.value = 0
    progress.value = withTiming(1, { duration: 2200 });
  }



  const coverAnimatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(progress.value, [0, 0.45,0.47, 1,1.45,1.47, 2], [0, BOTTOM_OFFSET, BOTTOM_OFFSET, 0, BOTTOM_OFFSET, BOTTOM_OFFSET, BOTTOM_OFFSET]);
    const opacity = interpolate(progress.value, [0, 0.2, 1], [0,1, 1,1]);
    return {
      transform: [{ translateY: translateY }],
      opacity: opacity,
      position: 'absolute', 
      width: '100%', 
      height: 3 * windowHeight, 
      bottom: BOTTOM_OFFSET,
    };
  });

  const coverClosedAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(progress.value, INPUT_RANGE, [1,1, 0,0, 0,0,1,1]);
    return {
      opacity: opacity,
      position: 'absolute',
      bottom:0,
      left:16,
    };
  });
  const coverLibAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(progress.value, INPUT_RANGE, [0,0, 1,1,1,1,0,0]);
    return {
      opacity: opacity,
      position: 'absolute',
      bottom:0,
      left: 16
    };
  });
  
  const containerAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(progress.value, [0, 0.46, 0.5, 1,1.46, 1.5,2], [0,0, 1,1,1,0,0,0]);
    const translateY = interpolate(progress.value, INPUT_RANGE, [ 0.8*CONTAINER_HEIGHT, 0.8*CONTAINER_HEIGHT, 0.8*CONTAINER_HEIGHT, 0, 0.8*CONTAINER_HEIGHT, 0.8*CONTAINER_HEIGHT, 0]);
    const height = interpolate(progress.value, INPUT_RANGE, [0,0, CONTAINER_HEIGHT, CONTAINER_HEIGHT, CONTAINER_HEIGHT, CONTAINER_HEIGHT, 0,0]);
    return {
      transform: [{ translateY: translateY }],
      opacity: opacity,
      height, 
      width: CONTAINER_WIDTH, 
      left: 28,
      position: 'absolute', 
      bottom: -1 * BOTTOM_OFFSET, 
    };
  });


  return (
    <View style={{flex: 1, backgroundColor: 'white'}}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView edges={['top']} />
      
      <View className="flex flex-1 justify-end">
        <Animated.View style={coverAnimatedStyle}>
          <Animated.View pointerEvents={'none'} style={coverClosedAnimatedStyle}>
            <Image
              source={HongbaoCoverClosedImage}
              style={{ width: COVER_WIDTH, height:COVER_HEIGHT }}
              resizeMode="contain"
              />
          </Animated.View>
          <Animated.View pointerEvents={'none'} style={coverLibAnimatedStyle}>
            <Image
              source={HongbaoCoverLibImage}
              style={{ width: COVER_WIDTH, height:COVER_HEIGHT }}
              resizeMode="contain"
              />
          </Animated.View>
          <Animated.View style={containerAnimatedStyle}>
            
              <ImageBackground source={HongbaoCoverBgImage} resizeMode="stretch" style={{flex:1, height: CONTAINER_HEIGHT, width: CONTAINER_WIDTH}}>
                <View className='flex-1 m-8 ml-4'>
                  <View style={{flex: 1}}>
                
                <ScrollView 
                  style={{flex:1}} 
                  contentContainerStyle={{paddingHorizontal: 16, paddingBottom: 0.25*CONTAINER_HEIGHT}}
                  showsVerticalScrollIndicator={true}
                  bounces={false}
                  overScrollMode="never"
                  nestedScrollEnabled={true}
                  scrollEventThrottle={16}
                >
                  <TouchableOpacity onPress={() => {
                    progress.value = withTiming(2, { duration: 1000 });
                  }}>
                    <Text>
                      continue
                    </Text>
                  </TouchableOpacity>
                  <View className='h-10 bg-red-500'/>
                <View className='h-10 bg-red-500'/>
                  <TouchableOpacity onPress={resetProgress}>
                    <Text>
                      Reset
                    </Text>
                  </TouchableOpacity>
                  <View className='h-10 bg-red-500'/>
                  <TouchableOpacity onPress={() => {
                    progress.value = withTiming(0.44, { duration: 1000 });
                  }}>
                    <Text>
                      continue
                    </Text>
                  </TouchableOpacity>
                  <View className='h-10 bg-red-500'/>
                <View className='h-10 bg-red-500'/>
                  <TouchableOpacity onPress={resetProgress}>
                    <Text>
                      Reset
                    </Text>
                  </TouchableOpacity>
                  <View className='h-10 bg-red-500'/>
                  <TouchableOpacity onPress={() => {
                    progress.value = withTiming(0.44, { duration: 1000 });
                  }}>
                    <Text>
                      continue
                    </Text>
                  </TouchableOpacity>
                  <View className='h-10 bg-red-500'/>
                <View className='h-10 bg-red-500'/>
                  <TouchableOpacity onPress={resetProgress}>
                    <Text>
                      Reset
                    </Text>
                  </TouchableOpacity>
                  <View className='h-10 bg-red-500'/>
                  <TouchableOpacity onPress={() => {
                    progress.value = withTiming(0.44, { duration: 1000 });
                  }}>
                    <Text>
                      continue
                    </Text>
                  </TouchableOpacity>
                  <View className='h-10 bg-red-500'/>
                <View className='h-10 bg-red-500'/>
                  <TouchableOpacity onPress={resetProgress}>
                    <Text>
                      Reset
                    </Text>
                  </TouchableOpacity>
                  <View className='h-10 bg-red-500'/>
                  <TouchableOpacity onPress={() => {
                    progress.value = withTiming(0.44, { duration: 1000 });
                  }}>
                    <Text>
                      continue
                    </Text>
                  </TouchableOpacity>
                  <View className='h-10 bg-red-500'/>
                <View className='h-10 bg-red-500'/>
                  <TouchableOpacity onPress={resetProgress}>
                    <Text>
                      Reset
                    </Text>
                  </TouchableOpacity>
                  <View className='h-10 bg-red-500'/>
                  <TouchableOpacity onPress={() => {
                    progress.value = withTiming(0.44, { duration: 1000 });
                  }}>
                    <Text>
                      continue
                    </Text>
                  </TouchableOpacity>
                  <View className='h-10 bg-red-500'/>
                <View className='h-10 bg-red-500'/>
                  <TouchableOpacity onPress={resetProgress}>
                    <Text>
                      Reset
                    </Text>
                  </TouchableOpacity>
                  <View className='h-10 bg-red-500'/>
                  <TouchableOpacity onPress={() => {
                    progress.value = withTiming(0.44, { duration: 1000 });
                  }}>
                    <Text>
                      continue
                    </Text>
                  </TouchableOpacity>
                  <View className='h-10 bg-red-500'/>
                <View className='h-10 bg-red-500'/>
                  <TouchableOpacity onPress={resetProgress}>
                    <Text>
                      Reset
                    </Text>
                  </TouchableOpacity>
                  <View className='h-10 bg-red-500'/>
                  <TouchableOpacity onPress={() => {
                    progress.value = withTiming(0.44, { duration: 1000 });
                  }}>
                    <Text>
                      continue
                    </Text>
                  </TouchableOpacity>
                  <View className='h-10 bg-red-500'/>
                <View className='h-10 bg-red-500'/>
                  <TouchableOpacity onPress={resetProgress}>
                    <Text>
                      Reset
                    </Text>
                  </TouchableOpacity>
                  <View className='h-10 bg-red-500'/>
                  <TouchableOpacity onPress={() => {
                    progress.value = withTiming(0.44, { duration: 1000 });
                  }}>
                    <Text>
                      continue
                    </Text>
                  </TouchableOpacity>
                  <View className='h-10 bg-red-500'/>
                <View className='h-10 bg-red-500'/>
                  <TouchableOpacity onPress={resetProgress}>
                    <Text>
                      Reset
                    </Text>
                  </TouchableOpacity>
                  <View className='h-10 bg-red-500'/>
                  <TouchableOpacity onPress={() => {
                    progress.value = withTiming(0.44, { duration: 1000 });
                  }}>
                    <Text>
                      continue
                    </Text>
                  </TouchableOpacity>
                  <View className='h-10 bg-red-500'/>
                <View className='h-10 bg-red-500'/>
                  <TouchableOpacity onPress={resetProgress}>
                    <Text>
                      Reset
                    </Text>
                  </TouchableOpacity>
                  <View className='h-10 bg-red-500'/>
                  <TouchableOpacity onPress={() => {
                    progress.value = withTiming(0.44, { duration: 1000 });
                  }}>
                    <Text>
                      continue
                    </Text>
                  </TouchableOpacity>
                  <View className='h-10 bg-red-500'/>
                <View className='h-10 bg-red-500'/>
                  <TouchableOpacity onPress={resetProgress}>
                    <Text>
                      Reset
                    </Text>
                  </TouchableOpacity>
                  <View className='h-10 bg-red-500'/>

                  
                </ScrollView>
                  </View>
                </View>
              </ImageBackground>
            
          </Animated.View>
          <Animated.View pointerEvents={'none'}  style={coverLibAnimatedStyle}>
            <Image
            source={HongbaoCoverBaseImage}
            style={{ width: COVER_WIDTH, height:COVER_HEIGHT }}
            resizeMode="contain"
            />
          </Animated.View>
        </Animated.View>
      </View>
    </View>
  );
}
