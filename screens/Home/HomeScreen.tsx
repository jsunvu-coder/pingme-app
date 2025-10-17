import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import HeaderView from 'components/HeaderView';
import BalanceView from './BalanceView';
import QuickActionsView from './QuickActionView';
import PingHistoryView from './PingHistoryView';
import { BalanceEntry } from 'business/Types';
import { BalanceService } from 'business/services/BalanceService';

export default function HomeScreen() {
  const [balances, setBalances] = useState<BalanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalBalance, setTotalBalance] = useState('0.00');

  useEffect(() => {
    const balanceService = BalanceService.getInstance();

    balanceService.onBalanceChange((updated) => {
      setBalances(updated);
      setTotalBalance(balanceService.totalBalance); // ✅ always read the cached value
      setLoading(false);
    });

    balanceService.getBalance().finally(() => {
      setTotalBalance(balanceService.totalBalance);
      setLoading(false);
    });
  }, []);

  return (
    <View className="flex-1 bg-[#FD4912]">
      <SafeAreaView edges={['top']} />
      <View className="relative flex-1">
        <View className="absolute right-0 bottom-0 left-0 h-[30%] bg-[#FAFAFA]" />

        <HeaderView title="Home" variant="dark" />

        <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
          <View className="flex-1 justify-end">
            <BalanceView balance={`$${loading ? '0.00' : totalBalance}`} tokens={balances} />
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
