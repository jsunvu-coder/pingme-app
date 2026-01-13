import { View, Text, FlatList, TouchableOpacity, Dimensions } from 'react-native';
import { useMemo } from 'react';
import ArrowRightIcon from 'assets/ArrowRightIcon';
import PingHistoryItemView from './PingHistoryItemView';
import { push } from 'navigation/Navigation';
import { TransactionViewModel } from './History/List/TransactionViewModel';
import { useCurrentAccountHistory } from 'store/hooks';

const ITEM_WIDTH = 280;
const ITEM_MARGIN = 16;
const ITEM_TOTAL_WIDTH = ITEM_WIDTH + ITEM_MARGIN;

export default function PingHistoryView() {
  // Get latest 5 transactions from Redux store for current account
  const accountHistory = useCurrentAccountHistory();
  const history = useMemo(() => accountHistory.items.slice(0, 5), [accountHistory.items]);

  const handleOpenHistory = () => {
    push('PingHistoryScreen');
  };

  return (
    <View className="mt-8">
      <TouchableOpacity
        onPress={handleOpenHistory}
        activeOpacity={0.7}
        className="mx-6 mb-4 flex-row items-center">
        <Text className="mt-1 mr-1 text-lg text-gray-400">Ping History</Text>
        <ArrowRightIcon width={20} height={20} />
      </TouchableOpacity>

      {history.length === 0 ? (
        <Text className="mx-6 mt-3 text-sm text-gray-400">No recent transactions.</Text>
      ) : (
        <FlatList
          data={history}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item, index) => `${item.txHash}-${index}`}
          renderItem={({ item }) => (
            <PingHistoryItemView
              item={item}
              onPress={() =>
                push('TransactionDetailsScreen', {
                  transaction: item,
                })
              }
            />
          )}
          snapToInterval={ITEM_TOTAL_WIDTH}
          snapToAlignment="center"
          decelerationRate="fast"
          contentContainerStyle={{
            paddingHorizontal: 16,
          }}
        />
      )}
    </View>
  );
}
