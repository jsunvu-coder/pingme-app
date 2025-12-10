import { ScrollView, View, Text, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState, useCallback } from 'react';
import { goBack, push } from 'navigation/Navigation';
import { HistoryRow } from './HistoryRow';
import FilterDropdown from './FilterDropDown';
import { HistoryFilter, PingHistoryViewModel } from './PingHistoryViewModel';
import { TransactionViewModel } from './TransactionViewModel';
import NavigationBar from 'components/NavigationBar';
import { ContractService } from 'business/services/ContractService';

const vm = new PingHistoryViewModel();

export default function PingHistoryScreen() {
  const [transactions, setTransactions] = useState<TransactionViewModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<HistoryFilter>('all');
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadBatches, setLoadBatches] = useState(0);

  const loadData = async (showSpinner = true, force = false) => {
    if (showSpinner) setLoading(true);
    setLoadBatches(0);
    try {
      const firstPage = await vm.getTransactions({
        force,
        pageSize: 5,
        targetPreload: 25,
        preferFirstPage: true,
        onPhaseUpdate: (txs) => {
          setTransactions(txs);
          setLoading(false); // surface UI as soon as first API pass returns
        },
      });
      setTransactions(firstPage);
    } catch (err) {
      console.error('❌ Failed to load ping history:', err);
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || loadBatches >= 4 || !PingHistoryViewModel.hasMore()) return;
    setLoadingMore(true);
    try {
      const next = await vm.loadMoreChunks(1, 5);
      setLoadBatches((count) => Math.min(count + 1, 4));
      setTransactions(next);
    } catch (err) {
      console.warn('⚠️ Failed to load more history', err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, loadBatches]);

  const onScroll = useCallback(
    (event: any) => {
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      if (!contentSize?.height) return;
      const visibleBottom = contentOffset.y + layoutMeasurement.height;
      const ratio = visibleBottom / contentSize.height;
      if (ratio >= 0.5) {
        void handleLoadMore();
      }
    },
    [handleLoadMore]
  );

  useEffect(() => {
    const commitment = ContractService.getInstance().getCrypto()?.commitment;

    (async () => {
      const cached = await PingHistoryViewModel.loadCachedTransactions(commitment ?? undefined);
      if (cached.length) {
        setTransactions(cached);
        setLoading(false);
      }
      await loadData(!cached.length, true);
    })();
  }, []);

  useEffect(() => {
    const unsubscribe = PingHistoryViewModel.subscribe((txs) => setTransactions(txs));
    return unsubscribe;
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData(true, true);
    setRefreshing(false);
  }, []);

  // 🔍 Use VM helpers to filter and group
  const filteredTransactions = vm.filterTransactions(transactions, filterType);
  const groupedTransactions = vm.groupByDate(filteredTransactions);

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <NavigationBar title="Ping History" />

      <ScrollView
        className="px-6"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: 80 }}
        onScroll={onScroll}
        scrollEventThrottle={16}>
        <View className="my-4">
          <FilterDropdown
            value={filterType}
            onChange={setFilterType}
            options={[
              { label: 'All', value: 'all' },
              { label: 'Sent', value: 'sent' },
              { label: 'Received', value: 'received' },
              { label: 'Deposit', value: 'deposit' },
              { label: 'Withdraw', value: 'withdraw' },
              { label: 'Reclaim', value: 'reclaim' },
            ]}
          />
        </View>

        {loading ? (
          <Text className="mt-20 text-center text-gray-500">Loading history...</Text>
        ) : filteredTransactions.length === 0 ? (
          <Text className="mt-20 text-center text-gray-400">
            No {filterType !== 'all' ? filterType : ''} ping history found.
          </Text>
        ) : (
          Object.entries(groupedTransactions).map(([date, dayEvents]) => {
            const label = typeof date === 'string' ? date.toUpperCase() : '';
            return (
              <View key={label} className="mb-6">
                <Text className="mb-3 font-medium text-gray-400">{label}</Text>

                {Array.isArray(dayEvents) &&
                  dayEvents.map((event, index) => {
                    const key = `${label}-${index}-${event.timestamp}`;
                    return (
                      <HistoryRow
                        key={key}
                        event={event}
                        onPress={() =>
                          push('TransactionDetailsScreen', {
                            transaction: event,
                          })
                        }
                      />
                    );
                  })}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

/* ---------- Header ---------- */
const Header = () => (
  <View className="flex-row items-center justify-between px-6 pt-4">
    <TouchableOpacity onPress={goBack} activeOpacity={0.7}>
      <Ionicons name="chevron-back" size={28} color="#FD4912" />
    </TouchableOpacity>
    <Text className="text-2xl font-semibold text-black">Ping History</Text>
    <View className="w-8" />
  </View>
);
