import { useState, useMemo } from 'react';
import { View, Text, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp } from '@react-navigation/native';
import ModalContainer from 'components/ModalContainer';
import CloseButton from 'components/CloseButton';
import PrimaryButton from 'components/PrimaryButton';
import SecondaryButton from 'components/ScondaryButton';
import { BalanceService } from 'business/services/BalanceService';
import { ContractService } from 'business/services/ContractService';
import { RecordService } from 'business/services/RecordService';
import { AuthService } from 'business/services/AuthService';
import { CryptoUtils } from 'business/CryptoUtils';
import { Utils } from 'business/Utils';
import { GLOBALS, MIN_AMOUNT } from 'business/Constants';
import { push, setRootScreen } from 'navigation/Navigation';
import { t } from 'i18n';

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

  const handleCancel = () => {
    setRootScreen(['MainTab']);
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
            cr.salt,
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
      await recordService.updateRecord();

      const txHash =
        (result as any)?.txHash ??
        (result as any)?.tx_hash ??
        (result as any)?.transactionHash ??
        '';

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
          <CloseButton />
        </View>

        <SafeAreaView />

        <View className="px-6 pt-16 pb-8">
          <Text className="mb-6 text-center text-3xl font-bold text-black">
            {t('WITHDRAW')}
          </Text>

          <View className="rounded-2xl bg-white p-6">
            <Text className="text-lg text-gray-500">Amount</Text>
            <Text className="mt-2 text-3xl font-semibold text-black">${numericAmount.toFixed(2)}</Text>

            <View className="mt-6 h-px bg-[#F1F1F1]" />

            <Text className="mt-6 text-lg text-gray-500">Wallet Address</Text>
            <Text className="mt-2 text-lg text-black" numberOfLines={2}>
              {walletAddress}
            </Text>
          </View>
        </View>

        <View className="mx-6 mb-12">
          <PrimaryButton title={t('CONFIRM')} onPress={handleConfirm} loading={loading} />
          <View className="mt-3">
            <SecondaryButton title={t('CANCEL')} onPress={handleCancel} />
          </View>
        </View>
      </View>
    </ModalContainer>
  );
}
