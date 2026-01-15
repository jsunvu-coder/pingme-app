import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Alert,
  TouchableOpacity,
  Keyboard,
  Platform,
  Text,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AuthInput from 'components/AuthInput';
import PrimaryButton from 'components/PrimaryButton';
import NavigationBar from 'components/NavigationBar';
import { t } from 'i18n';
import PaymentAmountView from 'screens/Send/PingMe/PaymentAmountView';
import { BalanceService } from 'business/services/BalanceService';
import WalletAddIcon from 'assets/WalletAddIcon';
import { Utils } from 'business/Utils';
import { GLOBALS, MIN_AMOUNT, TOKEN_NAMES, TOKENS, STABLE_TOKENS } from 'business/Constants';
import { CryptoUtils } from 'business/CryptoUtils';
import { ScrollView } from 'react-native-gesture-handler';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { push } from 'navigation/Navigation';
import { showFlashMessage } from 'utils/flashMessage';
import WithdrawlIcon from 'assets/WithdrawlIcon';
import WarningIcon from 'assets/WarningIcon';

export default function WithdrawScreen() {
  const WALLET_MAX_LENGTH = 42;
  const [amount, setAmount] = useState('');
  const [wallet, setWallet] = useState('');
  const [loading, setLoading] = useState(false);
  const [entry, setEntry] = useState<any>(null);
  const [formY, setFormY] = useState<number | null>(null);
  const [walletInputYInForm, setWalletInputYInForm] = useState<number | null>(null);
  const scrollRef = useRef<any>(null);
  const walletInputRef = useRef<TextInput | null>(null);

  const balanceService = BalanceService.getInstance();

  const setWalletNormalized = useCallback(
    (next: string) => {
      setWallet(next.trim().slice(0, WALLET_MAX_LENGTH));
    },
    [WALLET_MAX_LENGTH]
  );

  useEffect(() => {
    const loadBalance = async () => {
      await balanceService.getBalance();
      const balances = balanceService.balances;
      if (!balances?.length) return;

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

      // Only allow stablecoin balances for withdrawal
      const stablecoinBalances = balances.filter(isStablecoin).filter((b) => getAmount(b) > 0n);
      const selected = stablecoinBalances.length ? bestByAmount(stablecoinBalances) : undefined;

      setEntry(selected);
    };
    loadBalance();
  }, [balanceService]);

  const confirm = async (
    message: string,
    options: { cancel?: boolean; variant?: 'confirm' | 'error'; titleKey?: string } = {}
  ): Promise<boolean> => {
    const { cancel = true, variant = 'confirm', titleKey } = options;
    const title = titleKey
      ? t(titleKey)
      : variant === 'error'
        ? t('ERROR', undefined, 'Error')
        : t('CONFIRM');

    // For informational alerts (no cancel), use flash message instead of blocking alert
    if (!cancel) {
      showFlashMessage({
        title,
        message: t(message),
        type: variant === 'error' ? 'danger' : 'info',
      });
      return true;
    }

    return new Promise((resolve) => {
      Alert.alert(title, t(message), [
        { text: t('CANCEL'), style: 'cancel', onPress: () => resolve(false) },
        { text: t('OK'), onPress: () => resolve(true) },
      ]);
    });
  };

  const handlePasteWallet = async () => {
    try {
      const txt = await Clipboard.getStringAsync();
      if (txt) setWalletNormalized(txt);
    } catch (err) {
      console.error('Failed to paste wallet address:', err);
    }
  };

  const scrollToWalletInput = useCallback(() => {
    if (formY == null || walletInputYInForm == null) return;
    const walletInputY = formY + walletInputYInForm;
    const targetY = Math.max(0, walletInputY - 24);

    requestAnimationFrame(() => {
      setTimeout(
        () => {
          scrollRef.current?.scrollTo?.({ y: targetY, animated: true });
        },
        Platform.OS === 'android' ? 150 : 80
      );
    });
  }, [formY, walletInputYInForm]);

  const handleWithdraw = async () => {
    Keyboard.dismiss();
    setLoading(true);
    try {
      // --- Validation ---
      // entry is already validated as stablecoin in useEffect, just check if it exists
      if (!entry?.amount) {
        await confirm('_ALERT_ABOVE_AVAILABLE', {
          cancel: false,
          variant: 'error',
          titleKey: '_TITLE_ABOVE_AVAILABLE',
        });
        return;
      }

      if (!amount) {
        await confirm('_ALERT_ENTER_AMOUNT', {
          cancel: false,
          variant: 'error',
          titleKey: '_TITLE_ENTER_AMOUNT',
        });
        return;
      }

      const trimmedAmount = amount.trim();
      if (!/^\d*\.?\d*$/.test(trimmedAmount)) {
        await confirm('_ALERT_INVALID_AMOUNT', {
          cancel: false,
          variant: 'error',
          titleKey: '_TITLE_INVALID_AMOUNT',
        });
        return;
      }

      if (!CryptoUtils.isAddr(wallet)) {
        await confirm('_ALERT_INVALID_ADDRESS', { cancel: false, variant: 'error' });
        return;
      }

      const k_min_amount = BigInt(Utils.getSessionObject(GLOBALS)[MIN_AMOUNT]);
      const k_amount = Utils.toMicro(trimmedAmount);
      const k_entry = BigInt(entry.amount);

      if (k_amount < k_min_amount) {
        await confirm('_ALERT_BELOW_MINIMUM', {
          cancel: false,
          variant: 'error',
          titleKey: '_TITLE_BELOW_MINIMUM',
        });
        return;
      }

      if (k_amount > k_entry) {
        await confirm('_ALERT_ABOVE_AVAILABLE', {
          cancel: false,
          variant: 'error',
          titleKey: '_TITLE_ABOVE_AVAILABLE',
        });
        return;
      }

      push('WithdrawConfirmationScreen', {
        amount: trimmedAmount,
        walletAddress: wallet,
        token: entry.tokenAddress ?? entry.token,
        availableAmount: entry.amount,
      });
    } catch (err) {
      console.error('Withdraw failed:', err);
      await confirm('_ALERT_WITHDRAW_FAILED', { cancel: false, variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View className="flex-1 bg-white">
        <NavigationBar title={t('WITHDRAW_FUNDS', undefined, 'Withdraw Funds')} />

        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            ref={scrollRef}
            className="flex-1 px-6"
            keyboardDismissMode={Platform.OS === 'ios' ? 'on-drag' : 'none'}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 140 }}>
            <View className="mt-10 items-center">
              <WithdrawlIcon width={80} height={80} />
              <Text className="mt-6 text-center text-3xl font-bold text-black">
                {t('WITHDRAW_USDC_TITLE', undefined, 'Withdraw USDC to the\naddress below')}
              </Text>
            </View>

            <View className="mt-10 gap-y-8" onLayout={(e) => setFormY(e.nativeEvent.layout.y)}>
              <PaymentAmountView
                balance={`$${balanceService.getStablecoinTotal()}`}
                value={amount}
                onChange={setAmount}
                mode="send"
              />

              <View onLayout={(e) => setWalletInputYInForm(e.nativeEvent.layout.y)}>
                <AuthInput
                  ref={walletInputRef}
                  icon={<WalletAddIcon size={32} color="#000" />}
                  value={wallet}
                  onChangeText={setWalletNormalized}
                  numberOfLines={1}
                  editable={!loading}
                  placeholder={t('WITHDRAW_WALLET_PLACEHOLDER')}
                  maxLength={WALLET_MAX_LENGTH}
                  style={{ paddingRight: 52 }}
                  onFocus={scrollToWalletInput}
                />
                <TouchableOpacity
                  onPress={handlePasteWallet}
                  className="absolute right-0 bottom-10 h-8 items-center justify-center self-end bg-white pl-4">
                  <Ionicons name="clipboard-outline" size={24} color="#FD4912" />
                </TouchableOpacity>
              </View>
            </View>

            <View className="mt-8 flex-row items-start rounded-2xl bg-red-500 p-4">
              <View className="pt-1">
                <WarningIcon color="#ffffff" />
              </View>
              <View className="ml-4 flex-1">
                <Text className="mb-1 text-sm font-bold text-white">
                  {t('WARNING', undefined, 'WARNING')}
                </Text>
                <Text className="text-sm leading-5 text-white">
                  {t(
                    'WITHDRAW_WARNING_BODY',
                    undefined,
                    'Withdrawing USDC to an incorrect address, or one that does not support the Monad Network, may result in irreversible loss of funds.'
                  )}
                </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        <View className="px-6 pb-6">
          <PrimaryButton
            title={t('WITHDRAW')}
            onPress={handleWithdraw}
            loading={loading}
            loadingText={t('PROCESSING')}
          />
          <SafeAreaView edges={['bottom']} />
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
}
