import { useEffect, useRef } from 'react';
import { ScrollView, View, Text, Platform } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { push, setRootScreen } from 'navigation/Navigation';
import SecondaryButton from 'components/ScondaryButton';
import EnvelopIcon from 'assets/EnvelopIcon';
import { SafeAreaView } from 'react-native-safe-area-context';
import SafeBottomView from 'components/SafeBottomView';
import { useAppDispatch } from 'store/hooks';
import { fetchHistoryToRedux } from 'store/historyThunks';

type ClaimSuccessParams = {
  amount?: number;
  amountUsdStr?: string;
  from?: 'login' | 'signup';
  disableAutoShare?: boolean;
  autoShareDelayMs?: number;
  tokenName?: string;
};

export default function ClaimSuccessScreen() {
  const route = useRoute();
  const dispatch = useAppDispatch();
  const hasNavigated = useRef(false);

  const {
    amount = 0,
    amountUsdStr,
    from = 'login',
    disableAutoShare = false,
    autoShareDelayMs = 5000,
    tokenName,
  } = (route.params as ClaimSuccessParams) || {};
  const displayAmount = amountUsdStr ?? amount.toFixed(2);

  // Refresh history in Redux when claim success screen mounts
  useEffect(() => {
    void fetchHistoryToRedux(dispatch);
  }, [dispatch]);

  useEffect(() => {
    if (disableAutoShare) return;
    const timer = setTimeout(() => {
      if (!hasNavigated.current) {
        hasNavigated.current = true;
        // push('ShareScreen', {
        //   mode: 'claimed',
        //   amountUsdStr: displayAmount,
        //   from,
        //   action: 'claim',
        // });
      }
    }, autoShareDelayMs);

    return () => clearTimeout(timer);
  }, [autoShareDelayMs, disableAutoShare, displayAmount, from]);

  const handleBackToHome = () => {
    hasNavigated.current = true;
    setRootScreen(['MainTab']);
  };

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <ScrollView className="px-6 pt-16" showsVerticalScrollIndicator={false}>
        <Header />

        <View className="my-8">
          <ClaimDetails amount={displayAmount} tokenName={tokenName} />
          {displayAmount === '0.00' && (
            <View className="mt-3 ml-4">
              <Text className="text-md mr-1 font-light text-[#FD4912]">
                Amount is too small to display.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <View className="mx-6 my-12">
        <SecondaryButton title="Back to Homepage" onPress={handleBackToHome} />

        <SafeBottomView />
      </View>
    </View>
  );
}

const Header = () => {
  return (
    <View className="mt-16 items-center">
      <EnvelopIcon />

      <Text className="mt-6 text-center text-3xl font-bold text-black">Claim Successful</Text>
      <Text className="mt-3 text-center text-lg text-neutral-700">
        Funds have been added to your balance.
      </Text>
    </View>
  );
};

const ClaimDetails = ({ amount, tokenName }: { amount: string; tokenName?: string }) => (
  <View className="rounded-2xl bg-white px-6 py-8">
    <Text className="text-xl text-gray-800">You claimed a payment</Text>

    <View className="mt-6 flex-row items-center justify-between border-t border-[#FFDBD0] pt-6">
      <Text className="text-lg text-gray-500">Amount</Text>
      {tokenName ? (
        <Text className="mr-1 text-2xl font-semibold">
          {amount} ${tokenName}
        </Text>
      ) : (
        <Text className="mr-1 text-2xl font-semibold">${amount}</Text>
      )}
    </View>
  </View>
);
