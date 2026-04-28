import { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Platform,
  Keyboard,
  Animated,
  Easing,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';

import ModalContainer from 'components/ModalContainer';
import PrimaryButton from 'components/PrimaryButton';
import { setRootScreen } from 'navigation/Navigation';
import WalletSendIcon from 'assets/WalletSendIcon';
import PaymentSummaryCard from './PaymentSummaryCard';
import PassphraseSection from './PassphraseSection';
import CloseButton from 'components/CloseButton';
import { PayService } from 'api/PayService';
import { LOCKBOX_DURATION, TOKENS, STABLE_TOKENS } from 'business/Constants';
import { SKIP_PASSPHRASE } from 'business/Config';
import { BalanceService } from 'business/services/BalanceService';
import { Utils } from 'business/Utils';
import { showLocalizedAlert } from 'components/LocalizedAlert';
import { showFlashMessage } from 'utils/flashMessage';
import enUS from 'i18n/en-US.json';
import { PingHistoryStorage } from 'screens/Home/PingHistoryStorage';
import { AccountDataService } from 'business/services/AccountDataService';
import LockboxDurationView from '../PingMe/LockboxDurationView';
import SafeBottomView from 'components/SafeBottomView';
import { useAppDispatch } from 'store/hooks';
import { fetchHistoryToRedux } from 'store/historyThunks';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import usePreventBackFuncAndroid from 'hooks/usePreventBackFuncAndroid';

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
  SendConfirmation: SendConfirmationParams;
};

// `mode` controls the outer wrapper:
// - 'modal': bottom-sheet (transparentModal presentation, used for cold-start /
//   universal links — ModalContainer provides the dim scrim + 120px top gap).
// - 'page' : opaque full-screen page (card presentation, used when opened from
//   inside the app, e.g. Notifications — avoids the prior screen showing
//   through the scrim on Android).
type Props = { mode: 'modal' | 'page' };

export default function SendConfirmationView({ mode }: Props) {
  const route = useRoute<RouteProp<RootStackParamList, 'SendConfirmation'>>();
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
  const [note, setNote] = useState('');
  const allowLockboxEdit = paramLockboxDuration === undefined || paramLockboxDuration === null;
  const prevPassphraseRequired = useRef<boolean>(false);
  const hasNavigated = useRef(false);

  const dispatch = useAppDispatch();
  const balanceService = BalanceService.getInstance();

  useEffect(() => {
    if (!usePassphrase && passphrase) {
      setPassphrase('');
    }
  }, [usePassphrase, passphrase]);

  const passphraseRequired = (() => {
    try {
      if (!entry) return false;
      const tokenAddress = entry?.tokenAddress ?? entry?.token;
      const tokenDecimals = Utils.getTokenDecimals(tokenAddress);
      const amountMicro = Utils.toMicro(amount, tokenDecimals);
      const factor = 10n ** BigInt(tokenDecimals);
      return amountMicro > BigInt(SKIP_PASSPHRASE) * factor;
    } catch {
      return false;
    }
  })();

  useEffect(() => {
    if (passphraseRequired) {
      setUsePassphrase(true);
    } else if (prevPassphraseRequired.current) {
      setUsePassphrase(false);
    }
    prevPassphraseRequired.current = passphraseRequired;
  }, [passphraseRequired]);

  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        const keyboardHeight = e?.endCoordinates?.height ?? 300;
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

  useEffect(() => {
    const parseAmount = (incoming?: number | string): { amountUsd: string; displayUsd: string } => {
      if (incoming === null || incoming === undefined) {
        return { amountUsd: '0.00', displayUsd: '$0.00' };
      }

      if (typeof incoming === 'number') {
        const normalized = Number.isFinite(incoming) ? incoming.toFixed(2) : '0.00';
        return { amountUsd: normalized, displayUsd: `$${Utils.toCurrency(normalized)}` };
      }

      const normalized = incoming.replace(/,/g, '').replace(/\$/g, '').trim();
      if (!normalized) return { amountUsd: '0.00', displayUsd: '$0.00' };

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

  const pickEntry = useCallback((balances: any[] | undefined | null) => {
    if (!balances?.length) return null;
    const getAmount = (b: any) => {
      try {
        return BigInt(b?.amount ?? '0');
      } catch {
        return 0n;
      }
    };

    const stableAddresses = STABLE_TOKENS.map((tokenName) =>
      TOKENS[tokenName as keyof typeof TOKENS]?.toLowerCase()
    ).filter(Boolean);

    const isStablecoin = (b: any) => {
      const tokenAddress = (b?.tokenAddress ?? b?.token ?? '').toString().toLowerCase();
      const tokenName = (b?.tokenName ?? b?.token ?? '').toString().toUpperCase();
      return stableAddresses.includes(tokenAddress) || STABLE_TOKENS.includes(tokenName);
    };

    const bestByAmount = (list: any[]) =>
      list.reduce((best, cur) => (getAmount(cur) > getAmount(best) ? cur : best), list[0]);

    const stablecoinBalances = balances.filter(isStablecoin).filter((b) => getAmount(b) > 0n);
    return stablecoinBalances.length ? bestByAmount(stablecoinBalances) : null;
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

  const handleDurationChange = (value: number) => {
    if (Number.isFinite(value)) {
      setLockboxDuration(value);
    }
  };

  const pay = async () => {
    const isEmailChannel = params?.channel === 'Email';
    if (isEmailChannel && !Utils.isValidEmail(recipient.trim())) {
      showFlashMessage({
        title: 'Invalid recipient',
        message: 'Please provide a valid email address.',
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
    const tokenAddress = usableEntry?.tokenAddress ?? usableEntry?.token;
    const tokenDecimals = Utils.getTokenDecimals(tokenAddress);
    const amountMicro = Utils.toMicro(amount, tokenDecimals);
    if (amountMicro <= 0n) {
      showFlashMessage({
        title: 'Invalid amount',
        message: 'Payment amount must be greater than 0.',
        type: 'warning',
      });
      return;
    }

    const normalizedPassphrase = passphrase.trim();
    if ((usePassphrase || passphraseRequired) && !normalizedPassphrase) {
      showFlashMessage({
        title: 'Passphrase is missing',
        message: passphraseRequired
          ? 'A passphrase is required for amounts over $10.'
          : 'Please enter a passphrase or disable the passphrase option.',
        type: 'warning',
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

    setLoading(true);
    try {
      await PayService.getInstance().pay({
        entry: {
          token: usableEntry.tokenAddress ?? usableEntry.token,
          amount: usableEntry.amount,
          tokenName: usableEntry.tokenName,
        },
        username: recipient,
        amount,
        passphrase: normalizedPassphrase,
        days: durationDays,
        customMessage: isEmailChannel ? note.trim() : '',

        confirm: async (msg: string, okOnly = false) => {
          const resolvedMessage = Object.prototype.hasOwnProperty.call(enUS, msg)
            ? (enUS as Record<string, unknown>)[msg]
            : msg;
          const message =
            typeof resolvedMessage === 'string' ? resolvedMessage : String(resolvedMessage ?? msg);

          const errorMessages = ['_ALERT_ABOVE_AVAILABLE'];
          if (errorMessages.includes(msg)) {
            showFlashMessage({
              title: 'Exceed balance',
              message,
              type: 'warning',
            });
            return true;
          }

          if (okOnly) {
            await showLocalizedAlert({ title: 'Information', message });
            return true;
          }

          if (
            !message.toLowerCase().includes('confirm') &&
            !message.toLowerCase().includes('sure')
          ) {
            showFlashMessage({
              title: 'Information',
              message,
              type: 'info',
            });
            return true;
          }

          return showLocalizedAlert({
            title: 'Confirmation',
            message,
            buttons: [
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => {
                  console.log('❌ Payment canceled by user');
                },
              },
              {
                text: 'OK',
                onPress: () => {
                  console.log('✅ User confirmed payment');
                },
              },
            ],
          });
        },

        setLoading: (loading: boolean) => setLoading(loading),

        setTxHash: async (hash?: string) => {
          if (hash && !hasNavigated.current) {
            console.log('🎉 Payment completed successfully!');
            console.log('✅ Transaction hash:', hash);

            const isEmailChannel = params?.channel === 'Email';

            if (isEmailChannel) {
              hasNavigated.current = true;
              await fetchHistoryToRedux(dispatch);
              setRootScreen([
                {
                  name: 'PaymentSuccessScreen',
                  params: {
                    recipient,
                    amount: Number(amount),
                    passphrase,
                    txHash: hash,
                    channel: 'Email',
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
          }
        },

        setPayLink: (payLink: string) => {
          if (payLink && !hasNavigated.current) {
            console.log('🎉 Payment completed successfully!');
            console.log('✅ PayLink:', payLink);
            hasNavigated.current = true;
            fetchHistoryToRedux(dispatch);
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
      setTimeout(() => {
        setLoading(false);
      }, 2000);
    }
  };

  usePreventBackFuncAndroid(loading);

  const inner = (
    <View className="flex-1 overflow-hidden rounded-t-[24px] bg-[#fafafa]">
      <View className="absolute top-0 right-0 left-0 z-10 bg-[#fafafa] pt-4 pr-4">
        <CloseButton isLoading={loading} />
      </View>

      <Animated.View style={{ flex: 1, transform: [{ translateY }] }}>
        <KeyboardAwareScrollView
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          scrollEnabled={!loading}>
          <View className="px-6 pt-20 pb-8">
            <View className="mt-2 mb-6 items-center">
              <WalletSendIcon />
            </View>

            <Text className="mb-8 text-center text-3xl font-bold text-black">
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
              <View className="mb-3 w-full">
                <LockboxDurationView value={lockboxDuration} onChange={handleDurationChange} />
              </View>
            ) : null}

            <PassphraseSection
              usePassphrase={usePassphrase}
              setUsePassphrase={setUsePassphrase}
              passphrase={passphrase}
              setPassphrase={setPassphrase}
              toggleDisabled={passphraseRequired}
              disabled={loading || balancesLoading}
            />

            {params?.channel === 'Email' && (
              <View className="mt-4">
                <Text className="mb-2 text-xs font-semibold tracking-[1px] text-gray-500">
                  ENTER NOTE
                </Text>
                <TextInput
                  placeholder="Add an optional message for the recipient"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  editable={!loading && !balancesLoading}
                  textAlignVertical="top"
                  maxLength={140}
                  className="min-h-24 rounded-2xl border border-[#E5E7EB] bg-white p-4 text-base text-black"
                  value={note}
                  onChangeText={setNote}
                />
              </View>
            )}

            <View className="mt-10">
              <PrimaryButton
                title={params?.channel === 'Email' ? 'Pay Now' : 'Confirm Payment'}
                onPress={pay}
                loading={loading || balancesLoading}
                disabled={loading || balancesLoading || !entry}
              />
              <SafeBottomView />
            </View>
          </View>
        </KeyboardAwareScrollView>
      </Animated.View>
    </View>
  );

  if (mode === 'page') {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#fafafa' }}>
        <View pointerEvents={loading ? 'none' : 'auto'} style={{ flex: 1 }}>
          {inner}
        </View>
      </SafeAreaView>
    );
  }

  return <ModalContainer loading={loading}>{inner}</ModalContainer>;
}
