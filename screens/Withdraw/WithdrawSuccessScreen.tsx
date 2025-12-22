import { useEffect, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp } from '@react-navigation/native';
import { push, setRootScreen } from 'navigation/Navigation';
import SecondaryButton from 'components/ScondaryButton';
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import { showFlashMessage } from 'utils/flashMessage';
import { Utils } from 'business/Utils';
import { t } from 'i18n';
import DoubleCheckIcon from 'assets/DoubleCheckIcon';
import { SummaryTitle, SummaryValue } from 'screens/Send/SendConfirmation/PaymentSummaryCard';
import { ENV } from 'business/Config';

type RouteParams = {
  amount?: number;
  walletAddress?: string;
  txHash?: string;
};

export default function WithdrawSuccessScreen() {
  const route = useRoute<RouteProp<Record<string, RouteParams>, string>>();
  const { amount = 0, walletAddress = '', txHash = '' } = (route.params || {}) as RouteParams;
  const hasNavigated = useRef(false);

  const formattedAmount = useMemo(() => {
    const numeric = Number(amount);
    if (!Number.isFinite(numeric)) return '$0.00';
    return `$${Utils.toCurrency(numeric) || numeric.toFixed(2)}`;
  }, [amount]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (hasNavigated.current) return;
      hasNavigated.current = true;
      push('ShareScreen', {
        amount: Number(amount) || 0,
        duration: 2,
        action: 'withdraw',
        closeToRoot: false,
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, [amount]);

  const handleViewDetails = async () => {
    if (!txHash) return;
    const normalizedHash = txHash.trim().replace(/[^\da-fA-Fx]/g, '');
    const baseUrl =
      ENV === 'staging' ? 'https://testnet.monadvision.com' : 'https://monadvision.com';
    const url = `${baseUrl}/tx/${normalizedHash}`;

    try {
      await WebBrowser.openBrowserAsync(url);
    } catch (err) {
      console.error('Open tx details failed:', err);
      await Clipboard.setStringAsync(normalizedHash);
      showFlashMessage({
        title: t('ERROR', undefined, 'Error'),
        message: t('TX_HASH_COPIED', undefined, 'Unable to open link. Transaction hash copied.'),
        type: 'danger',
      });
    }
  };

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <ScrollView className="px-6 pt-16" showsVerticalScrollIndicator={false}>
        <Header />

        <View className="my-8 rounded-2xl bg-white px-6 py-8">
          <Text className="text-lg text-gray-800">
            {t('WITHDRAW_SUCCESS_BODY', undefined, 'Your withdrawal has been sent to')}{' '}
            <Text className="font-semibold">{walletAddress || 'wallet'}</Text>
          </Text>

          <View className="mt-6 h-px bg-[#FFDBD0]" />

          <View className="mt-6 mb-4 flex-row items-center justify-between">
            <SummaryTitle>{t('TOTAL_AMOUNT', undefined, 'Total Amount')}</SummaryTitle>
            <SummaryValue>{formattedAmount}</SummaryValue>
          </View>

          <View className="mb-3 flex-row items-center justify-between">
            <SummaryTitle>{t('TRANSACTION_HASH', undefined, 'Transaction Hash')}</SummaryTitle>
            <SummaryValue>
              <TouchableOpacity
                disabled={!txHash}
                onPress={handleViewDetails}
                className="flex-row items-center"
                activeOpacity={0.8}>
                <Text className="mr-1 text-sm font-semibold text-[#FD4912]">
                  {t('VIEW_DETAILS', undefined, 'View Details')}
                </Text>
                <Ionicons name="open-outline" size={16} color="#FD4912" />
              </TouchableOpacity>
            </SummaryValue>
          </View>
        </View>
      </ScrollView>

      <View className="mx-6 my-12">
        <SecondaryButton
          title="Back to Homepage"
          onPress={() => {
            hasNavigated.current = true;
            setRootScreen(['MainTab']);
          }}
        />
      </View>
    </View>
  );
}

const Header = () => (
  <View className="mt-16 items-center">
    <DoubleCheckIcon />
    <Text className="mt-6 text-3xl font-bold text-black">
      {t('WITHDRAWAL_SUCCESSFUL', undefined, 'Withdrawal Successful')}
    </Text>
  </View>
);
