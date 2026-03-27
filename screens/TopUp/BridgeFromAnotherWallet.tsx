import { FlatList, Image, Linking, Text, TouchableOpacity, View } from 'react-native';

import ArrowUpRightFromSquare from 'assets/Topup/ArrowUpRightFromSquare';
import NavigationBar from 'components/NavigationBar';
import { useEffect, useState } from 'react';
import { AccountDataService } from 'business/services/AccountDataService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const availUrl = (address: string) =>
  `https%3A%2F%2Ffastbridge.availproject.org%2Fmonad%2F%3Frecipient%3D${address}%26toChain%3D143%26token%3DUSDC`;

const WALLETS = [
  {
    name: 'MetaMask',
    icon: require('assets/Topup/WalletIcons/metamask.png'),
    universalUrl: (address: string) =>
      `https://metamask.app.link/dapp/https://fastbridge.availproject.org/monad/?recipient=${address}&toChain=143&token=USDC`,
    getUrl: (address: string) => `metamask://dapp?url=${availUrl(address)}`,
  },

  {
    name: 'Bitget Wallet',
    icon: require('assets/Topup/WalletIcons/bitget.png'),
    universalUrl: undefined,
    getUrl: (address: string) => `bitkeep://bkconnect?action=dapp&url=${availUrl(address)}`,
  },

  {
    name: 'Phantom',
    icon: require('assets/Topup/WalletIcons/phantom.png'),
    universalUrl: undefined,
    getUrl: (address: string) => `phantom://v1/browse?url=${availUrl(address)}`,
  },
  {
    name: 'Trust Wallet',
    icon: require('assets/Topup/WalletIcons/trust.png'),
    universalUrl: undefined,
    getUrl: (address: string) => `trust://open_url?coin_id=60&url=${availUrl(address)}`,
  },
];

export default function BridgeFromAnotherWalletScreen() {
  const [forwarder, setForwarder] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadForwarder = async () => {
      try {
        setLoading(true);
        const accountData = AccountDataService.getInstance();
        const fwd = await accountData.getForwarder();
        if (mounted) {
          setForwarder(fwd);
          setError(null);
        }
      } catch (err) {
        console.error('❌ Failed to load forwarder:', err);
        if (mounted) setError('Failed to retrieve deposit address');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadForwarder();
    return () => {
      mounted = false;
    };
  }, []);

  const { bottom } = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-[#fafafa]">
      <NavigationBar title="Available Wallets" />

      <View style={{ flex: 1, paddingHorizontal: 16, paddingBottom: bottom + 16 }}>
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
              <WalletItem wallet={item} address={forwarder} />
            </View>
          )}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
        <Text className="text-center text-sm text-gray-400">
          Only show wallets that are installed on your device.
        </Text>
      </View>
    </View>
  );
}

const WalletItem = ({
  wallet,
  address,
}: {
  wallet: (typeof WALLETS)[0];
  address: string | null;
}) => {
  const [isInstalled, setIsInstalled] = useState<boolean>(true);

  useEffect(() => {
    const checkInstalled = async () => {
      try {
        const url = wallet.getUrl(address || '');
        const canOpen = await Linking.canOpenURL(url);
        setIsInstalled(canOpen);
      } catch {
        setIsInstalled(false);
      }
    };
    checkInstalled();
  }, [wallet, address]);

  const handleOpenWallet = () => {
    if (wallet.universalUrl) {
      Linking.openURL(wallet.universalUrl(address || ''));
    } else {
      const url = wallet.getUrl(address || '');
      Linking.openURL(url);
    }
  };

  return (
    <TouchableOpacity
      onPress={handleOpenWallet}
      disabled={!isInstalled}
      style={[
        { borderRadius: 16, backgroundColor: 'white', padding: 16 },
        !isInstalled ? { opacity: 0.2 } : undefined,
      ]}>
      <Image source={wallet.icon} className="h-12 w-12" />
      <View className="mt-2 flex-row items-center justify-between">
        <Text className="text-base font-bold">{wallet.name}</Text>
        <ArrowUpRightFromSquare width={16} height={16} color="#FD4912" />
      </View>
    </TouchableOpacity>
  );
};
