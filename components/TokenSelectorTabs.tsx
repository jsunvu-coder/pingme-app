import { View, TouchableOpacity, Text } from 'react-native';
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

export default function TokenSelectorTabs({
  selectedToken,
  setSelectedToken,
  fontSize = 16,
  iconSize = 20,
}: {
  selectedToken: string;
  setSelectedToken: (token: keyof typeof TOKENS) => void;
  fontSize?: number;
  iconSize?: number;
}) {
  const tokens = ALL_TOKENS;

  const onSelectToken = (token: keyof typeof TOKENS) => {
    setSelectedToken(token);
  };

  return (
    <View className="flex-row items-center justify-between rounded-full border border-[#E0E0E0] p-1">
      {tokens.map((token) => {
        const Icon = IconMap[token];
        return (
          <TouchableOpacity
            key={token}
            onPress={() => onSelectToken(token)}
            className={`${selectedToken === token ? 'bg-[#0F0F0F]' : 'bg-transparent'} flex-1 flex-row items-center justify-center rounded-full p-1.5`}>
            <Icon color={selectedToken === token ? '#FFFFFF' : '#929393'} size={iconSize} />
            <Text
              style={{
                color: selectedToken === token ? '#FFFFFF' : '#0F0F0F',
                fontWeight: selectedToken === token ? 'bold' : 'normal',
                textAlign: 'center',
                marginLeft: 8,
                fontSize: fontSize,
              }}>
              {token}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
