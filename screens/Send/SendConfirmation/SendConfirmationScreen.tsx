import { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, ScrollView, Platform, Keyboard, Animated, Easing } from 'react-native';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';

import ModalContainer from 'components/ModalContainer';
import PrimaryButton from 'components/PrimaryButton';
import { push, setRootScreen } from 'navigation/Navigation';
import WalletSendIcon from 'assets/WalletSendIcon';
import PaymentSummaryCard from './PaymentSummaryCard';
import PassphraseSection from './PassphraseSection';
import CloseButton from 'components/CloseButton';
import { PayService } from 'api/PayService';
import { LOCKBOX_DURATION, TOKENS } from 'business/Constants';
import { BalanceService } from 'business/services/BalanceService';
import { Utils } from 'business/Utils';
import { showLocalizedAlert } from 'components/LocalizedAlert';
import { showFlashMessage } from 'utils/flashMessage';
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
  const [amount, setAmount] = useState<string>('0.00');
  const [recipient, setRecipient] = useState<string>('');
  const [displayAmount, setDisplayAmount] = useState<string>('$0.00');
  const [token, setToken] = useState<string | undefined>(undefined);
  const [lockboxDuration, setLockboxDuration] = useState<number>(LOCKBOX_DURATION);
  const [balancesLoading, setBalancesLoading] = useState(false);
  const allowLockboxEdit = paramLockboxDuration === undefined || paramLockboxDuration === null;

  const balanceService = BalanceService.getInstance();

  // Clear passphrase whenever the toggle is turned off
  useEffect(() => {
    if (!usePassphrase && passphrase) {
      setPassphrase('');
    }
  }, [usePassphrase, passphrase]);

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
    const parseAmount = (
      incoming?: number | string
    ): { amountUsd: string; displayUsd: string } => {
      if (incoming === null || incoming === undefined) {
        return { amountUsd: '0.00', displayUsd: '$0.00' };
      }

      if (typeof incoming === 'number') {
        const normalized = Number.isFinite(incoming) ? incoming.toFixed(2) : '0.00';
        return { amountUsd: normalized, displayUsd: `$${Utils.toCurrency(normalized)}` };
      }

      const normalized = incoming.replace(/,/g, '').replace(/\$/g, '').trim();
      if (!normalized) return { amountUsd: '0.00', displayUsd: '$0.00' };

      // If it includes '.', treat as USD decimal; otherwise treat as micro integer string.
      if (normalized.includes('.')) {
        const formatted = Utils.toCurrency(normalized) || '0.00';
        return { amountUsd: normalized, displayUsd: `$${formatted}` };
      }

      const amountUsd = Utils.formatMicroToUsd(normalized, undefined, {
        grouping: false,
        empty: '0.00',
      });
      const displayUsd = Utils.formatMicroToUsd(normalized, undefined, {
        grouping: true,
        empty: '0.00',
      });
      return { amountUsd, displayUsd: `$${displayUsd}` };
    };

    const parsed = parseAmount(paramAmount);
    setAmount(parsed.amountUsd);
    setDisplayAmount(paramDisplayAmount ?? parsed.displayUsd);
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
  const pickEntry = useCallback((balances: any[] | undefined | null) => {
    if (!balances?.length) return null;
    const hasPositiveBalance = (b: any) => {
      try {
        return BigInt(b?.amount ?? '0') > 0n;
      } catch {
        return false;
      }
    };
    return (
      balances.find((b) => b.token === TOKENS.USDC && hasPositiveBalance(b)) ||
      balances.find((b) => hasPositiveBalance(b)) ||
      balances[0]
    );
  }, []);

  const ensureEntry = useCallback(async () => {
    let candidate = pickEntry(balanceService.balances);
    if (candidate) {
      setEntry(candidate);
      return candidate;
    }

    setBalancesLoading(true);
    try {
      await balanceService.getBalance();
      candidate = pickEntry(balanceService.balances);
      if (candidate) {
        setEntry(candidate);
      }
    } catch (e) {
      console.error('⚠️ Failed to load balances:', e);
    } finally {
      setBalancesLoading(false);
    }

    return candidate;
  }, [balanceService, pickEntry]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const candidate = await ensureEntry();
      if (!mounted) return;
      if (candidate) {
        console.log('🔗 Active token entry:', candidate);
      }
    })();

    return () => {
      mounted = false;
      console.log('🧹 Unsubscribing from balance updates...');
    };
  }, [ensureEntry]);

  // ✅ Main payment handler
  const handleDurationChange = (value: number) => {
    if (Number.isFinite(value)) {
      setLockboxDuration(value);
    }
  };

  const pay = async () => {
    const amountMicro = Utils.toMicro(amount);
    if (amountMicro <= 0n) {
      showFlashMessage({
        title: 'Invalid amount',
        message: 'Payment amount must be greater than 0.',
        type: 'warning',
      });
      return;
    }

    const normalizedPassphrase = passphrase.trim();
    if (usePassphrase && !normalizedPassphrase) {
      showFlashMessage({
        title: 'Passphrase is missing',
        message: 'Please enter a passphrase or disable the passphrase option.',
        type: 'warning',
      });
      return;
    }

    const usableEntry = entry ?? (await ensureEntry());
    if (!usableEntry) {
      showFlashMessage({
        title: 'Loading balances',
        message: 'Balances are still loading. Please wait a moment and try again.',
        type: 'info',
      });
      return;
    }

    const durationDays = Number(lockboxDuration);
    if (!Number.isFinite(durationDays) || durationDays <= 0) {
      showFlashMessage({
        title: 'Invalid duration',
        message: 'Lockbox duration must be greater than 0 days.',
        type: 'warning',
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
          token: usableEntry.token,
          amount: usableEntry.amount,
          tokenName: usableEntry.tokenName,
        },
        username: recipient,
        amount,
        passphrase: normalizedPassphrase,
        days: durationDays,

        // ✅ flexible confirm handler
        confirm: async (msg: string) => {
          const message = Object.prototype.hasOwnProperty.call(enUS, msg)
            ? enUS[msg as keyof typeof enUS]
            : msg;

          const errorMessages = ['_ALERT_ABOVE_AVAILABLE'];
          if (errorMessages.includes(msg)) {
            showFlashMessage({
              title: 'Exceed balance',
              message,
              type: 'warning',
            });
            return true;
          }

          // Show OK-only alerts for info messages
          if (
            !message.toLowerCase().includes('confirm') &&
            !message.toLowerCase().includes('sure')
          ) {
            showFlashMessage({
              title: 'Information',
              message,
              type: 'info',
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
            setRootScreen([
              {
                name: 'PaymentSuccessScreen',
                params: {
                  recipient,
                  amount: Number(amount),
                  passphrase,
                  txHash: hash,
                  channel: params.channel || 'Link',
                  duration: durationDays,
                },
              },
            ]);

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
            setRootScreen([
              {
                name: 'PaymentLinkCreatedScreen',
                params: {
                  amount: Number(amount),
                  passphrase,
                  payLink,
                  duration: durationDays,
                  linkType: 'payment',
                },
              },
            ]);
          }
        },
      });
    } catch (err) {
      console.error('❌ Payment failed:', err);
      showFlashMessage({
        title: 'Payment failed',
        message: 'Something went wrong while processing your payment.',
        type: 'danger',
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
                disabled={loading || balancesLoading}
              />

              <View className="mt-10">
                <PrimaryButton
                  title={params?.channel === 'Email' ? 'Pay Now' : 'Confirm Payment'}
                  onPress={pay}
                  loading={loading || balancesLoading}
                  disabled={loading || balancesLoading || !entry}
                />
              </View>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </ModalContainer>
  );
}
