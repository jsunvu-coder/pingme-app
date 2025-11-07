import { View, Text, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import ArrowRightIcon from 'assets/ArrowRightIcon';
import PingHistoryItemView from './PingHistoryItemView';
import { push } from 'navigation/Navigation';
import { PingHistoryItem, PingHistoryStorage } from './PingHistoryStorage';

export default function PingHistoryView() {
  const [history, setHistory] = useState<PingHistoryItem[]>([]);
  const screenWidth = Dimensions.get('window').width;

  const handleOpenHistory = () => {
    push('PingHistoryScreen');
  };

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const loaded = await PingHistoryStorage.load();
        setHistory(loaded);
      })();
    }, [])
  );

  return (
    <View className="mt-8">
      <TouchableOpacity
        onPress={handleOpenHistory}
        activeOpacity={0.7}
        className="mb-4 flex-row items-center">
        <Text className="mr-1 text-lg text-gray-400">Ping History</Text>
        <ArrowRightIcon />
      </TouchableOpacity>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-1">
        {history.map((item, i) => (
          <PingHistoryItemView key={i} item={item} />
        ))}
      </ScrollView>
    </View>
  );
}
