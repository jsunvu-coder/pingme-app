import { useMemo, useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LOCKBOX_DURATION } from 'business/Constants';

type Props = {
  value: number;
  onChange: (nextValue: number) => void;
};

const MIN_DAYS = 1;
const MAX_DAYS = 30;
const DAY_OPTIONS = Array.from({ length: MAX_DAYS - MIN_DAYS + 1 }, (_, idx) => idx + MIN_DAYS);

function DurationDisplay({ value, onOpen }: { value: number; onOpen: () => void }) {
  return (
    <Pressable onPress={onOpen} className="rounded-2xl border border-[#EFEFEF] bg-white px-4 py-4">
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-lg font-semibold text-[#0F0F0F]">
            {value} {value === 1 ? 'day' : 'days'}
          </Text>
          <Text className="text-sm text-[#6B7280]">Recipient must claim within this time</Text>
        </View>
        <Ionicons name="chevron-down" size={18} color="#0F0F0F" />
      </View>
    </Pressable>
  );
}

// --- Subcomponent: DurationOption -------------------------------------------------
function DurationOption({
  day,
  selected,
  onSelect,
}: {
  day: number;
  selected: boolean;
  onSelect: (day: number) => void;
}) {
  return (
    <Pressable
      onPress={() => onSelect(day)}
      className={`mb-2 flex-row items-center justify-between rounded-xl px-4 py-3 ${
        selected ? 'bg-[#FFF3EC]' : 'bg-white'
      }`}>
      <Text className={`text-base ${selected ? 'font-semibold text-[#FD4912]' : 'text-[#0F0F0F]'}`}>
        {day} {day === 1 ? 'day' : 'days'}
      </Text>
      {selected ? <Ionicons name="checkmark" size={18} color="#FD4912" /> : null}
    </Pressable>
  );
}

// --- Subcomponent: DurationModal --------------------------------------------------
function DurationModal({
  visible,
  selectedValue,
  onSelect,
  onClose,
}: {
  visible: boolean;
  selectedValue: number;
  onSelect: (day: number) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-[rgba(0,0,0,0.45)] px-5">
        {/* Click outside to close */}
        <Pressable onPress={onClose} className="absolute inset-0" />
        {/* Card */}
        <View className="w-full rounded-xl bg-white p-5 shadow-lg">
          <Text className="mb-4 text-center text-lg font-semibold text-[#0F0F0F]">
            Select duration
          </Text>

          <ScrollView
            className="max-h-[360px] w-full"
            contentContainerStyle={{ paddingBottom: 4 }}
            showsVerticalScrollIndicator={false}>
            {DAY_OPTIONS.map((day) => (
              <DurationOption
                key={day}
                day={day}
                selected={day === selectedValue}
                onSelect={onSelect}
              />
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// --- Main Component ---------------------------------------------------------------
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

  const handleOpen = () => {
    Keyboard.dismiss();
    setVisible(true);
  };

  return (
    <View className="mt-6">
      <Text className="mb-2 text-lg text-[#0F0F0F]">Lockbox duration</Text>
      <DurationDisplay value={selectedValue} onOpen={handleOpen} />
      <DurationModal
        visible={visible}
        selectedValue={selectedValue}
        onSelect={handleSelect}
        onClose={() => setVisible(false)}
      />
    </View>
  );
}
