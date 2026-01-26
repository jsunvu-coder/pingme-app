import { useIsFocused, useRoute } from '@react-navigation/native';
import { RedPocketService } from 'business/services/RedPocketService';
import { Utils } from 'business/Utils';
import PrimaryButton from 'components/PrimaryButton';
import LottieView from 'lottie-react-native';
import { push } from 'navigation/Navigation';
import { useEffect, useRef, useState } from 'react';
import { Animated, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getCurrentUserCrypto } from 'utils/claim';

export type HongBaoVerificationParams = {
  bundle_uuid?: string;
};

export default function HongBaoVerificationScreen() {
  const route = useRoute();
  const { bundle_uuid } = (route.params as HongBaoVerificationParams) || {};
  const lottieRef = useRef<LottieView>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const slideAnim = useRef(new Animated.Value(100)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [readyToClaim, setReadyToClaim] = useState(false);
  const [message, setMessage] = useState('');

  const isFocused = useIsFocused();
  const redPocketService = RedPocketService.getInstance();

  useEffect(() => {
    const getBundleStatus = async () => {
      if (bundle_uuid) {
        const bundleStatus = await redPocketService.getBundleStatus(bundle_uuid);
          setMessage(bundleStatus.message || 'May your wallet and your days stay full ❤️');
          setReadyToClaim(true);
      }
    };
    getBundleStatus();
  }, [bundle_uuid]);

  useEffect(() => {
    if (isFocused) {
      return () => {
        setMessage('');
        setReadyToClaim(false);
      };
    }
  }, [isFocused]);

  // Start looping animation from 0-40 when not ready
  useEffect(() => {
    if (!readyToClaim) {
      lottieRef.current?.play(0, 42);
    }
  }, []);

  // Play once when ready
  useEffect(() => {
    if (readyToClaim) {
      lottieRef.current?.play(0);
    }
  }, [readyToClaim]);

  useEffect(() => {
    if (readyToClaim) {
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
    }
  }, [readyToClaim]);

  const verifyHongBao = async () => {
    setIsLoading(true);
    try {
      if (bundle_uuid) {
        const claimResult = await redPocketService.claimBundle(bundle_uuid);
        if (claimResult.status === 1 ||claimResult.status === -1) {
          const username = getCurrentUserCrypto()?.username;
          let amount = claimResult.amount || 0;
          
          const bundleStatus = await redPocketService.getBundleStatus(bundle_uuid);
          const ranking = bundleStatus.claimed.map((claimed, index) => {
            const isCurrentUser = claimed.username === username;
            if(isCurrentUser){
                amount = claimed.amount;
            }
            return {
              rank: index + 1,
              username: isCurrentUser ? 'YOU' : claimed.username,
              amount: Utils.formatMicroToUsd(
                claimed.amount,
                undefined,
                { grouping: false, empty: '' },
                tokenDecimals
              ),
              isCurrentUser: claimed.username === username,
            };
          });

          const tokenDecimals = Utils.getTokenDecimals(claimResult.token);
          const amountUsdStr = Utils.formatMicroToUsd(
            amount.toString(),
            undefined,
            { grouping: false, empty: '' },
            tokenDecimals
          );

          push('HongBaoSuccessScreen', {
            amount,
            amountUsdStr: amountUsdStr,
            ranking,
            remainingCount: bundleStatus.quantity - bundleStatus.claimed.length,
            isClaimed: claimResult.status !== 1,
          });
        } else {
          push('HongBaoErrorScreen');
        }
      }
    } catch (error) {
      push('HongBaoErrorScreen');
    } finally {
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
          autoPlay={false}
          loop={false}
          onAnimationFinish={() => {
            if (!readyToClaim) {
              lottieRef.current?.play(0, 42);
            }
          }}
          style={{ width: '100%', height: '100%' }}
        />

        {showButton && (
          <Animated.View
            className="absolute bottom-16 w-full px-10"
            style={{
              transform: [{ translateY: slideAnim }],
              opacity: fadeAnim,
              position: 'absolute',
              bottom: 70,
              width: '100%',
              paddingHorizontal: 40,
            }}>
            <View className="mb-4 rounded-2xl bg-white p-6">
              <Text className="text-center text-xl font-bold text-[#FD4912]">
                {message}
              </Text>
            </View>
            <PrimaryButton
              title="Claim Hongbao"
              onPress={verifyHongBao}
              disabled={isLoading}
              loading={isLoading}
              loadingText="Claiming..."
            />
          </Animated.View>
        )}
      </View>
      <SafeAreaView edges={['bottom']} />
    </View>
  );
}
