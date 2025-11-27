import { useState, useCallback } from 'react';
import { View, Text } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { BalanceService } from 'business/services/BalanceService';

type Props = {
  email: string;
};

export default function AccountInfoCard({ email }: Props) {
  const [balance, setBalance] = useState<string>('$0.00');

  // ✅ Refresh balance each time the screen appears
  useFocusEffect(
    useCallback(() => {
      let active = true;

      const loadBalance = async () => {
        try {
          const balanceService = BalanceService.getInstance();
          await balanceService.getBalance();
          const balances = await balanceService.balances;
          if (active && balances?.length > 0) {
            const total = balanceService.totalBalance || balances[0].amount;
            setBalance(`$${total}`);
          }
        } catch (err) {
          console.error('Error loading balance:', err);
        }
      };

      loadBalance();

      // Cleanup on unfocus
      return () => {
        active = false;
      };
    }, [])
  );

  return (
    <View>
      <Text className="text-xl text-gray-700">{email}</Text>

      <View className="mt-4 flex-row items-center justify-between rounded-xl bg-gray-100 p-4">
        <Text className="text-lg text-gray-500">Current balance</Text>
        <Text className="mt-1 text-2xl font-bold">{balance}</Text>
      </View>
    </View>
  );
}
