import { ScrollView, View } from 'react-native';
import TopUpHeader from './DepositHeader';
import DepositAddressCard from './DepositAddressCard';
import InfoNote from './InfoNoteView';
import NavigationBar from 'components/NavigationBar';
import { AccountDataService } from 'business/services/AccountDataService';
import { useEffect, useState } from 'react';
import { ALL_TOKENS, TOKENS } from 'business/Constants';

export default function DepositScreen() {
  const [forwarder, setForwarder] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedToken, setSelectedToken] = useState<keyof typeof TOKENS>(ALL_TOKENS[0]);

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

  return (
    <View className="flex-1 bg-[#fafafa]">
      <NavigationBar title="Deposit to Address" />

      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{
          paddingBottom: 40, // ensures full visibility even on small screens
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View className="py-4">
          <TopUpHeader selectedToken={selectedToken} setSelectedToken={setSelectedToken} />
          <DepositAddressCard address={forwarder || ''} token={selectedToken} />
          <InfoNote />
        </View>
      </ScrollView>
    </View>
  );
}
