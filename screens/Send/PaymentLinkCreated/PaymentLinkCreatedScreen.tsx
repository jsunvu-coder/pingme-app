import { useRoute } from '@react-navigation/native';
import LinkIcon from 'assets/LinkIcon';
import { ScrollView, Text, View } from 'react-native';
import PaymentClaimCard from 'components/PaymentClaimCard';
import PaymentLinkCard from './PaymentLinkCard';
import PaymentLinkButtons from './PaymentLinkButtons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useRef } from 'react';
import { push } from 'navigation/Navigation';

type PaymentLinkParams = {
  payLink: string;
  amount: number;
  duration: number;
  passphrase?: string;
  linkType?: 'payment' | 'request';
};

export default function PaymentLinkCreatedScreen() {
  const route = useRoute();
  const { payLink, amount, duration, passphrase, linkType: rawLinkType } =
    (route.params as PaymentLinkParams) || {};
  const linkType: 'payment' | 'request' =
    rawLinkType ?? (passphrase !== undefined ? 'payment' : 'request');
  const hasNavigated = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (hasNavigated.current) return;
      hasNavigated.current = true;
      push('ShareScreen', {
        amount,
        duration,
        action: linkType === 'request' ? 'request' : 'link',
        linkType,
        closeToRoot: false,
      });
    }, 3000);

    return () => clearTimeout(timer);
  }, [amount, duration, linkType]);

  return (
    <View className="flex-1 bg-[#FAFAFA] px-6">
      <SafeAreaView edges={['top']} />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <Header linkType={linkType} />
        <View className="my-6">
          <PaymentLinkCard
            payLink={payLink}
            amount={amount}
            openLinkVisible={passphrase !== undefined}
            linkType={linkType}
          />
        </View>
        {passphrase && (
          <PaymentClaimCard
            passphrase={passphrase}
            content={`Recipient will have ${duration} days to claim.`}
          />
        )}
      </ScrollView>

      <PaymentLinkButtons payLink={payLink} passphrase={passphrase} linkType={linkType} />
    </View>
  );
}

function Header({ linkType }: { linkType: 'payment' | 'request' }) {
  const heading = linkType === 'payment' ? 'Payment Link Created' : 'Request Link Created';
  return (
    <View className="mt-10 items-center">
      <View className="h-20 w-20 items-center justify-center rounded-full bg-green-50">
        <LinkIcon />
      </View>

      <Text className="mt-6 text-center text-3xl font-bold text-black">{heading}</Text>
    </View>
  );
}
