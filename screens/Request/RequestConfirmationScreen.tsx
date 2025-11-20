import { useEffect, useState } from 'react';
import { showLocalizedAlert } from 'components/LocalizedAlert';
import { View, Text, ScrollView, Platform, KeyboardAvoidingView, TextInput } from 'react-native';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';

import ModalContainer from 'components/ModalContainer';
import PrimaryButton from 'components/PrimaryButton';
import { LOCKBOX_DURATION, MAX_PAYMENT_AMOUNT, MIN_PAYMENT_AMOUNT, TOKENS } from 'business/Constants';
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
  const [note, setNote] = useState('');

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
          const matched = balances.find((b) => b.token === TOKENS.USDC) || balances[0];
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
    const rawAmount: number | string = amount as number | string;
    const isAmountMissing =
      rawAmount === undefined ||
      rawAmount === null ||
      (typeof rawAmount === 'string' && rawAmount.trim() === '');

    if (isAmountMissing) {
      await showLocalizedAlert({
        title: 'Amount required',
        message: 'Please input an amount.',
      });
      return;
    }

    const numericAmount = Number(rawAmount);
    if (!Number.isFinite(numericAmount)) {
      await showLocalizedAlert({
        title: 'Invalid amount',
        message: 'Please enter a valid payment amount.',
      });
      return;
    }

    const roundedAmount = Math.round(numericAmount * 100) / 100;
    if (roundedAmount < MIN_PAYMENT_AMOUNT) {
      await showLocalizedAlert({
        title: 'Amount too low',
        message: `Minimum payment amount is $${MIN_PAYMENT_AMOUNT.toFixed(2)}.`,
      });
      return;
    }

    if (roundedAmount > MAX_PAYMENT_AMOUNT) {
      await showLocalizedAlert({
        title: 'Amount too high',
        message: `Maximum payment amount is $${MAX_PAYMENT_AMOUNT.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}.`,
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
        await sendByEmail(roundedAmount);
      } else {
        await sendByLink(roundedAmount);
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

  const sendByEmail = async (validatedAmount: number) => {
    const amountString = validatedAmount.toFixed(2);
    await requestService.requestPayment({
      entry,
      requestee: recipient,
      amount: amountString,
      customMessage: note.trim(),
      confirm,
      setLoading,
      setSent: (sent) => {
        if (sent) {
          console.log('✅ Request sent successfully!');

          push('RequestSuccessScreen', {
            amount: validatedAmount,
            displayAmount: `$${validatedAmount.toFixed(2)}`,
            recipient,
            channel,
            lockboxDuration,
          });
        }
      },
    });
  };

  const sendByLink = async (validatedAmount: number) => {
    const amountString = validatedAmount.toFixed(2);
    await requestService.requestPaymentByLink({
      entry,
      requestee: recipient,
      amount: amountString,
      customMessage: note.trim(),
      confirm,
      setLoading,
      setPayLink: (url) => {
        console.log('✅ Request sent successfully!');
        const durationInDays = Math.ceil(lockboxDuration / 86400);
        push('PaymentLinkCreatedScreen', {
          payLink: url,
          amount: validatedAmount,
          duration: durationInDays,
          linkType: 'request',
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

              {channel === 'Email' ? (
                <View className="mt-1">
                  <Text className="mb-2 text-xs font-semibold tracking-[1px] text-gray-500">
                    ENTER NOTE
                  </Text>
                  <TextInput
                    placeholder="Add an optional message for your request"
                    placeholderTextColor="#9CA3AF"
                    multiline
                    textAlignVertical="top"
                    maxLength={240}
                    className="min-h-[96px] rounded-2xl border border-[#E5E7EB] bg-white p-4 text-base text-black"
                    value={note}
                    onChangeText={setNote}
                  />
                </View>
              ) : null}
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
