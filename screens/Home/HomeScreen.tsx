import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import HeaderView from 'components/HeaderView';
import BalanceView from './BalanceView';
import QuickActionsView from './QuickActionView';
import PingHistoryView from './PingHistoryView';
import { BalanceEntry } from 'business/Types';
import { BalanceService } from 'business/services/BalanceService';
import { AccountDataService } from 'business/services/AccountDataService';
import { showLocalizedAlert } from 'components/LocalizedAlert';
import { useAppDispatch, useCurrentAccountStablecoinBalance } from 'store/hooks';
import { fetchRecentHistoryToRedux } from 'store/historyThunks';
import { useFocusEffect } from '@react-navigation/native';

export default function HomeScreen() {
  const dispatch = useAppDispatch();
  const balanceService = useMemo(() => BalanceService.getInstance(), []);
  const accountDataService = useMemo(() => AccountDataService.getInstance(), []);
  const { stablecoinBalance: totalBalance } = useCurrentAccountStablecoinBalance();

  const [balances, setBalances] = useState<BalanceEntry[]>([]);
  const [loading, setLoading] = useState(true);

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
      setLoading(false);
    };

    balanceService.onBalanceChange(onUpdate);
    void balanceService.getBalance();
    void accountDataService.updateForwarderBalance(confirmTopUp);

    return () => {
      balanceService.offBalanceChange(onUpdate);
    };
  }, [accountDataService, balanceService, confirmTopUp]);

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    await fetchRecentHistoryToRedux(dispatch); // Only fetch 5 most recent items
    await balanceService.getBalance();
    await accountDataService.updateForwarderBalance(confirmTopUp);
    setBalances(balanceService.currentBalances);
    setLoading(false);
  }, [accountDataService, balanceService, confirmTopUp, dispatch]);

  // Auto-refresh when screen is focused (including first mount)
  useFocusEffect(
    useCallback(() => {
      void handleRefresh();
    }, [handleRefresh])
  );

  return (
    <View className="flex-1 bg-[#FD4912]">
      <SafeAreaView edges={['top']} />
      <View className="relative flex-1">
        <View className="absolute right-0 bottom-0 left-0 h-[30%] bg-[#FAFAFA]" />

        <HeaderView title="Home" variant="dark" />

        <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
          <View className="flex-1 justify-end">
            <BalanceView
              balance={`$${totalBalance || '0.00'}`}
              tokens={balances}
              onRefresh={handleRefresh}
            />
          </View>

          <View className="mt-10 flex-1 rounded-t-3xl bg-[#FAFAFA] pt-6 pb-12">
            <QuickActionsView />
            <PingHistoryView />
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
