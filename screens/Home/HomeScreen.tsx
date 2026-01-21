import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import HeaderView from 'components/HeaderView';
import BalanceView from './BalanceView';
import QuickActionsView from './QuickActionView';
import PingHistoryView from './PingHistoryView';
import HongBaoPopup from 'components/HongBaoPopup';
import { BalanceEntry } from 'business/Types';
import { BalanceService } from 'business/services/BalanceService';
import { AccountDataService } from 'business/services/AccountDataService';
import { ContractService } from 'business/services/ContractService';
import { RecordService } from 'business/services/RecordService';
import { Utils } from 'business/Utils';
import { GLOBALS, MIN_AMOUNT } from 'business/Constants';
import { showLocalizedAlert } from 'components/LocalizedAlert';
import { useAppDispatch, useCurrentAccountStablecoinBalance } from 'store/hooks';
import { fetchRecentHistoryToRedux } from 'store/historyThunks';
import { useFocusEffect } from '@react-navigation/native';
import { showFlashMessage } from 'utils/flashMessage';
import { push } from 'navigation/Navigation';

export default function HomeScreen() {
  const dispatch = useAppDispatch();
  const balanceService = useMemo(() => BalanceService.getInstance(), []);
  const accountDataService = useMemo(() => AccountDataService.getInstance(), []);
  const contractService = useMemo(() => ContractService.getInstance(), []);
  const recordService = useMemo(() => RecordService.getInstance(), []);
  const { stablecoinBalance: totalBalance } = useCurrentAccountStablecoinBalance();
  const [loading, setLoading] = useState(false);
  const [showHongBaoPopup, setShowHongBaoPopup] = useState(true); // Show popup on first load

  const confirmTopUp = useCallback((message: string, okOnly = false) => {
    if (okOnly) {
      return showLocalizedAlert({ message });
    }

    return showLocalizedAlert({
      message,
      buttons: [
        { text: 'Cancel', style: 'cancel', onPress: () => {} },
        { text: 'Confirm', onPress: () => {} },
      ],
    });
  }, []);


  /**
   * Update balance following the flow from update_balance.md:
   * 1. Check forwarder exists
   * 2. Get forwarder balance
   * 3. For each amount >= MIN_AMOUNT, retrieve and refresh
   * 4. Always refresh balance and records at the end
   */
  const updateBalance = useCallback(async () => {

    // Step 1: Get forwarder
    const forwarder = await accountDataService.getForwarder();

    if (!forwarder) {
      // No forwarder, no API calls needed
      return;
    }

    try {
      // Step 2: Get forwarder balance
      const ret1 = await contractService.getForwarderBalance(forwarder);

      const sessionGlobals = Utils.getSessionObject(GLOBALS);
      const minAmountValue = sessionGlobals?.[MIN_AMOUNT];

      if (minAmountValue === undefined) {
        console.warn('⚠️ MIN_AMOUNT missing from session globals.');
        // Still refresh balance even if MIN_AMOUNT is missing
        await balanceService.getBalance();
        
        // Don't await updateRecord - it has 3s delay!
        void recordService.updateRecord();
        return;
      }

      const kMinAmount = BigInt(minAmountValue);

      // Step 3: Check each amount for top-up retrieval
      for (const amountEntry of ret1?.amounts ?? []) {
        if (BigInt(amountEntry.amount) >= kMinAmount) {
          try {
            const cr = contractService.getCrypto();
            if (!cr?.commitment) {
              console.warn('⚠️ Missing commitment for retrieve call.');
              continue;
            }

            // Retrieve balance
            await contractService.retrieve(cr.commitment);

            // Refresh balance after retrieve
            await balanceService.getBalance();

            // Update records with delay (3s default) - fire and forget
            void recordService.updateRecord();

            // Fetch recent history to redux after 3s delay (wait for data to be ready)
            setTimeout(() => {
              void fetchRecentHistoryToRedux(dispatch);
            }, 3000);
            // Show confirmation dialog
            await confirmTopUp('_ALERT_RECEIVED_TOPUP', true);

            return; // Return after first successful retrieve
          } catch (err) {
            console.error('RETRIEVE', err);
            // Continue to next amount if retrieve fails
          }
        }
      }

      // Step 4: Always refresh balance and records at the end
      await balanceService.getBalance();

      // Don't await updateRecord - it has 3s delay! This was the bottleneck!
      void recordService.updateRecord();
    } catch (err) {
      console.error('GET_FORWARDER_BALANCE', err);
      // On error, still try to refresh balance
      try {
        await balanceService.getBalance();
      } catch (balanceErr) {
        console.error('Failed to refresh balance after error:', balanceErr);
      }
    }
  }, [accountDataService, contractService, balanceService, recordService, confirmTopUp]);

  const handleRefresh = useCallback(async () => {
    if (loading) return;
    try {
      setLoading(true);
      await updateBalance();
    } catch (error) {
      console.error('Failed to refresh balance:', error);
    } finally {      
      setLoading(false);
    }
  }, [loading, updateBalance]);

  // Auto-refresh when screen is focused (including first mount)
  useFocusEffect(
    useCallback(() => {
      void handleRefresh();
      void fetchRecentHistoryToRedux(dispatch);
    }, [])
  );

  const handleSendHongBao = useCallback(() => {
    // Navigate to HongBao creation screen
    push('HongBao');
  }, []);

  return (
    <View className="flex-1 bg-[#FD4912]">
      <SafeAreaView edges={['top']} />
      <View className="relative flex-1">
        <View className="absolute right-0 bottom-0 left-0 h-[30%] bg-[#FAFAFA]" />

        <HeaderView title="Home" variant="dark" />

        <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
          <View className="flex-1 justify-end">
            <BalanceView
              balance={`$${totalBalance || '0.00'}`}
              onRefresh={handleRefresh}
              loading={loading}
            />
          </View>

          <View className="mt-10 flex-1 rounded-t-3xl bg-[#FAFAFA] pt-6 pb-12">
            <QuickActionsView />
            <PingHistoryView />
          </View>
        </ScrollView>
      </View>

      {/* HongBao Popup */}
      <HongBaoPopup
        visible={showHongBaoPopup}
        onClose={() => setShowHongBaoPopup(false)}
        onSendHongBao={handleSendHongBao}
      />
    </View>
  );
}
