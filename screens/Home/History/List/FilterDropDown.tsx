import { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import WalletAddIcon from 'assets/WalletAddIcon';
import { HistoryFilter } from './PingHistoryViewModel';

type Option = {
  label: string;
  value: HistoryFilter;
};

type Props = {
  value: HistoryFilter;
  onChange: (val: HistoryFilter) => void;
  options?: Option[];
};

export default function FilterDropdown({
  value,
  onChange,
  options = [
    { label: 'All', value: 'all' },
    { label: 'Sent', value: 'sent' },
    { label: 'Received', value: 'received' },
    { label: 'Deposit', value: 'deposit' },
    { label: 'Withdraw', value: 'withdraw' },
    { label: 'Reclaim', value: 'reclaim' },
  ],
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;

  const toggleExpand = () => {
    const next = !expanded;
    setExpanded(next);

    Animated.timing(animation, {
      toValue: next ? 1 : 0,
      duration: 250,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  };

  const height = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, options.length * 52 + 8],
  });

  const handleSelect = (val: HistoryFilter) => {
    onChange(val);
    toggleExpand();
  };

  const getIcon = (val: string) => {
    switch (val) {
      case 'sent':
        return <Ionicons name="remove-outline" size={20} color="#FD4912" />;
      case 'received':
        return <Ionicons name="add-outline" size={20} color="#FD4912" />;
      case 'deposit':
        return <Ionicons name="arrow-down-circle-outline" size={20} color="#FD4912" />;
      case 'withdraw':
        return <Ionicons name="arrow-up-circle-outline" size={20} color="#FD4912" />;
      case 'reclaim':
        return <Ionicons name="refresh-outline" size={20} color="#FD4912" />;
      default:
        return <WalletAddIcon size={20} color="#FD4912" />;
    }
  };

  const currentLabel = options.find((opt) => opt.value === value)?.label || 'Show All';

  return (
    <View className="mt-6">
      {/* Header / Selector */}
      <TouchableOpacity
        onPress={toggleExpand}
        activeOpacity={0.8}
        className="flex-row items-center justify-between rounded-2xl border border-[#FD4912] bg-white px-4 py-3">
        <Text className="text-base font-medium text-gray-800">{currentLabel}</Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color="#FD4912" />
      </TouchableOpacity>

      {/* Animated Dropdown */}
      <Animated.View
        style={{
          overflow: 'hidden',
          height,
          opacity: animation,
          marginTop: 8,
        }}>
        <View className="overflow-hidden rounded-2xl border border-[#FD4912]">
          {options.map((opt, idx) => {
            const isSelected = value === opt.value;
            const isFirst = idx === 0;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => handleSelect(opt.value)}
                activeOpacity={0.7}
                className={`flex-row items-center px-4 py-3 ${
                  isSelected ? 'bg-[#FFF6F3]' : 'bg-white'
                } ${!isFirst ? 'border-t border-gray-100' : ''}`}>
                {getIcon(opt.value)}
                <Text
                  className={`ml-2 text-base font-medium ${
                    isSelected ? 'text-[#FD4912]' : 'text-gray-800'
                  }`}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Animated.View>
    </View>
  );
}
