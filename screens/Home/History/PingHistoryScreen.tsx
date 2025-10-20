import { ScrollView, View, Text, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState, useCallback } from 'react';
import { EventLog } from 'business/models/EventLog';
import { goBack } from 'navigation/Navigation';
import { HistoryRow } from './HistoryRow';
import FilterDropdown from './FilterDropDown';
import { PingHistoryViewModel } from './PingHistoryViewModel';

export default function PingHistoryScreen() {
  const [events, setEvents] = useState<EventLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'send' | 'receive'>('all');

  const vm = new PingHistoryViewModel();

  const loadData = async () => {
    setLoading(true);
    try {
      const allEvents = await vm.loadEvents();
      setEvents(allEvents);
    } catch (err) {
      console.error('❌ Failed to load ping history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  // 🔍 Use VM helpers to filter and group
  const filteredEvents = vm.filterEvents(events, filterType);
  const groupedEvents = vm.groupByDate(filteredEvents);

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFA]">
      <Header />

      <ScrollView
        className="px-6"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: 80 }}>
        <View className="my-4">
          <FilterDropdown
            value={filterType}
            onChange={setFilterType}
            options={[
              { label: 'All', value: 'all' },
              { label: 'Sent', value: 'send' },
              { label: 'Received', value: 'receive' },
            ]}
          />
        </View>

        {loading ? (
          <Text className="mt-20 text-center text-gray-500">Loading history...</Text>
        ) : filteredEvents.length === 0 ? (
          <Text className="mt-20 text-center text-gray-400">
            No {filterType !== 'all' ? filterType : ''} ping history found.
          </Text>
        ) : (
          Object.entries(groupedEvents).map(([date, dayEvents]) => {
            const label = typeof date === 'string' ? date.toUpperCase() : '';
            return (
              <View key={label} className="mb-6">
                <Text className="mb-3 font-medium text-gray-400">{label}</Text>

                {Array.isArray(dayEvents) &&
                  dayEvents.map((event, index) => (
                    <HistoryRow key={`${label}-${index}`} event={event} />
                  ))}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
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
