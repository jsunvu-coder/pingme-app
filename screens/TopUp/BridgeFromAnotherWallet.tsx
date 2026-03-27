import { FlatList, Image, Linking, Platform, Text, TouchableOpacity, View } from 'react-native';

import ArrowUpRightFromSquare from 'assets/Topup/ArrowUpRightFromSquare';
import NavigationBar from 'components/NavigationBar';
import { useEffect, useState } from 'react';
import { AccountDataService } from 'business/services/AccountDataService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const getAvailUrl = (address: string) =>
  encodeURIComponent(
    `https://fastbridge.availproject.org/monad/?recipient=${address}&toChain=143&token=USDC`
  );

const WALLETS = [
  {
    name: 'MetaMask',
    icon: require('assets/Topup/WalletIcons/metamask.png'),
    universalUrl: (address: string) =>{
      return `https://metamask.app.link/dapp/${getAvailUrl(address)}`
    },
    getUrl: (address: string) => `metamask://`,
  },

  {
    name: 'Bitget Wallet',
    icon: require('assets/Topup/WalletIcons/bitget.png'),
    // iOS: https://bkcode.vip (universal link, per iOS docs example)
    // Android: https://bkcode.vip (only supported format on Android per official docs tip)
    //   → shows download page if not installed, opens in-app browser if installed
    universalUrl: (address: string) =>
      `bitkeep://bkconnect?action=dapp&url=${getAvailUrl(address)}`,
    // iOS: canOpenURL('bitkeep://') works — 'bitkeep' declared in LSApplicationQueriesSchemes
    // Android: bitkeep:// is NOT registered in Bitget's intent filter on Android →
    //   return null to skip check and default to installed (universal link handles fallback)
    getUrl: () => Platform.select({ ios: 'bitkeep://', android: 'bitkeep://bkconnect' }),
  },

  {
    name: 'Phantom',
    icon: require('assets/Topup/WalletIcons/phantom.png'),
    // Universal link works on both iOS & Android (falls back to web if not installed)
    universalUrl: (address: string) => {
      return `https://phantom.app/ul/browse/${getAvailUrl(address)}?ref=${encodeURIComponent('https://fastbridge.availproject.org')}`;
    },
    // Custom scheme used only for canOpenURL install check (https:// always returns true)
    getUrl: () => 'phantom://',
  },
  {
    name: 'Trust Wallet',
    icon: require('assets/Topup/WalletIcons/trust.png'),
    // Universal link works on both iOS & Android (falls back to download page if not installed)
    universalUrl: (address: string) =>
      `https://link.trustwallet.com/open_url?coin_id=60&url=${getAvailUrl(address)}`,
    // trust://open_url is the documented path — more specific than bare trust://
    // which may not match Trust Wallet's intent filter on Android.
    getUrl: () => 'trust://open_url?coin_id=60&url=https://trustwallet.com',
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
        const checkUrl = wallet.getUrl(address || '');
        if (!checkUrl) {
          // null means the scheme can't be checked on this platform (e.g. bitkeep:// on Android).
          // Default to installed — the universal link handles the fallback gracefully.
          setIsInstalled(true);
          return;
        }
        const canOpen = await Linking.canOpenURL(checkUrl);
        setIsInstalled(canOpen);
      } catch {
        setIsInstalled(false);
      }
    };
    checkInstalled();
  }, [wallet]);

  const handleOpenWallet = () => {
    if (wallet.universalUrl) {
      Linking.openURL(wallet.universalUrl(address || ''));
    } else {
      const url = wallet.getUrl(address || '');
      if (url) Linking.openURL(url);
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
