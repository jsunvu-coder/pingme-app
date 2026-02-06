import { View, Text } from 'react-native';
import WarningIcon from 'assets/WarningIcon';
import { TOKENS } from 'business/Constants';
import { Utils } from 'business/Utils';
import { useMemo } from 'react';

export default function WarningBox({ token }: { token: keyof typeof TOKENS }) {
  const tokenName = useMemo(() => {
    if(Utils.isStablecoin(token)) {
      return 'USDC';
    }
    return "$WMON";
  }, [token]);
  return (
    <View className="flex-row items-start rounded-2xl bg-red-500 p-4">
      <View className="pt-1">
        <WarningIcon color="#ffffff" />
      </View>

      <View className="ml-4 flex-1">
        <Text className="mb-1 text-sm font-bold text-white">WARNING</Text>
        <Text className="text-sm leading-5 text-white">
          Sending any other tokens, or sending {tokenName} to an incorrect address, or a different
          blockchain, may result in an irreversible loss of funds.
        </Text>
      </View>
    </View>
  );
}
