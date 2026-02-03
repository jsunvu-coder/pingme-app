import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Utils } from 'business/Utils';
import { ClaimedPocket } from 'business/services/RedPocketService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AccountDataService } from 'business/services/AccountDataService';

export const ClaimedList = ({
  claimedList,
  autoHideMs = 3000,
  isClaimed = false,
  decimals = 6,
}: {
  claimedList: ClaimedPocket[];
  autoHideMs?: number;
  isClaimed?: boolean;
  decimals?: number;
}) => {
  const [revealed, setRevealed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { bottom } = useSafeAreaInsets();

  const formatAmount = useCallback(
    (amount: string) => {
      return Utils.formatMicroToUsd(amount, 'dollar', undefined, decimals);
    },
    [decimals]
  );

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    clearTimer();
    if (revealed) {
      timerRef.current = setTimeout(() => setRevealed(false), autoHideMs);
    }
    return clearTimer;
  }, [revealed, autoHideMs, clearTimer]);

  const toggleReveal = useCallback(() => {
    setRevealed((v) => !v);
  }, []);

  const onlyYouClaimed = useMemo(() => {
    return (
      claimedList.length === 1 && claimedList[0].username.toLowerCase() === AccountDataService.getInstance().email?.toLowerCase()
    );
  }, [claimedList]);

  const isEmpty = useMemo(() => {
    return claimedList.length === 0;
  }, [claimedList]);

  const ListEmptyComponent = useMemo(() => {
    return () => (
      <Text className="ml-4 text-sm text-[#90909080]">No one has claimed this yet.</Text>
    );
  }, []);

  return (
    <View style={{ flex: 1, marginTop: 8, paddingBottom: bottom + 16 }}>
      <Text className="mb-2 text-base text-[#909090]">Hongbao Recipients</Text>
      <FlatList
        data={claimedList}
        keyExtractor={(item, index) => `${item.username}-${index.toString()}`}
        contentContainerStyle={{ paddingBottom: 8, flex: 1 }}
        ListEmptyComponent={ListEmptyComponent}
        renderItem={({ item, index }) => (
          <ClaimedItem
            index={index}
            revealed={revealed}
            email={item.username}
            claimedAmountText={`$${formatAmount(item.amount)}`}
            noBorder={claimedList.length - 1 === index}
          />
        )}
      />

      {!isClaimed && !onlyYouClaimed && !isEmpty && (
        <TouchableOpacity
          onPress={toggleReveal}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
          accessibilityRole="button"
          accessibilityLabel={revealed ? 'Hide email' : 'Show email'}>
          <Text className="mr-2 text-base text-[#FD4912] underline">
            {"Show Recipients' Emails"}
          </Text>
          <Ionicons name={revealed ? 'eye-off-outline' : 'eye-outline'} size={20} color="#6B7280" />
        </TouchableOpacity>
      )}
    </View>
  );
};

type ClaimedItemProps = {
  index: number;
  revealed: boolean;
  email: string;
  claimedAmountText: string; // e.g. "$1.00"
  noBorder?: boolean; // default: false
};

function ClaimedItem({
  index = 0,
  revealed = false,
  email,
  claimedAmountText,
  noBorder = false,
}: ClaimedItemProps) {
  const myEmail = AccountDataService.getInstance().email;
  const isMyEmail = email.toLowerCase() === myEmail?.toLowerCase();
  const maskedEmail = useMemo(() => Utils.maskEmail(email), [email]);
  const displayEmail = isMyEmail ? 'YOU' : revealed ? email : maskedEmail;

  return (
    <View
      style={{
        flexDirection: 'row',
        padding: 8,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: noBorder ? 0 : 1,
        borderBottomColor: '#E5E7EB',
      }}>
      <View className="min-w-0 flex-1 flex-row items-center">
        <Text
          numberOfLines={1}
          ellipsizeMode="middle"
          className="mr-2 min-w-[30px] text-[12px] font-medium text-[#0F0F0F]">
          {Utils.getOrdinalSuffix(index + 1)}
        </Text>
        <Text
          numberOfLines={1}
          ellipsizeMode="middle"
          style={{
            fontWeight: isMyEmail ? 'bold' : 'normal',
            color: isMyEmail ? '#FD4912' : '#0F0F0F',
            fontSize: 14,
            flex: 1,
          }}>
          {displayEmail || '-'}
        </Text>
      </View>

      <Text
        style={{
          marginLeft: 12,
          color: isMyEmail ? '#FD4912' : '#0F0F0F',
          fontSize: 12,
          fontWeight: isMyEmail ? 'bold' : 'normal',
        }}>
        {claimedAmountText}
      </Text>
    </View>
  );
}
