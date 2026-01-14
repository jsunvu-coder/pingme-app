import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';

import ModalContainer from 'components/ModalContainer';
import PrimaryButton from 'components/PrimaryButton';
import WalletSendIcon from 'assets/WalletSendIcon';
import CloseButton from 'components/CloseButton';
import { useDepositFlow, type DepositPayload } from 'screens/Home/Deposit/hooks/useDepositFlow';
import { push, setRootScreen } from 'navigation/Navigation';
import PayStaticQrView from './PayStaticQrView';
import SafeBottomView from 'components/SafeBottomView';
import { useAppDispatch } from 'store/hooks';
import { fetchHistoryToRedux } from 'store/historyThunks';

type PayQrConfirmationScreenParams = {
  depositPayload?: DepositPayload;
  commitment?: string;
  amount?: string;
  token?: string;
};

const SAMPLE_DEPOSIT_PAYLOAD: DepositPayload = {
  commitment: '0x6b99a49ccb4f88c97f0d7bd7734e91dec1cd58f4e1671f16faefa0d1fb70d8e4',
  amount: '10000000',
  token: undefined,
};

const normalizeDecimal = (value: string) => value.replace(/,/g, '').trim();

export default function PayQrConfirmationScreen() {
  const route = useRoute<RouteProp<Record<string, PayQrConfirmationScreenParams>, string>>();
  const depositPayload = useMemo(() => {
    if (route.params?.depositPayload) {
      return route.params.depositPayload;
    }
    if (route.params?.commitment) {
      return {
        commitment: route.params.commitment,
        amount: route.params.amount,
        token: route.params.token,
      };
    }
    return SAMPLE_DEPOSIT_PAYLOAD;
  }, [route.params]);

  const dispatch = useAppDispatch();
  const { amount, setAmount, commitment, withdrawAndDeposit, loading, txHash, scanned } =
    useDepositFlow(depositPayload);

  const [acknowledgedHash, setAcknowledgedHash] = useState<string | null>(null);
  const isNavigatingRef = useRef(false);

  const handlePayNow = useCallback(async () => {
    await withdrawAndDeposit();
  }, [withdrawAndDeposit]);

  useEffect(() => {
    // Guard: only proceed if we have a txHash, haven't acknowledged it yet, and aren't already navigating
    if (!txHash || txHash === acknowledgedHash || isNavigatingRef.current) return;

    const handleSuccess = async () => {
      // Mark navigation as in progress immediately to prevent race conditions
      isNavigatingRef.current = true;
      // Set acknowledgedHash immediately to prevent re-running if dependencies change
      setAcknowledgedHash(txHash);

      try {
        const normalizedAmount = normalizeDecimal(amount);
        const numericAmount = Number(normalizedAmount);
        const safeAmount = Number.isFinite(numericAmount) ? Number(numericAmount.toFixed(2)) : 0;

        // Refresh history in Redux to show the new deposit transaction
        await fetchHistoryToRedux(dispatch);

        // Navigate to success screen
        setRootScreen([
          {
            name: 'PaymentSuccessScreen',
            params: {
              recipient: commitment.trim() || 'unknown',
              amount: safeAmount,
              passphrase: '',
              txHash,
              channel: 'QR',
              duration: 0,
            },
          },
        ]);
      } catch (error) {
        console.error('[PayQrConfirmationScreen] Error in handleSuccess:', error);
        // Reset flags on error so user can retry
        isNavigatingRef.current = false;
        setAcknowledgedHash(null);
      }
    };

    void handleSuccess();
  }, [amount, commitment, txHash, acknowledgedHash, dispatch]);

  return (
    <ModalContainer>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View className="flex-1 overflow-hidden rounded-t-[24px] bg-[#fafafa]">
          <View className="absolute top-6 right-6 z-10">
            <CloseButton isLoading={loading} />
          </View>

          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}>
            <View className="flex-1 px-6 pt-10 pb-8">
              <ScrollView
                keyboardShouldPersistTaps="handled"
                className="mt-8"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 24 }}
                scrollEnabled={!loading}>
                <View className="mt-12 mb-6 items-center">
                  <WalletSendIcon />
                </View>

                <Text className="mb-6 text-center text-3xl font-bold text-black">
                  You're about to send
                </Text>

                <PayStaticQrView
                  amount={amount}
                  recipient={commitment}
                  setAmount={setAmount}
                  scanned={scanned}
                />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>

          <View className="mx-6 mb-16">
            <PrimaryButton
              title="Pay Now"
              onPress={() => {
                void handlePayNow();
              }}
              loading={loading}
              disabled={loading}
              loadingText="Processing"
            />
            <SafeBottomView />
          </View>
        </View>
      </TouchableWithoutFeedback>
    </ModalContainer>
  );
}
