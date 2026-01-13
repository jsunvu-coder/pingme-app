import { useFocusEffect } from '@react-navigation/native';
import NavigationBar from 'components/NavigationBar';
import { push } from 'navigation/Navigation';
import { useCallback, useMemo, useState } from 'react';
import { Platform, RefreshControl, SectionList, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  fetchHistoryToRedux,
  fetchRecentHistoryToRedux,
  loadInitialHistoryToRedux,
  loadMoreHistoryToRedux,
} from 'store/historyThunks';
import { useAppDispatch, useCurrentAccountHistory } from 'store/hooks';
import FilterDropdown from './FilterDropDown';
import { HistoryRow } from './HistoryRow';
import { HistoryFilter, PingHistoryViewModel } from './PingHistoryViewModel';

const vm = new PingHistoryViewModel();

/**
 * Format date string with relative labels (TODAY, YESTERDAY)
 * Input format: "dd/MM/yyyy" (e.g., "12/01/2026")
 * Output format: "TODAY, DD MMM YYYY" or "YESTERDAY, DD MMM YYYY" or "DD MMM YYYY"
 */
function formatDateWithRelative(dateStr: string): string {
  try {
    // Parse "dd/MM/yyyy" format
    const [day, month, year] = dateStr.split('/').map(Number);
    if (!day || !month || !year) return dateStr.toUpperCase();

    const date = new Date(year, month - 1, day);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Reset time to compare only dates
    const normalizeDate = (d: Date) => {
      const normalized = new Date(d);
      normalized.setHours(0, 0, 0, 0);
      return normalized;
    };

    const normalizedDate = normalizeDate(date);
    const normalizedToday = normalizeDate(today);
    const normalizedYesterday = normalizeDate(yesterday);

    // Format date as "JAN 12, 2026" (month day, year - comma after day)
    const monthNames = [
      'JAN',
      'FEB',
      'MAR',
      'APR',
      'MAY',
      'JUN',
      'JUL',
      'AUG',
      'SEP',
      'OCT',
      'NOV',
      'DEC',
    ];
    const monthName = monthNames[month - 1] || 'JAN';
    const formattedDate = `${day} ${monthName} ${year}`;

    if (normalizedDate.getTime() === normalizedToday.getTime()) {
      return `TODAY, ${formattedDate}`;
    } else if (normalizedDate.getTime() === normalizedYesterday.getTime()) {
      return `YESTERDAY, ${formattedDate}`;
    } else {
      return formattedDate;
    }
  } catch {
    return dateStr.toUpperCase();
  }
}

export default function PingHistoryScreen() {
  const dispatch = useAppDispatch();
  const accountHistory = useCurrentAccountHistory();
  const transactions = accountHistory.items;
  const hasMore = accountHistory.hasMore;
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filterType, setFilterType] = useState<HistoryFilter>('all');
  const insets = useSafeAreaInsets();
  const [navigationBarHeight, setNavigationBarHeight] = useState<number>(56); // Default height estimate

  // Fetch recent items when screen is focused
  const fetchRecent = useCallback(async () => {
    try {
      await fetchRecentHistoryToRedux(dispatch);
    } catch (err) {
      console.error('[PingHistoryScreen] Failed to fetch recent history', err);
    }
  }, [dispatch]);

  // Load initial data only if store is empty
  const loadInitial = useCallback(async () => {
    if (transactions.length === 0) {
      try {
        await loadInitialHistoryToRedux(dispatch);
      } catch (err) {
        console.error('[PingHistoryScreen] Failed to load initial history', err);
      }
    }
  }, [dispatch, transactions.length]);

  // Load more data
  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      await loadMoreHistoryToRedux(dispatch);
    } finally {
      setLoadingMore(false);
    }
  }, [dispatch, hasMore]);

  // Pull to refresh - reload all
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchHistoryToRedux(dispatch);
    } finally {
      setRefreshing(false);
    }
  }, [dispatch]);

  // When screen is focused: show existing data from Redux, fetch recent, and load initial if empty
  useFocusEffect(
    useCallback(() => {
      // Load initial if store is empty
      void loadInitial();
      // Fetch recent items to update
      void fetchRecent();
    }, [loadInitial, fetchRecent])
  );

  // Reuse existing helpers for filtering + grouping
  const filteredTransactions = useMemo(
    () => vm.filterTransactions(transactions, filterType),
    [transactions, filterType]
  );
  const groupedTransactions = useMemo(
    () => vm.groupByDate(filteredTransactions),
    [filteredTransactions]
  );

  // Convert grouped transactions to SectionList format
  const sections = useMemo(() => {
    return Object.entries(groupedTransactions).map(([date, dayEvents]) => ({
      title: typeof date === 'string' ? date.toUpperCase() : '',
      data: Array.isArray(dayEvents) ? dayEvents : [],
    }));
  }, [groupedTransactions]);

  // Memoize ListFooterComponent to prevent flickering
  const listFooterComponent = useMemo(() => {
    if (!loadingMore || !hasMore) return null;
    return (
      <View className="py-4">
        <Text className="text-center text-gray-400">Loading more...</Text>
      </View>
    );
  }, [loadingMore, hasMore]);

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <View
        onLayout={(e) => {
          setNavigationBarHeight(e.nativeEvent.layout.height);
        }}>
        <NavigationBar title="Ping History" />
      </View>

      <View className="">
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 16, // mx-4 equivalent
            right: 16,
            zIndex: 1000,
            ...(Platform.OS === 'android' && {
              elevation: 8,
            }),
          }}>
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
      </View>

      {/* SectionList with top margin to account for filter dropdown */}
      <SectionList
        style={{ marginTop: 80 }}
        sections={sections}
        keyExtractor={(item, index) => `${item.txHash}-${index}`}
        renderItem={({ item }) => (
          <View className="px-6">
            <HistoryRow
              event={item}
              onPress={() =>
                push('TransactionDetailsScreen', {
                  transaction: item,
                })
              }
            />
          </View>
        )}
        renderSectionHeader={({ section: { title } }) => {
          const formattedTitle = formatDateWithRelative(title);
          return (
            <View className="px-6 py-1">
              <Text className="font-medium text-gray-400">{formattedTitle}</Text>
            </View>
          );
        }}
        ListEmptyComponent={
          transactions.length === 0 ? (
            <View className="mt-20">
              <Text className="text-center text-gray-400">
                No {filterType !== 'all' ? filterType : ''} ping history found.
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={listFooterComponent}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.8}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
      />
    </View>
  );
}
