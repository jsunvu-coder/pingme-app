import { useEffect, useRef } from 'react';
import { ScrollView, View, Text, Dimensions, Platform } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { push, setRootScreen } from 'navigation/Navigation';
import PaymentRecipientCard from './PaymentRecipientCard';
import PaymentClaimCard from 'components/PaymentClaimCard';
import SecondaryButton from 'components/ScondaryButton';
import EnvelopIcon from 'assets/EnvelopIcon';
import { SafeAreaView } from 'react-native-safe-area-context';
import SafeBottomView from 'components/SafeBottomView';

const screenHeight = Dimensions.get('window').height;

/* ✅ Define your expected route params */
type PaymentSuccessParams = {
  recipient?: string;
  amount?: number;
  passphrase?: string;
  txHash?: string;
  channel?: string;
  duration?: number;
};

export default function PaymentSuccessScreen() {
  const route = useRoute<RouteProp<Record<string, PaymentSuccessParams>, string>>();
  const hasNavigated = useRef(false);

  const {
    recipient = 'unknown@ping.me',
    amount = 0,
    passphrase = '',
    txHash = '',
    channel = 'Email',
    duration = 7,
  } = route.params || {};

  const showClaimMessage = channel !== 'QR';
  const claimMessage = `Recipient will be notified by email, and have ${duration} days to claim the balance.`;

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasNavigated.current) {
        hasNavigated.current = true;
        push('ShareScreen', {
          amount,
          duration,
          recipient,
          txHash,
          action: 'send',
        });
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [amount, duration, recipient, txHash]);

  const handleBackToHome = () => {
    hasNavigated.current = true;
    setRootScreen(['MainTab']);
  };

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <ScrollView className="px-6 pt-16" showsVerticalScrollIndicator={false}>
        <Header />

        <View className="my-8">
          <PaymentRecipientCard recipient={recipient} amount={amount} />
        </View>

        {showClaimMessage ? (
          passphrase ? (
            <PaymentClaimCard content={claimMessage} passphrase={passphrase} />
          ) : (
            <View className="rounded-2xl bg-white px-6 py-5">
              <Text className="text-lg text-gray-700">{claimMessage}</Text>
            </View>
          )
        ) : null}
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

      <Text className="mt-6 text-3xl font-bold text-black">Payment Successful</Text>
    </View>
  );
};
