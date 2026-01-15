import { useState, useCallback } from 'react';
import { View, Text } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { BalanceService } from 'business/services/BalanceService';
import { Utils } from 'business/Utils';
import { useCurrentAccountStablecoinBalance } from 'store/hooks';

type Props = {
  email: string;
};

export default function AccountInfoCard({ email }: Props) {
  const { stablecoinBalance: totalBalance } = useCurrentAccountStablecoinBalance();

  useFocusEffect(
    useCallback(() => {
      void BalanceService.getInstance().getBalance();
    }, [])
  );

  return (
    <View>
      <Text className="text-xl text-gray-700">{email}</Text>

      <View className="mt-4 flex-row items-center justify-between rounded-xl bg-gray-100 p-4">
        <Text className="text-lg text-gray-500">Current balance</Text>
        <Text className="mt-1 text-2xl font-bold">{`$${totalBalance || '0.00'}`}</Text>
      </View>
    </View>
  );
}
