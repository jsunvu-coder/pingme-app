import { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, Platform, Keyboard, Animated, Easing } from 'react-native';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';

import ModalContainer from 'components/ModalContainer';
import PrimaryButton from 'components/PrimaryButton';
import { push } from 'navigation/Navigation';
import WalletSendIcon from 'assets/WalletSendIcon';
import PaymentSummaryCard from './PaymentSummaryCard';
import PassphraseSection from './PassphraseSection';
import CloseButton from 'components/CloseButton';
import { PayService } from 'api/PayService';
import { LOCKBOX_DURATION, TOKENS } from 'business/Constants';
import { BalanceService } from 'business/services/BalanceService';
import { showLocalizedAlert } from 'components/LocalizedAlert';
import enUS from 'i18n/en-US.json';
import { PingHistoryStorage } from 'screens/Home/PingHistoryStorage';
import { AccountDataService } from 'business/services/AccountDataService';
import LockboxDurationView from '../PingMe/LockboxDurationView';

type SendConfirmationParams = {
  amount?: number | string;
  displayAmount?: string;
  recipient?: string;
  requester?: string;
  token?: string;
  channel?: 'Email' | 'Link';
  lockboxDuration?: number;
};

type RootStackParamList = {
  SendConfirmationScreen: SendConfirmationParams;
};

export default function SendConfirmationScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'SendConfirmationScreen'>>();
  const params = route.params || {};
  const {
    amount: paramAmount,
    displayAmount: paramDisplayAmount,
    recipient: paramRecipient,
    requester: paramRequester,
    token: paramToken,
    lockboxDuration: paramLockboxDuration,
  } = params;

  const [usePassphrase, setUsePassphrase] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [entry, setEntry] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState<number>(0);
  const [recipient, setRecipient] = useState<string>('');
  const [displayAmount, setDisplayAmount] = useState<string>('$0.00');
  const [token, setToken] = useState<string | undefined>(undefined);
  const [lockboxDuration, setLockboxDuration] = useState<number>(LOCKBOX_DURATION);
  const allowLockboxEdit = paramLockboxDuration === undefined || paramLockboxDuration === null;

  const balanceService = BalanceService.getInstance();

  // 👇 smooth keyboard animation value
  const translateY = useRef(new Animated.Value(0)).current;

  // Smooth show/hide keyboard
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        const keyboardHeight = e.endCoordinates.height || 300;
        Animated.timing(translateY, {
          toValue: -keyboardHeight / 2.2,
          duration: 250,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }).start();
      }
    );

    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        Animated.timing(translateY, {
          toValue: 0,
          duration: 250,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }).start();
      }
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [translateY]);

  // ✅ Parse params (supports internal or deep-link)
  useEffect(() => {
    console.log('[SendConfirmation] Received params:', params);
    const parseAmount = (incoming?: number | string) => {
      const num = Number(incoming) || 0;
      return num >= 1e5 ? num / 1_000_000 : num;
    };

    const rawAmount = parseAmount(paramAmount);
    setAmount(rawAmount);
    setDisplayAmount(paramDisplayAmount ?? `$${rawAmount.toFixed(2)}`);
    setRecipient(paramRecipient || paramRequester || '');
    setToken(paramToken);
    const initialDuration =
      typeof paramLockboxDuration === 'number' && Number.isFinite(paramLockboxDuration)
        ? paramLockboxDuration
        : LOCKBOX_DURATION;
    setLockboxDuration(initialDuration);
  }, [
    paramAmount,
    paramDisplayAmount,
    paramRecipient,
    paramRequester,
    paramToken,
    paramLockboxDuration,
  ]);

  // ✅ Fetch balances and set token entry
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        await balanceService.getBalance();
        if (!mounted) return;

        const balances = balanceService.balances;
        console.log('🔄 Balance update received:', balances);

        if (balances && balances.length > 0) {
          const matched =
            balances.find((b) => b.token === TOKENS.USDC && parseFloat(b.amount) > 0.0) ||
            balances.find((b) => parseFloat(b.amount) > 0.0) ||
            balances[0];
          setEntry(matched);
          console.log('🔗 Active token entry:', matched);
        }
      } catch (e) {
        console.error('⚠️ Failed to load balances:', e);
      }
    })();

    return () => {
      mounted = false;
      console.log('🧹 Unsubscribing from balance updates...');
    };
  }, [balanceService]);

  // ✅ Main payment handler
  const handleDurationChange = (value: number) => {
    if (Number.isFinite(value)) {
      setLockboxDuration(value);
    }
  };

  const pay = async () => {
    if (!amount || Number(amount) <= 0) {
      await showLocalizedAlert({
        title: 'Invalid amount',
        message: 'Payment amount must be greater than 0.',
      });
      return;
    }

    if (!entry) {
      await showLocalizedAlert({
        title: 'Error',
        message: 'No balance entry available for this transaction.',
      });
      return;
    }

    const durationDays = Number(lockboxDuration);
    if (!Number.isFinite(durationDays) || durationDays <= 0) {
      await showLocalizedAlert({
        title: 'Invalid duration',
        message: 'Lockbox duration must be greater than 0 days.',
      });
      return;
    }

    console.log('💳 Starting payment...', {
      token,
      amount,
      displayAmount,
      recipient,
      usePassphrase,
      passphrase,
      entry,
      lockboxDuration: durationDays,
    });

    try {
      setLoading(true);

      await PayService.getInstance().pay({
        entry: {
          token: entry.token,
          amount: entry.amount,
          tokenName: entry.tokenName,
        },
        username: recipient,
        amount: amount.toString(),
        passphrase: passphrase,
        days: durationDays,

        // ✅ flexible confirm handler
        confirm: async (msg: string) => {
          const message = Object.prototype.hasOwnProperty.call(enUS, msg)
            ? enUS[msg as keyof typeof enUS]
            : msg;

          // Show OK-only alerts for info messages
          if (
            !message.toLowerCase().includes('confirm') &&
            !message.toLowerCase().includes('sure')
          ) {
            await showLocalizedAlert({
              title: 'Information',
              message,
              buttons: [{ text: 'OK' }],
            });
            return true; // proceed automatically after OK
          }

          // Show confirmation popup (OK + Cancel)
          return new Promise<boolean>((resolve) => {
            showLocalizedAlert({
              title: 'Confirmation',
              message,
              buttons: [
                {
                  text: 'Cancel',
                  style: 'cancel',
                  onPress: () => {
                    console.log('❌ Payment canceled by user');
                    resolve(false);
                  },
                },
                {
                  text: 'OK',
                  onPress: () => {
                    console.log('✅ User confirmed payment');
                    resolve(true);
                  },
                },
              ],
            });
          });
        },

        setLoading: (loading: boolean) => setLoading(loading),

        setTxHash: (hash?: string) => {
          if (hash) {
            console.log('🎉 Payment completed successfully!');
            console.log('✅ Transaction hash:', hash);
            push('PaymentSuccessScreen', {
              recipient,
              amount,
              passphrase,
              txHash: hash,
              channel: params.channel || 'Link',
              duration: durationDays,
            });

            const userEmail = AccountDataService.getInstance().email ?? '';
            PingHistoryStorage.save(userEmail, {
              status: 'pending',
              email: recipient,
              amount: displayAmount,
              time: new Date().toLocaleString(),
            });
          }
        },

        setPayLink: (payLink: string) => {
          if (payLink) {
            console.log('🎉 Payment completed successfully!');
            console.log('✅ PayLink:', payLink);
            push('PaymentLinkCreatedScreen', {
              amount,
              passphrase,
              payLink,
              duration: durationDays,
              linkType: 'payment',
            });
          }
        },
      });
    } catch (err) {
      console.error('❌ Payment failed:', err);
      await showLocalizedAlert({
        title: 'Payment failed',
        message: 'Something went wrong while processing your payment.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalContainer>
      <View className="flex-1 overflow-hidden rounded-t-[24px] bg-[#fafafa]">
        <View className="absolute top-0 right-0 left-0 z-10 bg-[#fafafa] pt-4 pr-4">
          <CloseButton />
        </View>

        <Animated.View style={{ flex: 1, transform: [{ translateY }] }}>
          <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View className="px-6 pt-20 pb-8">
              <View className="mt-2 mb-6 items-center">
                <WalletSendIcon />
              </View>

              <Text className="mb-8 text-center text-4xl font-bold text-black">
                You're about to send
              </Text>

              <PaymentSummaryCard
                amount={displayAmount}
                recipient={recipient}
                lockboxDuration={
                  Number.isFinite(lockboxDuration) ? lockboxDuration : LOCKBOX_DURATION
                }
              />

              {allowLockboxEdit ? (
                <LockboxDurationView value={lockboxDuration} onChange={handleDurationChange} />
              ) : null}

              <PassphraseSection
                usePassphrase={usePassphrase}
                setUsePassphrase={setUsePassphrase}
                passphrase={passphrase}
                setPassphrase={setPassphrase}
              />

              <View className="mt-10">
                <PrimaryButton
                  title={params?.channel === 'Email' ? 'Pay Now' : 'Confirm Payment'}
                  onPress={pay}
                  loading={loading}
                />
              </View>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </ModalContainer>
  );
}
