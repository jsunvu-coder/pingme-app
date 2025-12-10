import { View, Text, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import ArrowRightIcon from 'assets/ArrowRightIcon';
import PingHistoryItemView from './PingHistoryItemView';
import { push } from 'navigation/Navigation';
import { PingHistoryViewModel } from './History/List/PingHistoryViewModel';
import { TransactionViewModel } from './History/List/TransactionViewModel';
import { ContractService } from 'business/services/ContractService';

export default function PingHistoryView() {
  const [history, setHistory] = useState<TransactionViewModel[]>([]);
  const [loading, setLoading] = useState(false);
  const screenWidth = Dimensions.get('window').width;
  const vm = useMemo(() => new PingHistoryViewModel(), []);
  const contractService = useMemo(() => ContractService.getInstance(), []);

  useEffect(() => {
    const unsubscribe = PingHistoryViewModel.subscribe((txs) => {
      setHistory(txs.slice(0, 5));
    });
    return unsubscribe;
  }, []);

  const handleOpenHistory = () => {
    push('PingHistoryScreen');
  };

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      const commitment = contractService.getCrypto()?.commitment;
      let initialCached: TransactionViewModel[] = [];

      // surface any in-memory cache immediately
      const memCached = PingHistoryViewModel.getCachedTransactions(commitment ?? undefined);
      if (memCached.length) {
        setHistory(memCached.slice(0, 5));
      }

      // show cached immediately if present for this user (load from disk if needed)
      (async () => {
        initialCached = await PingHistoryViewModel.loadCachedTransactions(commitment ?? undefined);
        if (initialCached.length && mounted) {
          setHistory(initialCached.slice(0, 5));
        }
      })();

      (async () => {
        try {
          const loaded = await vm.getTransactions({
            pageSize: 5, // only fetch the first 5 for home preview
            targetPreload: 20, // background-preload 4 more batches (5 each) into cache
            preferFirstPage: true, // keep first hit fast; fetch full history in background
            onPhaseUpdate: (txs) => {
              if (!mounted) return;
              setHistory(txs.slice(0, 5));
            },
          });
          if (!mounted) return;
          setHistory(loaded.slice(0, 5));
          setLoading(false);
        } catch (err) {
          console.error('❌ Failed to load ping history preview:', err);
          if (mounted && !initialCached.length) setHistory([]);
          if (mounted) setLoading(false);
        }
      })();

      return () => {
        mounted = false;
      };
    }, [vm])
  );

  return (
    <View className="mt-8">
      <TouchableOpacity
        onPress={handleOpenHistory}
        activeOpacity={0.7}
        className="mb-4 flex-row items-center">
        <Text className="mr-1 h-6 text-lg text-gray-400">Ping History</Text>
        <ArrowRightIcon />
      </TouchableOpacity>

      {loading ? null : history.length === 0 ? (
        <Text className="text-sm text-gray-400">No recent transactions.</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-1">
          {history.map((item, i) => (
            <PingHistoryItemView key={`${item.txHash}-${i}`} item={item} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}
