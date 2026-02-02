import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Utils } from 'business/Utils';

type Props = {
  email: string;
  claimedAmountText: string; // e.g. "$1.00"
  autoHideMs?: number; // default: 3000
  starCount?: number;
  noBorder?: boolean; // default: false
  isClaimed?: boolean; // default: false
};

export default function ClaimantEmailAmountRow({
  email,
  claimedAmountText,
  autoHideMs = 3000,
  starCount,
  noBorder = false,
  isClaimed = false,
}: Props) {
  const [revealed, setRevealed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const maskedEmail = useMemo(() => Utils.maskEmail(email, starCount), [email, starCount]);
  const displayEmail = revealed ? email : maskedEmail;

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

  return (
    <View
      style={{
        flexDirection: 'row',
        padding: 8,
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: noBorder ? 0 : 1,
        borderBottomColor: '#E5E7EB',
      }}>
      <View className="min-w-0 flex-1 flex-row items-center">
        {!isClaimed  &&<TouchableOpacity
          onPress={toggleReveal}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          className="mr-2"
          accessibilityRole="button"
          accessibilityLabel={revealed ? 'Hide email' : 'Show email'}>
          <Ionicons name={revealed ? 'eye-off-outline' : 'eye-outline'} size={16} color="#6B7280" />
        </TouchableOpacity>}
        <Text
          numberOfLines={1}
          ellipsizeMode="middle"
          className="min-w-0 text-[16px] text-[#0F0F0F] flex-1">
          {displayEmail || '-'}
        </Text>
      </View>

      <Text className="ml-3 text-[16px] text-[#0F0F0F]">{claimedAmountText}</Text>
    </View>
  );
}
