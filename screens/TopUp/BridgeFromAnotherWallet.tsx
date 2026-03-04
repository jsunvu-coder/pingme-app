import { FlatList, Image, Text, View } from 'react-native';

import ArrowUpRightFromSquare from 'assets/Topup/ArrowUpRightFromSquare';
import NavigationBar from 'components/NavigationBar';

const WALLETS = [
  {
    name: 'MetaMask',
    icon: require('assets/Topup/WalletIcons/metamask.png'),
  },
  
{
    name: 'Bitget Wallet',
    icon: require('assets/Topup/WalletIcons/bitget.png'),
  },
  
  {
    name: 'Phantom',
    icon: require('assets/Topup/WalletIcons/phantom.png'),
  },
  {
    name: 'Trust Wallet',
    icon: require('assets/Topup/WalletIcons/trust.png'),
  },

];

export default function BridgeFromAnotherWalletScreen() {
  return (
    <View className="flex-1 bg-[#fafafa]">
      <NavigationBar title="Available Wallets" />

      <View className="flex-1 px-4">
        <FlatList
          data={WALLETS}
          keyExtractor={(item) => item.name}
          numColumns={2}
          columnWrapperStyle={{ columnGap: 12 }}
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: 40,
            paddingVertical: 16,
            rowGap: 12,
          }}
          renderItem={({ item }) => (
            <View className="flex-1">
              <WalletItem wallet={item} />
            </View>
          )}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      </View>
    </View>
  );
}


const WalletItem = ({ wallet }: { wallet: (typeof WALLETS)[0] }) => {
  return (
    <View className="mb-4 rounded-3xl bg-white p-4">
      <Image
        source={wallet.icon}
        className="h-12 w-12"
      />
      <View className="mt-2 flex-row items-center justify-between">
        <Text className="text-base font-bold">{wallet.name}</Text>
        <ArrowUpRightFromSquare width={16} height={16} color="#FD4912" />
      </View>
    </View>
  );
};