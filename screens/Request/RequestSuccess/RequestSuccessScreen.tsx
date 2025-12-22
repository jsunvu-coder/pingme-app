import { useRef } from 'react';
import { ScrollView, View, Text, Platform } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { setRootScreen } from 'navigation/Navigation';
import SecondaryButton from 'components/ScondaryButton';
import EnvelopIcon from 'assets/EnvelopIcon';
import RequestRecipientCard from './RequestRecipientCard';
import { SafeAreaView } from 'react-native-safe-area-context';
import SafeBottomView from 'components/SafeBottomView';

/* ✅ Define your expected route params */
type RequestSuccessParams = {
  recipient?: string;
  amount?: number | string;
  displayAmount?: string;
  passphrase?: string;
  txHash?: string;
  channel?: string;
  duration?: number;
};

export default function RequestSuccessScreen() {
  const route = useRoute<RouteProp<Record<string, RequestSuccessParams>, string>>();
  const hasNavigated = useRef(false);

  const { recipient = '', amount = 0, displayAmount } = route.params || {};

  const handleBackToHome = () => {
    hasNavigated.current = true;
    setRootScreen(['MainTab']);
  };

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <ScrollView className="px-6 pt-16" showsVerticalScrollIndicator={false}>
        <Header />

        <View className="my-8">
          <RequestRecipientCard
            recipient={recipient}
            amount={amount}
            displayAmount={displayAmount}
          />
        </View>
      </ScrollView>

      <View className="mx-6 mb-12">
        <SecondaryButton title="Back to Homepage" onPress={handleBackToHome} />

        <SafeBottomView />
      </View>
    </View>
  );
}

const Header = ({ title = 'Payment Request Sent' }: { title?: string }) => {
  return (
    <View className="mt-16 items-center">
      <EnvelopIcon />

      <Text className="mt-6 text-center text-4xl font-bold text-black">{title}</Text>
    </View>
  );
};
