import { useIsFocused, useRoute } from '@react-navigation/native';
import { RedPocketService } from 'business/services/RedPocketService';
import { Utils } from 'business/Utils';
import PrimaryButton from 'components/PrimaryButton';
import LottieView from 'lottie-react-native';
import { setRootScreen } from 'navigation/Navigation';
import { useEffect, useRef, useState } from 'react';
import { Animated, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getCurrentUserCrypto } from 'utils/claim';
import { HongBaoErrorParams } from './HongBaoErrorScreen';
import { HongBaoSuccessParams } from './HongBaoSuccessScreen';
import usePreventBackFuncAndroid from 'hooks/usePreventBackFuncAndroid';

export type HongBaoVerificationParams = {
  bundle_uuid?: string;
  from?: 'signin' | 'signup';
  message?: string;
};

const navigateToHongBaoSuccess = (
  params: HongBaoSuccessParams = {}
) => {
  setRootScreen([
    {
      name: 'HongBaoSuccessScreen',
      params,
    },
  ]);
};

const navigateToHongBaoError = (params: HongBaoErrorParams) => {
  setRootScreen([
    {
      name: 'HongBaoErrorScreen',
      params,
    },
  ]);
};

export default function HongBaoVerificationScreen() {
  const route = useRoute();
  const { bundle_uuid, from, message } = (route.params as HongBaoVerificationParams) || {};
  const lottieRef = useRef<LottieView>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const slideAnim = useRef(new Animated.Value(100)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [readyToClaim, setReadyToClaim] = useState(false);
  const [showError, setShowError] = useState(false);

  const [displayMessage, setDisplayMessage] = useState(
    message || 'May your wallet and your days stay full ❤️'
  );

  const isFocused = useIsFocused();
  const redPocketService = RedPocketService.getInstance();

  usePreventBackFuncAndroid();

  useEffect(() => {
    const getBundleStatus = async () => {
      if (bundle_uuid && !message) {
        try {
          const bundleStatus = await redPocketService.getBundleStatus(bundle_uuid);
          setDisplayMessage(bundleStatus.message || 'May your wallet and your days stay full ❤️');
          setReadyToClaim(true);
        } catch (error) {
          setShowError(true);
          setReadyToClaim(true);
        }
      } else if (message) {
        setDisplayMessage(message);
        setReadyToClaim(true);
      }
    };
    getBundleStatus();
  }, [bundle_uuid, message]);

  useEffect(() => {
    if (isFocused) {
      return () => {
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
        if (from === 'signup') {
          //verify bundle is claimed
          const bundleStatus = await redPocketService.verifyBundleUuid(bundle_uuid);
          if (!bundleStatus) {
            navigateToHongBaoError({
              isLoggedIn: from !== 'signup',
            });
            return;
          }
        }
        const claimResult = await redPocketService.claimBundle(bundle_uuid);
        if (claimResult.status === 1 || claimResult.status === -1) {
          const username = getCurrentUserCrypto()?.username;
          let amount = claimResult.amount || 0;

          const bundleStatus = await redPocketService.getBundleStatus(bundle_uuid);
          const ranking = bundleStatus.claimed.map((claimed, index) => {
            const isCurrentUser = claimed.username === username;
            if (isCurrentUser) {
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

          navigateToHongBaoSuccess({
            amount: Number(amount),
            amountUsdStr: amountUsdStr,
            ranking,
            remainingCount: bundleStatus.quantity - bundleStatus.claimed.length,
            isClaimed: claimResult.status !== 1,
          });
        } else {
          navigateToHongBaoError({
            isLoggedIn: true,
          });
        }
      } else {
        navigateToHongBaoError({
          isLoggedIn: false,
        });
      }
    } catch (error) {
      navigateToHongBaoError({
        isLoggedIn: from !== 'signup',
      });
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
            {showError ? (
              <>
              <View className="mb-4 rounded-2xl bg-white p-6">
                  <Text className="text-center text-xl font-bold text-[#FD4912]">
                    {'Invalid Hongbao 🧧'}
                  </Text>
                </View>
              <PrimaryButton
                  title="Go Back"
                  onPress={()=>{
                    if(from === 'signup') {
                      setRootScreen(['OnboardingPager']);
                    } else {
                      setRootScreen(['MainTab']);
                    }
                  }}
                  disabled={isLoading}
                  loading={isLoading}
                  loadingText="Claiming..."
                />
              </>
            ) : (
              <>
                <View className="mb-4 rounded-2xl bg-white p-6">
                  <Text className="text-center text-xl font-bold text-[#FD4912]">
                    {displayMessage || 'May your wallet and your days stay full ❤️'}
                  </Text>
                </View>
                <PrimaryButton
                  title="Claim Hongbao"
                  onPress={verifyHongBao}
                  disabled={isLoading}
                  loading={isLoading}
                  loadingText="Claiming..."
                />
              </>
            )}
          </Animated.View>
        )}
      </View>
      <SafeAreaView edges={['bottom']} />
    </View>
  );
}
