import { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';

import ModalContainer from 'components/ModalContainer';
import PrimaryButton from 'components/PrimaryButton';
import WalletSendIcon from 'assets/WalletSendIcon';
import CloseButton from 'components/CloseButton';
import { useDepositFlow, type DepositPayload } from 'screens/Home/Deposit/hooks/useDepositFlow';
import { showLocalizedAlert } from 'components/LocalizedAlert';
import { showFlashMessage } from 'utils/flashMessage';
import { submitDepositTransaction } from 'business/services/DepositQrService';
import enUS from 'i18n/en-US.json';
import { push } from 'navigation/Navigation';
import DollarIcon from 'assets/DollarIcon';
import AuthInput from 'components/AuthInput';
import PaymentAmountView from 'screens/Send/PingMe/PaymentAmountView';
import { BalanceService } from 'business/services/BalanceService';
import PayStaticQrView from './PayStaticQrView';

type PayQrScreenParams = {
  depositPayload?: DepositPayload;
};

const SAMPLE_DEPOSIT_PAYLOAD: DepositPayload = {
  commitment: '0x6b99a49ccb4f88c97f0d7bd7734e91dec1cd58f4e1671f16faefa0d1fb70d8e4',
  amount: '10000000',
  token: undefined,
};

const normalizeDecimal = (value: string) => value.replace(/,/g, '').trim();

export default function PayQrScreen() {
  const route = useRoute<RouteProp<Record<string, PayQrScreenParams>, string>>();
  const depositPayload = route.params?.depositPayload ?? SAMPLE_DEPOSIT_PAYLOAD;

  const {
    balances,
    selectedBalance,
    selectBalance,
    amount,
    setAmount,
    handleAmountBlur,
    commitment,
    setCommitment,
    formatMicroToUsd,
  } = useDepositFlow(depositPayload);

  const [submitting, setSubmitting] = useState(false);

  const showToast = useCallback((messageKey: string) => {
    const resolved =
      messageKey in enUS
        ? (enUS as Record<string, string>)[messageKey as keyof typeof enUS]
        : messageKey;
    showFlashMessage({
      type: 'danger',
      icon: 'danger',
      title: 'Deposit failed',
      message: resolved,
    });
  }, []);

  const handlePayNow = useCallback(async () => {
    const balance = selectedBalance;
    if (!balance) {
      showToast('Please select a balance before continuing.');
      return;
    }

    const normalizedAmount = normalizeDecimal(amount);
    if (!normalizedAmount) {
      showToast('_ALERT_ENTER_AMOUNT');
      return;
    }

    const numericAmount = Number(normalizedAmount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      showToast('_ALERT_ENTER_AMOUNT');
      return;
    }

    const commitmentValue = commitment.trim();
    if (!commitmentValue) {
      showToast('_ALERT_MISSING_COMMITMENT');
      return;
    }

    const confirmed = await showLocalizedAlert({
      title: 'Confirmation',
      message: '_CONFIRM_PAYMENT',
      buttons: [{ text: 'Cancel', style: 'cancel' }, { text: 'Confirm' }],
    });
    if (!confirmed) return;

    try {
      setSubmitting(true);
      const { txHash } = await submitDepositTransaction({
        token: balance.token,
        commitment: commitmentValue,
        amountDecimal: normalizedAmount,
        availableBalance: balance.amount,
      });

      push('PaymentSuccessScreen', {
        recipient: commitmentValue,
        amount: numericAmount,
        passphrase: '',
        txHash,
        channel: 'Deposit',
        duration: 0,
      });
    } catch (error) {
      const message = (error as Error)?.message ?? 'Unable to process deposit.';
      showToast(message);
    } finally {
      setSubmitting(false);
    }
  }, [amount, commitment, selectedBalance, showToast]);

  return (
    <ModalContainer>
      <View className="flex-1 overflow-hidden rounded-t-[24px] bg-[#fafafa]">
        <View className="absolute top-6 right-6 z-10">
          <CloseButton />
        </View>

        <View className="px-6 pt-10 pb-8">
          <ScrollView
            className="mt-8"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 24 }}>
            <View className="mt-12 mb-6 items-center">
              <WalletSendIcon />
            </View>

            <Text className="mb-6 text-center text-3xl font-bold text-black">
              You're about to send
            </Text>

            <PayStaticQrView amount={amount} recipient={commitment} setAmount={setAmount} />
          </ScrollView>
        </View>

        <View className="mx-6 mb-16">
          <PrimaryButton
            title="Pay Now"
            onPress={() => {
              void handlePayNow();
            }}
            loading={submitting}
            loadingText="Processing"
          />
        </View>
      </View>
    </ModalContainer>
  );
}
