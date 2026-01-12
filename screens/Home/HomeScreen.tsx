import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StatusBar, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import HeaderView from 'components/HeaderView';
import BalanceView from './BalanceView';
import QuickActionsView from './QuickActionView';
import PingHistoryView from './PingHistoryView';
import { BalanceEntry } from 'business/Types';
import { BalanceService } from 'business/services/BalanceService';
import { AccountDataService } from 'business/services/AccountDataService';
import { showLocalizedAlert } from 'components/LocalizedAlert';
import { PingHistoryViewModel } from './History/List/PingHistoryViewModel';

export default function HomeScreen() {
  const balanceService = useMemo(() => BalanceService.getInstance(), []);
  const accountDataService = useMemo(() => AccountDataService.getInstance(), []);

  const [balances, setBalances] = useState<BalanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalBalance, setTotalBalance] = useState('0.00');

  const confirmTopUp = useCallback((message: string, okOnly = false) => {
    if (okOnly) {
      return showLocalizedAlert({ message });
    }

    return showLocalizedAlert({
      message,
      buttons: [
        { text: 'Cancel', style: 'cancel', onPress: () => {} },
        { text: 'Confirm', onPress: () => {} },
      ],
    });
  }, []);

  useEffect(() => {
    const onUpdate = (updated: BalanceEntry[]) => {
      setBalances(updated);
      setTotalBalance(balanceService.getStablecoinTotal());
      setLoading(false);
    };

    balanceService.onBalanceChange(onUpdate);
    void balanceService.getBalance();
    void accountDataService.updateForwarderBalance(confirmTopUp);

    return () => {
      balanceService.offBalanceChange(onUpdate);
    };
  }, [accountDataService, balanceService, confirmTopUp]);

  useEffect(() => {
    void PingHistoryViewModel.prefetchTransactions({ pageSize: 5, targetPreload: 20 });
  }, []);

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    await balanceService.getBalance();
    await accountDataService.updateForwarderBalance(confirmTopUp);
    setBalances(balanceService.currentBalances);
    setTotalBalance(balanceService.getStablecoinTotal());
    setLoading(false);
  }, [accountDataService, balanceService, confirmTopUp]);

  return (
    <View className="flex-1 bg-[#FD4912]">
      <SafeAreaView edges={['top']} />
      <View className="relative flex-1">
        <View className="absolute right-0 bottom-0 left-0 h-[30%] bg-[#FAFAFA]" />

        <HeaderView title="Home" variant="dark" />

        <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
          <View className="flex-1 justify-end">
            <BalanceView
              balance={`$${loading ? '0.00' : totalBalance}`}
              tokens={balances}
              onRefresh={handleRefresh}
            />
          </View>

          <View className="mt-10 flex-1 rounded-t-3xl bg-[#FAFAFA] px-6 pt-6 pb-12">
            <QuickActionsView />
            <PingHistoryView />
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
