import { useEffect, useState, useRef } from 'react';
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
  STABLE_TOKENS,
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
import SafeBottomView from 'components/SafeBottomView';
import { useAppDispatch, useCurrentAccountStablecoinBalance } from 'store/hooks';
import { fetchHistoryToRedux } from 'store/historyThunks';

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
  const dispatch = useAppDispatch();

  const balanceService = BalanceService.getInstance();
  const { stablecoinEntries } = useCurrentAccountStablecoinBalance();

  const scrollRef = useRef<ScrollView>(null);
  const noteInputRef = useRef<TextInput>(null);

  const {
    amount = 0,
    displayAmount = '$0.00',
    recipient = '',
    channel = 'Email',
    lockboxDuration = LOCKBOX_DURATION,
  } = params;

  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState('');
  const [disabledInput, setDisabledInput] = useState(false);

  const requestService = RequestService.getInstance();

  // Get first entry from stablecoinEntries (already sorted by amount descending)
  const entry = stablecoinEntries && stablecoinEntries.length > 0 ? stablecoinEntries[0] : null;

  useEffect(() => {
    balanceService.getBalance().catch((e) => {
      console.error('⚠️ Failed to load balances:', e);
    });
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
    try {
      setLoading(true);
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

      if (!entry?.token) {
        await showLocalizedAlert({
          title: 'You must select a balance',
          message: 'Please select a balance to proceed.',
        });
        return;
      }
      const tokenAddress = entry.token;
      const tokenDecimals = Utils.getTokenDecimals(tokenAddress);
      const amountMicro = Utils.toMicro(
        typeof rawAmount === 'number' ? String(rawAmount) : rawAmount,
        tokenDecimals
      );
      if (amountMicro <= 0n) {
        await showLocalizedAlert({
          title: 'Invalid amount',
          message: 'Please enter a valid payment amount.',
        });
        return;
      }

      const factor = 10n ** BigInt(tokenDecimals);
      const minMicro = BigInt(MIN_PAYMENT_AMOUNT) * factor;
      const maxMicro = BigInt(MAX_PAYMENT_AMOUNT) * factor;
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

      try {
        console.log('📨 [RequestConfirmationScreen] Starting requestPayment flow...');
        const tokenAddress = entry?.token;
        const tokenDecimals = Utils.getTokenDecimals(tokenAddress);
        const amountDecimal = Utils.formatMicroToUsd(
          amountMicro,
          undefined,
          {
            grouping: false,
            empty: '0.00',
          },
          tokenDecimals
        );

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
      }
    } finally {
      setTimeout(() => {
        setLoading(false);
      }, 3000);
    }
  };

  const sendByEmail = async (amountString: string) => {
    await requestService.requestPayment({
      entry,
      requestee: recipient,
      amount: amountString,
      customMessage: note.trim(),
      confirm,
      setDisabledInput: setDisabledInput,
      setSent: async (sent) => {
        if (sent) {
          console.log('✅ Request sent successfully!');
          // Refresh history in Redux to show the new request transaction
          await fetchHistoryToRedux(dispatch);

          const tokenAddress = entry?.token;
          const tokenDecimals = Utils.getTokenDecimals(tokenAddress);
          const displayUsd = Utils.formatMicroToUsd(
            Utils.toMicro(amountString, tokenDecimals),
            undefined,
            {
              grouping: true,
              empty: '0.00',
            },
            tokenDecimals
          );
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
            <CloseButton isLoading={loading} />
          </View>

          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}>
            <ScrollView
              ref={scrollRef}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 140 }}
              scrollEnabled={!loading}>
              <View className="px-6 pt-10 pb-8">
                <View className="mt-2 mb-6 items-center">
                  <WalletRequestIcon />
                </View>

                <Text className="mb-8 text-center text-3xl font-bold text-black">
                  You’re about to request a payment
                </Text>

                <PaymentSummaryCard
                  amount={displayAmount}
                  recipient={recipient}
                  lockboxDuration={lockboxDuration}
                />

                {channel === 'Email' && (
                  <View className="mt-1">
                    <Text className="mb-2 text-xs font-semibold tracking-[1px] text-gray-500">
                      ENTER NOTE
                    </Text>
                    <TextInput
                      ref={noteInputRef}
                      placeholder="Add an optional message for your request"
                      placeholderTextColor="#9CA3AF"
                      multiline
                      editable={!disabledInput}
                      textAlignVertical="top"
                      maxLength={240}
                      className="min-h-[96px] rounded-2xl border border-[#E5E7EB] bg-white p-4 text-base text-black"
                      value={note}
                      onChangeText={setNote}
                      onFocus={() => {
                        setTimeout(() => {
                          noteInputRef.current?.measureLayout(scrollRef.current as any, (_x, y) => {
                            scrollRef.current?.scrollTo({
                              y: Math.max(0, y - 24),
                              animated: true,
                            });
                          });
                        }, 300); // wait for keyboard animation
                      }}
                    />
                  </View>
                )}
              </View>
            </ScrollView>
          </KeyboardAvoidingView>

          <View className="px-6 pb-6">
            <PrimaryButton
              title={channel === 'Email' ? 'Send Payment Request' : 'Confirm Request'}
              loading={loading}
              disabled={loading}
              onPress={handleSendingRequest}
            />
            <SafeBottomView />
          </View>

          <SafeAreaView edges={['bottom']} />
        </View>
      </TouchableWithoutFeedback>
    </ModalContainer>
  );
}
