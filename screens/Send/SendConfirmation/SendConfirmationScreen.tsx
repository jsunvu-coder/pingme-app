import { useEffect, useState } from 'react';
import { showLocalizedAlert } from 'components/LocalizedAlert';
import { View, Text, ScrollView, Platform, KeyboardAvoidingView, Alert } from 'react-native';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';

import ModalContainer from 'components/ModalContainer';
import PrimaryButton from 'components/PrimaryButton';
import { push } from 'navigation/Navigation';
import WalletSendIcon from 'assets/WalletSendIcon';
import PaymentSummaryCard from './PaymentSummaryCard';
import PassphraseSection from './PassphraseSection';

import { PayService } from 'api/PayService';
import { LOCKBOX_DURATION, TOKENS } from 'business/Constants';
import { BalanceService } from 'business/services/BalanceService';
import CloseButton from 'components/CloseButton';
import enUS from 'i18n/en-US.json';

type SendConfirmationParams = {
  amount: number;
  displayAmount: string;
  recipient?: string;
  channel: 'Email' | 'Link';
  lockboxDuration?: number;
};

type RootStackParamList = {
  SendConfirmationScreen: SendConfirmationParams;
};

export default function SendConfirmationScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'SendConfirmationScreen'>>();
  const params = route.params;

  const [usePassphrase, setUsePassphrase] = useState(true);
  const [passphrase, setPassphrase] = useState('1234');
  const [entry, setEntry] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const balanceService = BalanceService.getInstance();

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        await balanceService.getBalance();
        if (!isMounted) return;

        const balances = balanceService.balances;
        console.log('🔄 Balance update received:', balances);
        if (balances && balances.length > 0) {
          const matched =
            balances
              .filter((b) => parseFloat(b.amount) > 0.0)
              .find((b) => b.token === TOKENS.USDT) || balances[0];
          setEntry(matched);
          console.log('🔗 Active token entry:', matched);
        }
      } catch (e) {
        console.error('⚠️ Failed to load balances:', e);
      }
    })();

    return () => {
      isMounted = false;
      console.log('🧹 Unsubscribing from balance updates...');
    };
  }, [balanceService]);

  const pay = async () => {
    if (!params) {
      await showLocalizedAlert({ title: 'Error', message: 'Missing transaction details.' });
      return;
    }

    const { amount, displayAmount, recipient, channel, lockboxDuration } = params;

    if (!amount || Number(amount) <= 0) {
      await showLocalizedAlert({
        title: 'Invalid amount',
        message: 'Payment amount must be greater than 0.',
      });
      return;
    }

    if (channel === 'Email' && (!recipient || !recipient.includes('@'))) {
      await showLocalizedAlert({
        title: 'Missing recipient',
        message: 'Please provide a valid email address.',
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

    console.log('💳 Starting payment...', {
      amount,
      displayAmount,
      recipient,
      channel,
      lockboxDuration,
      usePassphrase,
      passphrase,
      entry,
    });

    try {
      setLoading(true);
      await PayService.getInstance().pay({
        entry: {
          token: entry.token,
          amount: entry.amount,
          tokenName: entry.tokenName,
        },
        username: recipient || '',
        amount: amount.toString(),
        passphrase: passphrase || '',
        days: lockboxDuration || LOCKBOX_DURATION,
        confirm: async (msg: string, okOnly?: boolean) => {
          const message = Object.prototype.hasOwnProperty.call(enUS, msg)
            ? enUS[msg as keyof typeof enUS]
            : msg;
          await showLocalizedAlert({ title: 'Confirmation', message });
          return true;
        },
        setLoading: (loading: boolean) => setLoading(loading),
        setTxHash: (hash?: string) => {
          if (hash) {
            console.log('✅ Transaction hash:', hash);

            push('PaymentSuccessScreen', {
              recipient,
              amount: Number(amount),
              passphrase,
              txHash: hash,
              channel,
              duration: lockboxDuration || LOCKBOX_DURATION,
            });
          }
        },
        setPayLink: (paylink?: string) => {
          if (paylink) {
            console.log('✅ PayLink:', paylink);

            push('PaymentLinkCreatedScreen', {
              amount: Number(amount),
              passphrase,
              paylink,
              duration: lockboxDuration || LOCKBOX_DURATION,
            });
          }
        },
      });

      console.log('🎉 Payment completed successfully!');
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
        <View className="absolute top-6 right-6 z-10">
          <CloseButton />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'position' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
          style={{ flex: 1 }}>
          <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View className="px-6 pt-10 pb-8">
              <View className="mt-2 mb-6 items-center">
                <WalletSendIcon />
              </View>

              <Text className="mb-8 text-center text-4xl font-bold text-black">
                You're about to send
              </Text>

              <PaymentSummaryCard
                amount={params?.displayAmount ?? '$0.00'}
                recipient={params?.recipient ?? 'N/A'}
                lockboxDuration={params?.lockboxDuration ?? LOCKBOX_DURATION}
              />

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
        </KeyboardAvoidingView>
      </View>
    </ModalContainer>
  );
}
