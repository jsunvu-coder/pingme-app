import { useState, useMemo } from 'react';
import { View, Text, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp } from '@react-navigation/native';
import ModalContainer from 'components/ModalContainer';
import CloseButton from 'components/CloseButton';
import PrimaryButton from 'components/PrimaryButton';
import { BalanceService } from 'business/services/BalanceService';
import { ContractService } from 'business/services/ContractService';
import { RecordService } from 'business/services/RecordService';
import { AuthService } from 'business/services/AuthService';
import { CryptoUtils } from 'business/CryptoUtils';
import { Utils } from 'business/Utils';
import { GLOBALS, MIN_AMOUNT } from 'business/Constants';
import { goBack, push } from 'navigation/Navigation';
import { t } from 'i18n';
import WithdrawlIcon from 'assets/WithdrawlIcon';
import { SummaryTitle, SummaryValue } from 'screens/Send/SendConfirmation/PaymentSummaryCard';
import SafeBottomView from 'components/SafeBottomView';

type WithdrawConfirmationParams = {
  amount: string;
  walletAddress: string;
  token: string;
  availableAmount: string;
};

export default function WithdrawConfirmationScreen() {
  const route = useRoute<RouteProp<Record<string, WithdrawConfirmationParams>, string>>();
  const { amount, walletAddress, token, availableAmount } = route.params || {};

  const [loading, setLoading] = useState(false);

  const balanceService = useMemo(() => BalanceService.getInstance(), []);
  const contractService = useMemo(() => ContractService.getInstance(), []);
  const authService = useMemo(() => AuthService.getInstance(), []);
  const recordService = useMemo(() => RecordService.getInstance(), []);

  const numericAmount = useMemo(() => Number(amount), [amount]);
  const formattedAmount = useMemo(() => `$${Utils.toCurrency(amount) || '0.00'}`, [amount]);

  const getLatestWithdrawTxHash = async (params: {
    token: string;
    microAmount: bigint;
    walletAddress: string;
    maxAttempts?: number;
    delayMs?: number;
  }): Promise<string> => {
    const {
      token: tokenParam,
      microAmount,
      walletAddress: walletParam,
      maxAttempts = 10,
      delayMs = 1000,
    } = params;

    const normalizedToken = (tokenParam ?? '').toLowerCase();
    const normalizedWallet = (walletParam ?? '').toLowerCase();
    const expectedAmount = microAmount;

    const commitment = contractService.getCrypto()?.commitment?.toLowerCase?.() ?? '';
    if (!commitment) return '';

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        const ret = await contractService.getEvents(commitment, 10);
        const events = (ret?.events ?? []) as any[];

        const match = events.find((e) => {
          const action = Number(e?.action ?? -1);
          if (action !== 7) return false; // 7 = Withdrawal

          const addr = (e?.addr ?? e?.recipient ?? '').toString().toLowerCase();
          if (normalizedWallet && addr && addr !== normalizedWallet) return false;

          const tokenFromEvent = (e?.token ?? '').toString().toLowerCase();
          if (normalizedToken && tokenFromEvent && tokenFromEvent !== normalizedToken) return false;

          try {
            const amountFromEvent = BigInt((e?.amount ?? '0').toString());
            return amountFromEvent === expectedAmount;
          } catch {
            return false;
          }
        });

        const txHash =
          match?.txHash ??
          match?.tx_hash ??
          match?.transactionHash ??
          match?.transaction_hash ??
          '';
        if (txHash) return txHash;
      } catch (err) {
        console.error('[Withdraw] getLatestWithdrawTxHash failed:', err);
      }

      if (attempt < maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }

    return '';
  };

  const handleConfirm = async () => {
    try {
      setLoading(true);

      const trimmedAmount = amount.trim();
      const minAmount = BigInt(Utils.getSessionObject(GLOBALS)[MIN_AMOUNT]);
      const microAmount = Utils.toMicro(trimmedAmount);
      const available = BigInt(availableAmount);

      if (microAmount < minAmount) {
        Alert.alert(t('NOTICE'), t('_ALERT_BELOW_MINIMUM'));
        return;
      }
      if (microAmount > available) {
        Alert.alert(t('NOTICE'), t('_ALERT_ABOVE_AVAILABLE'));
        return;
      }

      const cr = contractService.getCrypto();
      const nextCurrentSalt = CryptoUtils.globalHash(cr.current_salt);
      if (!nextCurrentSalt) throw new Error('Failed to generate next current salt');
      const nextProof = CryptoUtils.globalHash2(cr.input_data, nextCurrentSalt);
      if (!nextProof) throw new Error('Failed to generate next proof');
      const nextCommitment = CryptoUtils.globalHash(nextProof);
      if (!nextCommitment) throw new Error('Failed to generate next commitment');
      const commitmentHash = CryptoUtils.globalHash(nextCommitment);
      if (!commitmentHash) throw new Error('Failed to generate commitment hash');

      const result = await authService.commitProtect(
        () =>
          contractService.withdraw(
            token,
            microAmount.toString(),
            cr.proof,
            nextCommitment,
            walletAddress
          ),
        cr.commitment,
        commitmentHash
      );

      cr.current_salt = nextCurrentSalt;
      cr.proof = nextProof;
      cr.commitment = nextCommitment;
      contractService.setCrypto(cr);

      await balanceService.getBalance();
      await recordService.updateRecordNow();

      const fallbackTxHash =
        (result as any)?.txHash ??
        (result as any)?.tx_hash ??
        (result as any)?.transactionHash ??
        '';
      const txHash =
        (await getLatestWithdrawTxHash({
          token,
          microAmount,
          walletAddress,
        })) || fallbackTxHash;

      push('WithdrawSuccessScreen', {
        amount: numericAmount || 0,
        walletAddress,
        txHash,
      });
    } catch (err) {
      console.error('Withdraw confirm failed:', err);
      Alert.alert(t('ERROR', undefined, 'Error'), t('_ALERT_WITHDRAW_FAILED'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalContainer>
      <View className="flex-1 overflow-hidden rounded-t-[24px] bg-[#fafafa]">
        <View className="absolute top-6 right-6 z-10">
          <CloseButton
            iconSize={36}
            onPress={() => {
              if (loading) return;
              goBack();
            }}
          />
        </View>

        <SafeAreaView />

        <View className="px-6 pt-12 pb-8">
          <View className="items-center">
            <WithdrawlIcon width={80} height={80} />
            <Text className="mt-8 text-center text-3xl font-bold text-black">
              {t('WITHDRAW_CONFIRM_TITLE', undefined, "You're about to\nwithdraw")}
            </Text>
          </View>

          <View className="mt-10 rounded-2xl bg-white px-6 py-6">
            <View className="mb-3 flex-row items-center justify-between">
              <SummaryTitle>Amount</SummaryTitle>
              <SummaryValue>{formattedAmount}</SummaryValue>
            </View>

            <View className="mb-3 flex-row items-center justify-between">
              <SummaryTitle>{t('WALLET_ADDRESS', undefined, 'Wallet Address')}</SummaryTitle>
              <SummaryValue numberOfLines={0}>{walletAddress}</SummaryValue>
            </View>
          </View>
        </View>

        <View className="mx-6 mb-12">
          <PrimaryButton
            title={t('CONFIRM_WITHDRAWAL', undefined, 'Confirm Withdrawal')}
            onPress={handleConfirm}
            loading={loading}
            loadingText={t('PROCESSING', undefined, 'Processing...')}
          />
          <SafeBottomView />
        </View>
      </View>
    </ModalContainer>
  );
}
