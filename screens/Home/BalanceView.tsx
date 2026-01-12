import { View, Text, TouchableOpacity, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PlusIcon from 'assets/PlusIcon';
import { BalanceEntry } from 'business/Types';
import { push } from 'navigation/Navigation';
import { useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';

export default function BalanceView({
  balance,
  onRefresh,
}: {
  balance: string;
  tokens?: BalanceEntry[];
  onRefresh?: () => Promise<void> | void;
}) {
  const spinValue = useRef(new Animated.Value(0)).current;

  const handleRefresh = useCallback(async () => {
    // Start spin animation
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 800,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    try {
      await onRefresh?.();
    } finally {
      // Stop animation after small delay
      setTimeout(() => {
        spinValue.stopAnimation(() => spinValue.setValue(0));
      }, 800);
    }
  }, [onRefresh]);

  // Auto-refresh when screen is focused (including first mount)
  useFocusEffect(
    useCallback(() => {
      void handleRefresh();
    }, [handleRefresh])
  );

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View className="mt-12 px-6">
      <Text className="mb-1 text-sm text-white opacity-80">Current Balance</Text>

      <View className="flex-row items-center justify-between">
        <View className="w-[80%] flex-row items-center">
          <Text
            className="text-[52px] font-extrabold text-white"
            numberOfLines={1}
            adjustsFontSizeToFit>
            {balance}
          </Text>
          <TouchableOpacity onPress={handleRefresh} className="rounded-full p-2">
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <Ionicons name="refresh" size={26} color="white" />
            </Animated.View>
          </TouchableOpacity>
        </View>

        <View className="flex-row items-center space-x-3">
          <TouchableOpacity className="rounded-full" onPress={() => push('DepositScreen')}>
            <PlusIcon color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
