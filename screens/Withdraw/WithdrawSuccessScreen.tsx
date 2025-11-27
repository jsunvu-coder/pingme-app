import { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp } from '@react-navigation/native';
import { push, setRootScreen } from 'navigation/Navigation';
import SecondaryButton from 'components/ScondaryButton';

type RouteParams = {
  amount?: number;
  walletAddress?: string;
  txHash?: string;
};

const shorten = (hash?: string) => {
  if (!hash) return '';
  if (hash.length <= 12) return hash;
  return `${hash.slice(0, 6)}...${hash.slice(-6)}`;
};

export default function WithdrawSuccessScreen() {
  const route = useRoute<RouteProp<Record<string, RouteParams>, string>>();
  const { amount = 0, walletAddress = '', txHash = '' } = (route.params || {}) as RouteParams;

  const formattedAmount = useMemo(() => {
    const numeric = Number(amount);
    if (!Number.isFinite(numeric)) return '$0.00';
    return `$ ${numeric.toFixed(2)}`;
  }, [amount]);

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <ScrollView className="px-6 pt-16" showsVerticalScrollIndicator={false}>
        <Header />

        <View className="my-8 rounded-2xl bg-white px-6 py-8">
          <Text className="text-xl text-gray-800">
            Your withdrawal has been sent to{' '}
            <Text className="font-semibold" numberOfLines={1} ellipsizeMode="middle">
              {walletAddress || 'wallet'}
            </Text>
          </Text>

          <View className="mt-6 flex-row items-center justify-between border-t border-[#EDEDED] pt-6">
            <Text className="text-lg text-gray-500">Amount</Text>
            <Text className="mr-1 text-2xl font-semibold">{formattedAmount}</Text>
          </View>

          {txHash && (
            <View className="mt-4 flex-row items-center justify-between">
              <Text className="text-sm text-gray-400">TX Hash</Text>
              <View className="flex-row items-center space-x-1">
                <Text className="text-sm font-semibold text-gray-600">{shorten(txHash)}</Text>
                <Ionicons name="open-outline" size={16} color="#FD4912" />
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <View className="mx-6 my-12">
        <SecondaryButton title="Back to Homepage" onPress={() => setRootScreen(['MainTab'])} />
      </View>
    </View>
  );
}

const Header = () => (
  <View className="mt-16 items-center">
    <View className="mb-6 h-16 w-16 items-center justify-center rounded-full bg-[#18A957]">
      <Ionicons name="checkmark-sharp" size={36} color="#fff" />
    </View>
    <Text className="mt-2 text-3xl font-bold text-black">Withdrawal Successful</Text>
  </View>
);
