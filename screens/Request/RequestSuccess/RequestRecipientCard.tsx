import { View, Text, TouchableOpacity } from 'react-native';

const formatUsdAmount = (amount: number | string | null | undefined): string => {
  if (typeof amount === 'number') {
    return Number.isFinite(amount) ? amount.toFixed(2) : '0.00';
  }

  if (typeof amount === 'string') {
    const normalized = amount.replace(/,/g, '').replace(/\$/g, '').trim();
    if (!normalized) return '0.00';
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed.toFixed(2) : '0.00';
  }

  return '0.00';
};

export default function RequestRecipientCard({
  recipient,
  amount,
  displayAmount,
}: {
  recipient: string;
  amount: number | string;
  displayAmount?: string;
}) {
  const amountDisplay = displayAmount?.trim()
    ? displayAmount.trim()
    : `$${formatUsdAmount(amount)}`;

  return (
    <View className="rounded-2xl bg-white px-6 py-8">
      <Text className="text-3xl text-gray-800">
        You{"'"}ve sent a payment request to <Text className="font-semibold">{recipient}</Text>
      </Text>

      <TouchableOpacity className="mt-2" style={{ opacity: 0 }}>
        <Text className="text-lg text-[#FD4912]">Add recipient to Contact List</Text>
      </TouchableOpacity>

      <View className="mt-6 flex-row items-center justify-between border-t border-[#FFDBD0] pt-6">
        <Text className="text-lg text-gray-500">Amount</Text>
        <Text className="mr-1 text-2xl">{amountDisplay}</Text>
        {/* Keep this view to make the amount at the center */}
        <View />
      </View>
    </View>
  );
}
