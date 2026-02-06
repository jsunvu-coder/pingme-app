import { View, Text } from 'react-native';
import WalletAddIcon from 'assets/WalletAddIcon';
import { TOKENS } from 'business/Constants';
import TokenSelectorTabs from 'components/TokenSelectorTabs';
import { Utils } from 'business/Utils';
import { useMemo } from 'react';

type DepositHeaderProps = {
  selectedToken: keyof typeof TOKENS;
  setSelectedToken: (token: keyof typeof TOKENS) => void;
};

export default function DepositHeader({ selectedToken, setSelectedToken }: DepositHeaderProps) {


  const tokenName = useMemo(() => {
    if(Utils.isStablecoin(selectedToken)) {
      return 'USD Coin (USDC)';
    }
    return "$WMON (Wrapped $MON)";
  }, [selectedToken]);

  const tokenSymbol = useMemo(() => {
    if(Utils.isStablecoin(selectedToken)) {
      return 'USDC';
    }
    return "$WMON";
  }, [selectedToken]);


  return (
    <View>
      {/* Main Header Content */}
      <View className="mt-10 items-center">
        <WalletAddIcon size={72} />

        <View className="mt-6 w-full">
          <TokenSelectorTabs selectedToken={selectedToken} setSelectedToken={setSelectedToken}  iconSize={24} fontSize={18}/>
        </View>

        <Text className="mx-6 mt-6 text-center text-3xl font-bold text-[#0F0F0F]">
          Deposit {tokenSymbol} to the address below
        </Text>
        <Text className="mt-1 text-center text-xl leading-6 text-[#606060]">
          Please deposit <Text className="font-semibold">{tokenName}</Text> on the{' '}
          <Text className="font-semibold">Monad network</Text> to the exact wallet address shown.
        </Text>
      </View>
    </View>
  );
}
