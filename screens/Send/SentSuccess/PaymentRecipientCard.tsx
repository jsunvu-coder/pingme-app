import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function PaymentRecipientCard({
  recipient,
  amount,
}: {
  recipient: string;
  amount: number;
}) {
  return (
    <View className="rounded-2xl bg-white px-6 py-8">
      <Text className="text-xl text-gray-800">
        You've sent payment to <Text className="font-semibold">{recipient}</Text>
      </Text>

      <TouchableOpacity className="mt-2" style={{ opacity: 0 }}>
        <Text className="text-lg text-[#FD4912]">Add recipient to Contact List</Text>
      </TouchableOpacity>

      <View className="mt-6 flex-row items-center justify-between border-t border-[#FFDBD0] pt-6">
        <Text className="text-lg text-gray-500">Amount</Text>
        <Text className="mr-1 text-2xl font-semibold">${amount.toFixed(2)}</Text>
        <Ionicons name="open-outline" size={24} color="#FD4912" />
      </View>
    </View>
  );
}
