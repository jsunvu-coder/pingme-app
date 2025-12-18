import { useEffect, useState } from 'react';
import { showLocalizedAlert } from 'components/LocalizedAlert';
import {
  View,
  Text,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import NetInfo from '@react-native-community/netinfo';

import ModalContainer from 'components/ModalContainer';
import PrimaryButton from 'components/PrimaryButton';
import {
  LOCKBOX_DURATION,
  MAX_PAYMENT_AMOUNT,
  MIN_PAYMENT_AMOUNT,
  TOKEN_NAMES,
  TOKENS,
} from 'business/Constants';
import CloseButton from 'components/CloseButton';
import PaymentSummaryCard from './PaymentSummaryCard';
import WalletRequestIcon from 'assets/WalletRequestIcon';
import { SafeAreaView } from 'react-native-safe-area-context';
import { push, setRootScreen } from 'navigation/Navigation';
import { BalanceService } from 'business/services/BalanceService';
import { RequestService } from 'api/RequestService';
import enUS from 'i18n/en-US.json';
import { Utils } from 'business/Utils';

type RequestConfirmationParams = {
  amount: number | string;
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
          const getAmount = (b: any) => {
            try {
              return BigInt(b?.amount ?? '0');
            } catch {
              return 0n;
            }
          };

          const usdcAddress = TOKENS.USDC.toLowerCase();
          const isUsdc = (b: any) => {
            const tokenAddress = (b?.tokenAddress ?? b?.token ?? '').toString().toLowerCase();
            const tokenName = (b?.tokenName ?? b?.token ?? '').toString().toUpperCase();
            return tokenAddress === usdcAddress || tokenName === TOKEN_NAMES.USDC;
          };

          const bestByAmount = (list: any[]) =>
            list.reduce((best, cur) => (getAmount(cur) > getAmount(best) ? cur : best), list[0]);

          const usdcBalances = balances.filter(isUsdc).filter((b) => getAmount(b) > 0n);
          const positiveBalances = balances.filter((b) => getAmount(b) > 0n);
          const matched =
            (usdcBalances.length ? bestByAmount(usdcBalances) : undefined) ??
            (positiveBalances.length ? bestByAmount(positiveBalances) : undefined) ??
            bestByAmount(balances);

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

    const amountMicro = Utils.toMicro(typeof rawAmount === 'number' ? String(rawAmount) : rawAmount);
    if (amountMicro <= 0n) {
      await showLocalizedAlert({
        title: 'Invalid amount',
        message: 'Please enter a valid payment amount.',
      });
      return;
    }

    const minMicro = BigInt(MIN_PAYMENT_AMOUNT) * Utils.MICRO_FACTOR;
    const maxMicro = BigInt(MAX_PAYMENT_AMOUNT) * Utils.MICRO_FACTOR;
    if (amountMicro < minMicro) {
      await showLocalizedAlert({
        title: 'Amount too low',
        message: `Minimum payment amount is $${MIN_PAYMENT_AMOUNT.toFixed(2)}.`,
      });
      return;
    }

    if (amountMicro > maxMicro) {
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

    try {
      const state = await NetInfo.fetch();
      const reachable = state.isConnected && state.isInternetReachable !== false;
      if (!reachable) {
        await showLocalizedAlert({ message: '_ALERT_NO_INTERNET' });
        return;
      }
    } catch {
      // If NetInfo fails, allow the request attempt to proceed.
    }

    setLoading(true);

    try {
      console.log('📨 [RequestConfirmationScreen] Starting requestPayment flow...');
      const amountDecimal = Utils.formatMicroToUsd(amountMicro, undefined, {
        grouping: false,
        empty: '0.00',
      });

      if (channel === 'Email') {
        await sendByEmail(amountDecimal);
      } else {
        await sendByLink(amountDecimal);
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

  const sendByEmail = async (amountString: string) => {
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

          const displayUsd = Utils.formatMicroToUsd(Utils.toMicro(amountString), undefined, {
            grouping: true,
            empty: '0.00',
          });
          setRootScreen([
            {
              name: 'RequestSuccessScreen',
              params: {
                amount: amountString,
                displayAmount: `$${displayUsd}`,
                recipient,
                channel,
                lockboxDuration,
              },
            },
          ]);
        }
      },
    });
  };

  const sendByLink = async (amountString: string) => {
    if (!entry?.token) {
      await showLocalizedAlert({
        title: 'Select balance',
        message: 'Please wait for balances to load or choose a balance before sending a request.',
      });
      return;
    }

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
        setRootScreen([
          {
            name: 'PaymentLinkCreatedScreen',
            params: {
              payLink: url,
              amount: Number(amountString),
              duration: durationInDays,
              linkType: 'request',
            },
          },
        ]);
      },
    });
  };

  return (
    <ModalContainer>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
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
      </TouchableWithoutFeedback>
    </ModalContainer>
  );
}
