import { Text, View, Animated } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { useRoute } from '@react-navigation/native';
import { push } from 'navigation/Navigation';
import { SafeAreaView } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
import PrimaryButton from 'components/PrimaryButton';

type HongBaoVerificationParams = {
  bundle_uuid?: string;
  email?: string;
  password?: string;
};

export default function HongBaoVerificationScreen() {
  const route = useRoute();
  const { bundle_uuid, email, password } = (route.params as HongBaoVerificationParams) || {};
  const lottieRef = useRef<LottieView>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const slideAnim = useRef(new Animated.Value(100)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Show button after 2 seconds with animation
    const timer = setTimeout(() => {
      setShowButton(true);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }, 1700);

    return () => clearTimeout(timer);
  }, []);

  const verifyHongBao = async () => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Mock verification result
      const isValid = Math.random() > 0.1; // 70% success rate for testing

      if (isValid) {
        // Success - navigate to success screen
        push('HongBaoSuccessScreen', {
          amount: 20.0,
          amountUsdStr: '20.00',
          ranking: [
            { rank: 1, email: 'chris...@icloud.com', amount: '$25.00' },
            { rank: 2, email: 'anna2...@gmail.com', amount: '$22.00' },
            { rank: 3, email: 'YOU', amount: '$20.00', isCurrentUser: true },
            { rank: 4, email: 'kai_c...@gmail.com', amount: '$9.00' },
            { rank: 5, email: 'emily...@hotmail.com', amount: '$8.00' },
          ],
          remainingCount: 5,
        });
        setIsLoading(false);
      } else {
        // Failed - navigate to error screen
        push('HongBaoErrorScreen', {
          bundle_uuid,
        });
        setIsLoading(false);
      }
    } catch (error) {
        
    }finally {
      setTimeout(() => setIsLoading(false), 2000);
    }
  };

  return (
    <View className="flex-1 bg-[#F5E9E1]">
      <SafeAreaView edges={['top']} />
      <View className="flex-1 items-center justify-center">
        {/* Lottie Animation - HongBao claiming animation */}
        <LottieView
          ref={lottieRef}
          source={require('../../assets/HongBaoAni/receive_claim.json')}
          autoPlay
          loop={false}
          style={{ width: '100%', height: '100%' }}
        />

        {showButton && (
          <Animated.View 
            className='absolute bottom-16 w-full px-10'
            style={{
              transform: [{ translateY: slideAnim }],
              opacity: fadeAnim,
              position: 'absolute',
              bottom: 70,
              width: '100%',
              paddingHorizontal: 40,
            }}
          >
            <View className='mb-4 rounded-2xl bg-white p-6'>
              <Text className='text-center text-xl font-bold text-[#FD4912]'>
              May your wallet and your days stay full ❤️
              </Text>
            </View>
            <PrimaryButton
              title='Claim Hongbao'
              onPress={verifyHongBao}
              disabled={isLoading}
              loading={isLoading}
              loadingText='Verifying...'
            />
          </Animated.View>
        )}
      </View>
      <SafeAreaView edges={['bottom']} />
    </View>
  );
}
