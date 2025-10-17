import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  amount: string;
  recipient?: string;
  lockboxDuration: number;
};

const SummaryTitle = ({ children }: { children: React.ReactNode }) => (
  <Text className="flex-1 text-lg text-gray-500">{children}</Text>
);

const SummaryValue = ({ children }: { children: React.ReactNode }) => (
  <Text className="flex-1 text-lg font-normal text-black" numberOfLines={1} ellipsizeMode="tail">
    {children}
  </Text>
);

export default function PaymentSummaryCard({ amount, recipient, lockboxDuration }: Props) {
  return (
    <View className="mb-6 rounded-2xl bg-white p-6">
      {/* Amount */}
      <View className="mb-3 flex-row items-center justify-between">
        <SummaryTitle>Amount</SummaryTitle>
        <SummaryValue>{amount}</SummaryValue>
      </View>

      {/* Recipient */}
      {recipient ? (
        <View className="mb-3 flex-row items-center justify-between">
          <SummaryTitle>Recipient</SummaryTitle>
          <SummaryValue>{recipient}</SummaryValue>
        </View>
      ) : null}

      {/* Lockbox Duration */}
      <View className="mb-4 flex-row items-center justify-between">
        <SummaryTitle>Lockbox duration</SummaryTitle>
        <SummaryValue>{lockboxDuration} day(s)</SummaryValue>
      </View>

      {/* Info Text */}
      <View className="mt-1 flex-row items-start">
        <Ionicons
          name="information-circle-sharp"
          size={18}
          color="#3B82F6"
          style={{ marginRight: 6, marginTop: 2 }}
        />
        <Text className="text-md flex-1 leading-relaxed text-gray-600">
          The payment link will expire if unclaimed within the stated period. Funds will be returned
          to your balance.
        </Text>
      </View>
    </View>
  );
}
