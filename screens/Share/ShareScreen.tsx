import { View, Text, ScrollView } from 'react-native';
import { useRoute } from '@react-navigation/native';
import ModalContainer from 'components/ModalContainer';
import ArrowLeftRightIcon from 'assets/ArrowLeftRightIcon';
import ShareSection from './ShareSection';
import CloseButton from 'components/CloseButton';
import { AdCard } from './AdCard';

type ShareParams = {
  amount?: number; // for send flow
  duration?: number; // for send flow
  mode?: 'claimed' | 'sent';
  amountUsdStr?: string; // for claim flow (preformatted)
  from?: 'login' | 'signup';
};

export default function ShareScreen() {
  const route = useRoute();
  const {
    amount = 100.0,
    duration = 2,
    mode,
    amountUsdStr,
    from,
  } = (route.params as ShareParams) || {};

  const title = (() => {
    if (mode === 'claimed') {
      const amtText = amountUsdStr ?? amount.toFixed(2);
      return `Just claimed $${amtText} in 2 sec!\nWant to flex?`;
    }
    return `Just sent $${amount.toFixed(2)} in 2 sec!`;
  })();

  const description = (() => {
    if (mode === 'claimed' && from === 'signup') {
      const amtText = amountUsdStr ?? amount.toFixed(2);
      return `Your account is successfully created.\n$${amtText} has been added to your balance.`;
    }
    return undefined;
  })();

  return (
    <ModalContainer>
      <View className="flex-1 overflow-hidden rounded-t-[24px] bg-[#fafafa]">
        <CloseButton className="mt-6 mr-6 items-end" />

        <ScrollView className="px-6 pb-10">
          <Header title={title} description={description} />

          <AdCard />

          <ShareSection />
        </ScrollView>
      </View>
    </ModalContainer>
  );
}

const Header = ({ title, description }: { title: string; description?: string }) => {
  return (
    <View className="mt-8 items-center">
      <ArrowLeftRightIcon />
      <Text className="mt-6 text-center text-3xl text-black">{title}</Text>
      {description ? (
        <Text className="mt-3 text-center text-lg text-neutral-700">{description}</Text>
      ) : null}
    </View>
  );
};
