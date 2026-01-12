import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, SectionList, RefreshControl, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NavigationBar from 'components/NavigationBar';
import { push } from 'navigation/Navigation';
import FilterDropdown from './FilterDropDown';
import { HistoryRow } from './HistoryRow';
import { HistoryFilter, PingHistoryViewModel } from './PingHistoryViewModel';
import { useAppDispatch, useAppSelector } from 'store/hooks';
import { fetchHistoryToRedux } from 'store/historyThunks';

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
    const formattedDate = `${day} ${monthName}  ${year}`;

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
  const transactions = useAppSelector((state) => state.history.items);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<HistoryFilter>('all');
  const insets = useSafeAreaInsets();
  const [navigationBarHeight, setNavigationBarHeight] = useState<number>(56); // Default height estimate

  const loadFromApi = useCallback(async () => {
    setLoading(true);
    try {
      await fetchHistoryToRedux(dispatch);
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchHistoryToRedux(dispatch);
    } finally {
      setRefreshing(false);
    }
  }, [dispatch]);

  useEffect(() => {
    void loadFromApi();
  }, [loadFromApi]);

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

  // Calculate FilterDropdown top position: SafeArea top + NavigationBar height + spacing
  const filterDropdownTop = insets.top + navigationBarHeight + 16; // 16px spacing

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
          loading ? null : (
            <View className="mt-20">
              <Text className="text-center text-gray-400">
                No {filterType !== 'all' ? filterType : ''} ping history found.
              </Text>
            </View>
          )
        }
        refreshControl={<RefreshControl refreshing={loading || refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
      />
    </View>
  );
}
