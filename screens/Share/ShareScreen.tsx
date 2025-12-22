import { View, Text, ScrollView } from 'react-native';
import { useMemo } from 'react';
import { useRoute, useNavigation } from '@react-navigation/native';
import ModalContainer from 'components/ModalContainer';
import ArrowLeftRightIcon from 'assets/ArrowLeftRightIcon';
import ShareSection from './ShareSection';
import CloseButton from 'components/CloseButton';
import { AdCard } from './AdCard';
import { setRootScreen } from 'navigation/Navigation';

type ShareParams = {
  amount?: number; // for send flow
  duration?: number; // for send flow
  mode?: 'claimed' | 'sent' | 'request';
  amountUsdStr?: string; // for claim flow (preformatted)
  from?: 'login' | 'signup';
  action?: 'send' | 'claim' | 'request' | 'link' | 'withdraw';
  linkType?: 'payment' | 'request';
  closeToRoot?: boolean;
};

export default function ShareScreen() {
  const route = useRoute();
  const navigation = useNavigation<any>();
  const {
    amount = 100.0,
    duration = 2,
    mode,
    amountUsdStr,
    from,
    action,
    linkType,
    closeToRoot,
  } = (route.params as ShareParams) || {};

  const shareAction: NonNullable<ShareParams['action']> = useMemo(() => {
    if (action) return action;
    if (mode === 'claimed') return 'claim';
    if (mode === 'request') return 'request';
    return 'send';
  }, [action, mode]);

  const title = useMemo(() => {
    const amtText = amountUsdStr ?? amount.toFixed(2);
    const durationText = duration ? `${duration} sec` : 'seconds';
    if (shareAction === 'claim') {
      return `Just claimed $${amtText} in ${durationText}!`;
    }
    if (shareAction === 'withdraw') {
      return `Just withdrew $${amtText} with PingMe!`;
    }
    if (shareAction === 'request') {
      return `Requested $${amtText} with PingMe`;
    }
    if (shareAction === 'link') {
      const linkLabel = linkType === 'request' ? 'request' : 'payment';
      return `Share your ${linkLabel} link`;
    }
    return `Just sent $${amtText} in ${durationText}!`;
  }, [amount, amountUsdStr, duration, linkType, shareAction]);

  const description = useMemo(() => {
    if (shareAction === 'claim' && from === 'signup') {
      const amtText = amountUsdStr ?? amount.toFixed(2);
      return `Your account is successfully created.\n$${amtText} has been added to your balance.`;
    }
    if (shareAction === 'request') {
      return 'Share your request so they can pay you instantly.';
    }
    if (shareAction === 'link') {
      const linkLabel = linkType === 'request' ? 'request' : 'payment';
      return `Share this ${linkLabel} link to finish up.`;
    }
    return undefined;
  }, [amount, amountUsdStr, from, linkType, shareAction]);

  const shouldCloseToRoot = closeToRoot ?? shareAction !== 'link';
  const handleClose = () => {
    if (!shouldCloseToRoot && navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    setRootScreen(['MainTab']);
  };

  return (
    <ModalContainer>
      <View className="flex-1 overflow-hidden rounded-t-[24px] bg-[#fafafa]">
        <CloseButton className="mt-6 mr-6 items-end" onPress={handleClose} />

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
