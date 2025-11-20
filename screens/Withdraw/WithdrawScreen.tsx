import { useState, useEffect } from 'react';
import { View, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AuthInput from 'components/AuthInput';
import PrimaryButton from 'components/PrimaryButton';
import NavigationBar from 'components/NavigationBar';
import { t } from 'i18n';
import PaymentAmountView from 'screens/Send/PingMe/PaymentAmountView';
import { BalanceService } from 'business/services/BalanceService';
import { ContractService } from 'business/services/ContractService';
import { RecordService } from 'business/services/RecordService';
import { AuthService } from 'business/services/AuthService';
import WalletAddIcon from 'assets/WalletAddIcon';
import { Utils } from 'business/Utils';
import { GLOBALS, MIN_AMOUNT } from 'business/Constants';
import { CryptoUtils } from 'business/CryptoUtils';
import { ScrollView } from 'react-native-gesture-handler';

export default function WithdrawScreen() {
  const [amount, setAmount] = useState('');
  const [wallet, setWallet] = useState('');
  const [loading, setLoading] = useState(false);
  const [entry, setEntry] = useState<any>(null);

  const balanceService = BalanceService.getInstance();
  const contractService = ContractService.getInstance();
  const authService = AuthService.getInstance();
  const recordService = RecordService.getInstance();

  useEffect(() => {
    const loadBalance = async () => {
      await balanceService.getBalance();
      const balances = balanceService.balances;
      if (balances && balances.length > 0) setEntry(balances[0]);
    };
    loadBalance();
  }, []);

  const confirm = async (message: string, cancel = true): Promise<boolean> => {
    return new Promise((resolve) => {
      Alert.alert(
        t('CONFIRM'),
        t(message),
        cancel
          ? [
              { text: t('CANCEL'), style: 'cancel', onPress: () => resolve(false) },
              { text: t('OK'), onPress: () => resolve(true) },
            ]
          : [{ text: t('OK'), onPress: () => resolve(true) }]
      );
    });
  };

  const _withdraw = async (
    token: string,
    amt: string,
    recipient: string,
    nextCurrentSalt: string,
    nextProof: string,
    nextCommitment: string
  ): Promise<void> => {
    const cr = contractService.getCrypto();
    const ret = await contractService.withdraw(
      token,
      amt,
      cr.proof,
      cr.salt,
      nextCommitment,
      recipient
    );
    cr.current_salt = nextCurrentSalt;
    cr.proof = nextProof;
    cr.commitment = nextCommitment;
    contractService.setCrypto(cr);

    await balanceService.getBalance();
    await recordService.updateRecord();
    return ret;
  };

  const handleWithdraw = async () => {
    try {
      // --- Validation ---
      if (!entry?.amount) {
        await confirm('_ALERT_SELECT_BALANCE', false);
        return;
      }
      if (!amount) {
        await confirm('_ALERT_ENTER_AMOUNT', false);
        return;
      }

      const k_min_amount = BigInt(Utils.getSessionObject(GLOBALS)[MIN_AMOUNT]);
      const k_amount = Utils.toMicro(amount);
      const k_entry = BigInt(entry.amount);

      if (k_amount < k_min_amount) {
        await confirm('_ALERT_BELOW_MINIMUM', false);
        return;
      } else if (k_amount > k_entry) {
        await confirm('_ALERT_ABOVE_AVAILABLE', false);
        return;
      }

      if (!CryptoUtils.isAddr(wallet)) {
        await confirm('_ALERT_INVALID_ADDRESS', false);
        return;
      }

      const ok = await confirm('_CONFIRM_WITHDRAW');
      if (!ok) return;

      setLoading(true);

      // --- Prepare crypto commit chain ---
      const cr = contractService.getCrypto();
      const nextCurrentSalt = CryptoUtils.globalHash(cr.current_salt);
      if (!nextCurrentSalt) throw new Error('Failed to generate next current salt');
      const nextProof = CryptoUtils.globalHash2(cr.input_data, nextCurrentSalt);
      if (!nextProof) throw new Error('Failed to generate next proof');
      const nextCommitment = CryptoUtils.globalHash(nextProof);
      if (!nextCommitment) throw new Error('Failed to generate next commitment');

      const commitmentHash = CryptoUtils.globalHash(nextCommitment);
      if (!commitmentHash) throw new Error('Failed to generate commitment hash');
      // --- Execute commit-protected withdraw ---
      await authService.commitProtect(
        () =>
          _withdraw(
            entry.token,
            k_amount.toString(),
            wallet,
            nextCurrentSalt,
            nextProof,
            nextCommitment
          ),
        cr.commitment,
        commitmentHash
      );

      await balanceService.getBalance();
      await recordService.updateRecord();

      Alert.alert(t('SUCCESS'), 'Withdrawal successful');
    } catch (err) {
      console.error('Withdraw failed:', err);
      await confirm('_ALERT_WITHDRAW_FAILED', false);
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

          <AuthInput
            icon={<WalletAddIcon size={32} color="#000" />}
            value={wallet}
            onChangeText={setWallet}
            placeholder={t('WITHDRAW_WALLET_PLACEHOLDER')}
          />
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
