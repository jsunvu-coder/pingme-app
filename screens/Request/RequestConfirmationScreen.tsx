import { useEffect, useState } from 'react';
import { showLocalizedAlert } from 'components/LocalizedAlert';
import { View, Text, Alert, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';

import ModalContainer from 'components/ModalContainer';
import PrimaryButton from 'components/PrimaryButton';
import { LOCKBOX_DURATION, TOKENS } from 'business/Constants';
import CloseButton from 'components/CloseButton';
import PaymentSummaryCard from './PaymentSummaryCard';
import WalletRequestIcon from 'assets/WalletRequestIcon';
import { SafeAreaView } from 'react-native-safe-area-context';
import { push } from 'navigation/Navigation';
import { BalanceService } from 'business/services/BalanceService';
import { RequestService } from 'api/RequestService';
import enUS from 'i18n/en-US.json';

type RequestConfirmationParams = {
  amount: number;
  displayAmount: string;
  recipient?: string;
  channel: 'Email' | 'Link';
  lockboxDuration?: number;
};

type RootStackParamList = {
  RequestConfirmationScreen: RequestConfirmationParams;
};

export default function RequestConfirmationScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'RequestConfirmationScreen'>>();
  const params = route.params || {};

  const balanceService = BalanceService.getInstance();

  const {
    amount = 0,
    displayAmount = '$0.00',
    recipient = '',
    channel = 'Email',
    lockboxDuration = LOCKBOX_DURATION,
  } = params;

  const [loading, setLoading] = useState(false);
  const [entry, setEntry] = useState<any | null>(null);

  const requestService = RequestService.getInstance();

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        await balanceService.getBalance();
        if (!isMounted) return;

        const balances = balanceService.balances;
        console.log('🔄 Balance update received:', balances);
        if (balances && balances.length > 0) {
          const matched = balances.find((b) => b.token === TOKENS.USDT) || balances[0];
          setEntry(matched);
          console.log('🔗 Active token entry:', matched);
        }
      } catch (e) {
        console.error('⚠️ Failed to load balances:', e);
      }
    })();

    return () => {
      isMounted = false;
      console.log('🧹 Unsubscribing from balance updates...');
    };
  }, [balanceService]);

  // 🔐 Confirm helper (uses LocalizedAlert)
  const confirm = async (msg: string, okOnly = false): Promise<boolean> => {
    if (okOnly) {
      return showLocalizedAlert({ message: msg });
    }
    return showLocalizedAlert({
      message: msg,
      buttons: [
        { text: 'Cancel', style: 'cancel', onPress: () => {} },
        { text: 'Confirm', onPress: () => {} },
      ],
    });
  };

  const handleSendingRequest = async () => {
    if (!amount || Number(amount) <= 0) {
      await showLocalizedAlert({
        title: 'Invalid amount',
        message: 'Payment amount must be greater than 0.',
      });
      return;
    }

    if (channel === 'Email' && (!recipient || !recipient.includes('@'))) {
      await showLocalizedAlert({
        title: 'Invalid recipient',
        message: 'Please provide a valid email address.',
      });
      return;
    }

    setLoading(true);

    try {
      console.log('📨 [RequestConfirmationScreen] Starting requestPayment flow...');

      if (channel === 'Email') {
        await sendByEmail();
      } else {
        await sendByLink();
      }

      console.log('🎉 [RequestConfirmationScreen] Request flow completed.');
    } catch (err) {
      console.error('❌ [RequestConfirmationScreen] requestPayment failed:', err);
      await showLocalizedAlert({
        title: 'Error',
        message: 'Failed to send payment request. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const sendByEmail = async () => {
    await requestService.requestPayment({
      entry,
      requestee: recipient,
      amount: amount.toString(),
      customMessage: '',
      confirm,
      setLoading,
      setSent: (sent) => {
        if (sent) {
          console.log('✅ Request sent successfully!');

          push('RequestSuccessScreen', {
            amount,
            displayAmount,
            recipient,
            channel,
            lockboxDuration,
          });
        }
      },
    });
  };

  const sendByLink = async () => {
    await requestService.requestPaymentByLink({
      entry,
      requestee: recipient,
      amount: amount.toString(),
      customMessage: '',
      confirm,
      setLoading,
      setPayLink: (url) => {
        console.log('✅ Request sent successfully!');
        const durationInDays = Math.ceil(lockboxDuration / 86400);
        push('PaymentLinkCreatedScreen', {
          payLink: url,
          amount,
          duration: durationInDays,
        });
      },
    });
  };

  return (
    <ModalContainer>
      <View className="flex-1 overflow-hidden rounded-t-[24px] bg-[#fafafa]">
        <View className="absolute top-6 right-6 z-10">
          <CloseButton />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'position' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
          style={{ flex: 1 }}>
          <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View className="px-6 pt-10 pb-8">
              <View className="mt-2 mb-6 items-center">
                <WalletRequestIcon />
              </View>

              <Text className="mb-8 text-center text-4xl font-bold text-black">
                You’re about to request a payment
              </Text>

              <PaymentSummaryCard
                amount={displayAmount}
                recipient={recipient}
                lockboxDuration={lockboxDuration}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        <View className="px-6 pb-6">
          <PrimaryButton
            title={channel === 'Email' ? 'Send Payment Request' : 'Confirm Request'}
            loading={loading}
            onPress={handleSendingRequest}
          />
        </View>

        <SafeAreaView edges={['bottom']} />
      </View>
    </ModalContainer>
  );
}
