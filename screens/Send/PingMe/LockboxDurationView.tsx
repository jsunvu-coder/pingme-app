import { useMemo, useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LOCKBOX_DURATION } from 'business/Constants';

type Props = {
  value: number;
  onChange: (nextValue: number) => void;
};

const MIN_DAYS = 1;
const MAX_DAYS = 30;
const DAY_OPTIONS = Array.from({ length: MAX_DAYS - MIN_DAYS + 1 }, (_, idx) => idx + MIN_DAYS);

export default function LockboxDurationView({ value, onChange }: Props) {
  const [visible, setVisible] = useState(false);

  const selectedValue = useMemo(() => {
    if (!Number.isFinite(value)) return LOCKBOX_DURATION;
    const rounded = Math.round(value);
    if (rounded < MIN_DAYS) return MIN_DAYS;
    if (rounded > MAX_DAYS) return MAX_DAYS;
    return rounded;
  }, [value]);

  const handleSelect = (day: number) => {
    setVisible(false);
    onChange(day);
  };

  return (
    <View className="mt-6">
      <Text className="mb-2 text-base font-semibold text-[#0F0F0F]">Lockbox Duration</Text>

      <Pressable
        onPress={() => setVisible(true)}
        className="rounded-2xl border border-[#EFEFEF] bg-white px-4 py-4">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-lg font-semibold text-[#0F0F0F]">
              {selectedValue} {selectedValue === 1 ? 'Day' : 'Days'}
            </Text>
            <Text className="text-sm text-[#6B7280]">Recipient must claim within this time</Text>
          </View>
          <Ionicons name="chevron-down" size={18} color="#0F0F0F" />
        </View>
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}>
        <View
          className="flex-1 px-6 py-12"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center' }}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setVisible(false)} />
          <View className="mx-auto w-full max-w-sm rounded-3xl bg-white p-5">
            <Text className="mb-4 text-center text-lg font-semibold text-[#0F0F0F]">
              Select Duration
            </Text>
            <ScrollView className="max-h-[340px]">
              {DAY_OPTIONS.map((day) => {
                const isActive = day === selectedValue;
                return (
                  <Pressable
                    key={day}
                    onPress={() => handleSelect(day)}
                    className={`mb-2 flex-row items-center justify-between rounded-2xl px-4 py-3 ${
                      isActive ? 'bg-[#FFF3EC]' : 'bg-white'
                    }`}>
                    <Text
                      className={`text-base ${
                        isActive ? 'font-semibold text-[#FD4912]' : 'text-[#0F0F0F]'
                      }`}>
                      {day} {day === 1 ? 'day' : 'days'}
                    </Text>
                    {isActive ? <Ionicons name="checkmark" size={18} color="#FD4912" /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>

            <Pressable onPress={() => setVisible(false)} className="mt-4 rounded-2xl bg-[#0F0F0F] py-3">
              <Text className="text-center text-base font-semibold text-white">Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
