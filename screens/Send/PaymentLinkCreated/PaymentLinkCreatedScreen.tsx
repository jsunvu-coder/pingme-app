import { useRoute } from '@react-navigation/native';
import LinkIcon from 'assets/LinkIcon';
import { ScrollView, Text, View } from 'react-native';
import PaymentClaimCard from 'components/PaymentClaimCard';
import PaymentLinkCard from './PaymentLinkCard';
import PaymentLinkButtons from './PaymentLinkButtons';
import { SafeAreaView } from 'react-native-safe-area-context';

type PaymentLinkParams = {
  payLink: string;
  amount: number;
  duration: number;
  passphrase: string;
};

export default function PaymentLinkCreatedScreen() {
  const route = useRoute();
  const { payLink, amount, duration, passphrase } = (route.params as PaymentLinkParams) || {};

  return (
    <View className="flex-1 bg-[#FAFAFA] px-6">
      <SafeAreaView edges={['top']} />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <Header />
        <View className="my-6">
          <PaymentLinkCard
            payLink={payLink}
            amount={amount}
            openLinkVisible={passphrase !== undefined}
          />
        </View>
        {passphrase && (
          <PaymentClaimCard
            passphrase={passphrase}
            content={`Recipient will have ${duration} days to claim.`}
          />
        )}
      </ScrollView>

      <PaymentLinkButtons payLink={payLink} passphrase={passphrase} />
    </View>
  );
}

function Header() {
  return (
    <View className="mt-10 items-center">
      <View className="h-20 w-20 items-center justify-center rounded-full bg-green-50">
        <LinkIcon />
      </View>

      <Text className="mt-6 text-center text-3xl font-bold text-black">Request Link Created</Text>
    </View>
  );
}
