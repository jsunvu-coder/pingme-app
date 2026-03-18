import { View, TouchableOpacity, Text, Keyboard } from 'react-native';
import { ALL_TOKENS, TOKENS } from 'business/Constants';
import DollarSignIcon from 'assets/DollarSignIcon';
import MonadIcon from 'assets/MonadIcon';

const IconMap = {
  USDC: ({ color, size }: { color?: string; size?: number }) => (
    <DollarSignIcon width={size} height={size} fill={color} />
  ),
  pUSDC: ({ color, size }: { color?: string; size?: number }) => (
    <DollarSignIcon width={size} height={size} fill={color} />
  ),
  pWMON: ({ size }: { size?: number }) => <MonadIcon width={size} height={size} />,
  WMON: ({ size }: { size?: number }) => <MonadIcon width={size} height={size} />,
};

const TYPES = [
  {
    key: 'referrals',
    label: 'Referrals',
  },
  // {
  //   key: 'interactions',
  //   label: 'Interactions',
  // },
  {
    key: 'pings',
    label: 'Total Ping',
  },
];

export default function TokenSelectorTabs({
  selectedType,
  setSelectedType,
  fontSize = 16,
}: {
  selectedType: string;
  setSelectedType: (type: 'referrals' | 'interactions' | 'pings') => void;
  fontSize?: number;
}) {
  const tokens = ALL_TOKENS;

  const onSelectType = (type: typeof TYPES[number]) => {
    Keyboard.dismiss();
    setSelectedType(type.key as 'referrals' | 'interactions' | 'pings');
  };

  return (
    <View className="flex-row items-center justify-between rounded-full border border-[#E0E0E0] p-1">
      {TYPES.map((type) => {
        return (
          <TouchableOpacity
            key={type.key}
            onPress={() => onSelectType(type)}
            style={{
              backgroundColor: selectedType === type.key ? '#0F0F0F' : 'transparent',
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 10,
              borderRadius: 9999,
            }}>
            {/* <Icon color={selectedToken === token ? '#FFFFFF' : '#929393'} size={iconSize} /> */}
            <Text
              style={{
                color: selectedType === type.key ? '#FFFFFF' : '#0F0F0F',
                fontWeight: selectedType === type.key ? 'bold' : 'normal',
                textAlign: 'center',
                marginLeft: 8,
                fontSize: fontSize,
              }}>
              {type.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
