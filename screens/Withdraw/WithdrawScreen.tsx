import { useState, useEffect } from 'react';
import { View, Alert, TouchableOpacity, Keyboard, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AuthInput from 'components/AuthInput';
import PrimaryButton from 'components/PrimaryButton';
import NavigationBar from 'components/NavigationBar';
import { t } from 'i18n';
import PaymentAmountView from 'screens/Send/PingMe/PaymentAmountView';
import { BalanceService } from 'business/services/BalanceService';
import { ContractService } from 'business/services/ContractService';
import { RecordService } from 'business/services/RecordService';
import WalletAddIcon from 'assets/WalletAddIcon';
import { Utils } from 'business/Utils';
import { GLOBALS, MIN_AMOUNT } from 'business/Constants';
import { CryptoUtils } from 'business/CryptoUtils';
import { ScrollView } from 'react-native-gesture-handler';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { push } from 'navigation/Navigation';
import { showFlashMessage } from 'utils/flashMessage';

export default function WithdrawScreen() {
  const [amount, setAmount] = useState('');
  const [wallet, setWallet] = useState('');
  const [loading, setLoading] = useState(false);
  const [entry, setEntry] = useState<any>(null);

  const balanceService = BalanceService.getInstance();
  const contractService = ContractService.getInstance();
  const recordService = RecordService.getInstance();

  useEffect(() => {
    const loadBalance = async () => {
      await balanceService.getBalance();
      const balances = balanceService.balances;
      if (balances && balances.length > 0) setEntry(balances[0]);
    };
    loadBalance();
  }, []);

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
      if (txt) setWallet(txt.trim());
    } catch (err) {
      console.error('Failed to paste wallet address:', err);
    }
  };

  const handleWithdraw = async () => {
    Keyboard.dismiss();
    setLoading(true);
    try {
      // --- Validation ---
      if (!entry?.amount) {
        await confirm('_ALERT_SELECT_BALANCE', { cancel: false, variant: 'error' });
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
      } else if (k_amount > k_entry) {
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
        token: entry.token,
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
    <View className="flex-1 bg-white">
      <NavigationBar title={t('WITHDRAW')} />

      <ScrollView className="flex-1 px-6">
        <View className="mt-10 gap-y-8">
          <PaymentAmountView
            balance={`$${balanceService.totalBalance}`}
            value={amount}
            onChange={setAmount}
            mode="send"
          />

          <View>
            <AuthInput
              icon={<WalletAddIcon size={32} color="#000" />}
              value={wallet}
              onChangeText={setWallet}
              numberOfLines={1}
              editable={!loading}
              placeholder={t('WITHDRAW_WALLET_PLACEHOLDER')}
              style={Platform.OS === 'android' ? { paddingRight: 44 } : undefined}
            />
            <TouchableOpacity
              onPress={handlePasteWallet}
              className="absolute right-0 bottom-10 h-8 items-center justify-center self-end bg-white pl-4">
              <Ionicons name="clipboard-outline" size={24} color="#FD4912" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

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
  );
}
