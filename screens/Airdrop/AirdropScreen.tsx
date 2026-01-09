import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { ScrollView, StatusBar, View, Text, TouchableOpacity, RefreshControl } from 'react-native';
import HeaderView from 'components/HeaderView';
import OutlineButton from 'components/OutlineButton';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BalanceService } from 'business/services/BalanceService';
import { BalanceEntry } from 'business/Types';
import { Utils } from 'business/Utils';
import { TOKENS, TOKEN_NAMES, GLOBALS, MIN_AMOUNT } from 'business/Constants';
import BottomSheet from '@gorhom/bottom-sheet';
import AirdropWithdrawSheet from './AirdropWithdrawSheet';
import AirdropWithdrawSuccessModal from './AirdropWithdrawSuccessScreen';
import { BottomSheetModalRef } from 'components/BottomSheetModal';
import { ContractService } from 'business/services/ContractService';
import { AuthService } from 'business/services/AuthService';
import { RecordService } from 'business/services/RecordService';
import { CryptoUtils } from 'business/CryptoUtils';
import { showFlashMessage } from 'utils/flashMessage';
import MonadIcon from 'assets/MonadIcon';
import { t } from 'i18n';

interface TokenInfo {
  entry: BalanceEntry;
  name: string;
  isStablecoin: boolean;
}

function TokenCard({
  tokenInfo,
  onWithdraw,
}: {
  tokenInfo: TokenInfo;
  onWithdraw: (tokenInfo: TokenInfo) => void;
}) {
  const amount = useMemo(() => {
    return Utils.formatMicroToUsd(tokenInfo.entry.amount, undefined, {
      grouping: true,
      empty: '0',
    });
  }, [tokenInfo.entry.amount]);

  const hasBalance = useMemo(() => {
    try {
      return BigInt(tokenInfo.entry.amount) > 0n;
    } catch {
      return false;
    }
  }, [tokenInfo.entry.amount]);

  const handleWithdraw = () => {
    onWithdraw(tokenInfo);
  };

  // Generate a color based on token name for the icon
  const getTokenColor = (name: string) => {
    if (name === 'USDC') return '#8B5CF6'; // Purple
    if (name === 'pWMON') return '#6366F1'; // Indigo
    return '#A855F7'; // Default purple
  };

  return (
    <View className="mb-3 flex-row items-center rounded-2xl p-4">
      {/* Token Icon */}
      <MonadIcon />

      {/* Token Info */}
      <View className="ml-4 flex-1">
        <Text className="text-base font-bold text-black">${tokenInfo.name}</Text>
        <Text className="mt-1 text-sm text-[#444]">{amount}</Text>
      </View>

      {/* Withdraw Button */}
      <OutlineButton
        title={t('WITHDRAW', undefined, 'Withdraw')}
        onPress={handleWithdraw}
        disabled={!hasBalance}
        borderColor={hasBalance ? '#FD4912' : '#D1D5DB'}
        textColor={hasBalance ? '#0F0F0F' : '#909090'}
        className="h-9 rounded-full border bg-white px-4 py-2"
      />
    </View>
  );
}

export default function AirdropScreen() {
  const balanceService = useMemo(() => BalanceService.getInstance(), []);
  const contractService = useMemo(() => ContractService.getInstance(), []);
  const authService = useMemo(() => AuthService.getInstance(), []);
  const recordService = useMemo(() => RecordService.getInstance(), []);

  const [balances, setBalances] = useState<BalanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTokenInfo, setSelectedTokenInfo] = useState<TokenInfo | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [successData, setSuccessData] = useState<{
    amount: string;
    tokenName: string;
    walletAddress: string;
    txHash: string;
  } | null>(null);

  const sheetRef = useRef<BottomSheetModalRef>(null);
  const successSheetRef = useRef<BottomSheetModalRef>(null);

  useEffect(() => {
    const onUpdate = (updated: BalanceEntry[]) => {
      setBalances(updated);
      setLoading(false);
    };

    balanceService.onBalanceChange(onUpdate);
    void balanceService.getBalance();

    return () => {
      balanceService.offBalanceChange(onUpdate);
    };
  }, [balanceService]);

  // Map balances to token info and separate by type
  const tokenInfos = useMemo(() => {
    const usdcAddress = TOKENS.USDC.toLowerCase();
    const pWmonAddress = TOKENS.pWMON.toLowerCase();

    return balances
      .map((entry) => {
        const tokenAddress = entry.token.toLowerCase();
        let name = '';
        let isStablecoin = false;

        if (tokenAddress === usdcAddress) {
          name = TOKEN_NAMES.USDC;
          isStablecoin = true;
        } else if (tokenAddress === pWmonAddress) {
          name = TOKEN_NAMES.pWMON;
          isStablecoin = false;
        } else {
          // Unknown token, skip or use address
          return null;
        }

        return {
          entry,
          name,
          isStablecoin,
        } as TokenInfo;
      })
      .filter((info): info is TokenInfo => info !== null);
  }, [balances]);

  const nonStablecoins = useMemo(() => tokenInfos.filter((t) => !t.isStablecoin), [tokenInfos]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await balanceService.getBalance();
    setBalances(balanceService.currentBalances);
    setRefreshing(false);
  }, [balanceService]);

  const handleWithdrawClick = useCallback((tokenInfo: TokenInfo) => {
    setSelectedTokenInfo(tokenInfo);
    setSheetVisible(true);
  }, []);

  const handleSheetClose = useCallback(() => {
    setSheetVisible(false);
    setSelectedTokenInfo(null);
  }, []);

  const getLatestWithdrawTxHash = useCallback(
    async (params: {
      token: string;
      microAmount: bigint;
      walletAddress: string;
      maxAttempts?: number;
      delayMs?: number;
    }): Promise<string> => {
      const {
        token: tokenParam,
        microAmount,
        walletAddress: walletParam,
        maxAttempts = 10,
        delayMs = 1000,
      } = params;

      const normalizedToken = (tokenParam ?? '').toLowerCase();
      const normalizedWallet = (walletParam ?? '').toLowerCase();
      const expectedAmount = microAmount;

      const commitment = contractService.getCrypto()?.commitment?.toLowerCase?.() ?? '';
      if (!commitment) return '';

      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        try {
          const ret = await contractService.getEvents(commitment, 10);
          const events = (ret?.events ?? []) as any[];

          const match = events.find((e) => {
            const action = Number(e?.action ?? -1);
            if (action !== 7) return false; // 7 = Withdrawal

            const addr = (e?.addr ?? e?.recipient ?? '').toString().toLowerCase();
            if (normalizedWallet && addr && addr !== normalizedWallet) return false;

            const tokenFromEvent = (e?.token ?? '').toString().toLowerCase();
            if (normalizedToken && tokenFromEvent && tokenFromEvent !== normalizedToken)
              return false;

            try {
              const amountFromEvent = BigInt((e?.amount ?? '0').toString());
              return amountFromEvent === expectedAmount;
            } catch {
              return false;
            }
          });

          const txHash =
            match?.txHash ??
            match?.tx_hash ??
            match?.transactionHash ??
            match?.transaction_hash ??
            '';
          if (txHash) return txHash;
        } catch (err) {
          console.error('[AirdropWithdraw] getLatestWithdrawTxHash failed:', err);
        }

        if (attempt < maxAttempts - 1) {
          await new Promise((r) => setTimeout(r, delayMs));
        }
      }

      return '';
    },
    [contractService]
  );

  const handleWithdrawConfirm = useCallback(
    async (walletAddress: string) => {
      if (!selectedTokenInfo) return;

      try {
        const cr = contractService.getCrypto();
        if (!cr?.commitment) {
          throw new Error('Missing commitment');
        }

        const nextCurrentSalt = CryptoUtils.globalHash(cr.current_salt);
        if (!nextCurrentSalt) throw new Error('Failed to generate next current salt');
        const nextProof = CryptoUtils.globalHash2(cr.input_data, nextCurrentSalt);
        if (!nextProof) throw new Error('Failed to generate next proof');
        const nextCommitment = CryptoUtils.globalHash(nextProof);
        if (!nextCommitment) throw new Error('Failed to generate next commitment');
        const commitmentHash = CryptoUtils.globalHash(nextCommitment);
        if (!commitmentHash) throw new Error('Failed to generate commitment hash');

        const microAmount = BigInt(selectedTokenInfo.entry.amount);
        const minAmount = BigInt(Utils.getSessionObject(GLOBALS)[MIN_AMOUNT]);

        if (microAmount < minAmount) {
          throw new Error('Amount below minimum');
        }

        const result = await authService.commitProtect(
          () =>
            contractService.withdraw(
              selectedTokenInfo.entry.token,
              microAmount.toString(),
              cr.proof,
              nextCommitment,
              walletAddress
            ),
          cr.commitment,
          commitmentHash
        );

        cr.current_salt = nextCurrentSalt;
        cr.proof = nextProof;
        cr.commitment = nextCommitment;
        contractService.setCrypto(cr);

        await balanceService.getBalance();
        await recordService.updateRecord();

        const fallbackTxHash =
          (result as any)?.txHash ??
          (result as any)?.tx_hash ??
          (result as any)?.transactionHash ??
          '';
        const txHash =
          (await getLatestWithdrawTxHash({
            token: selectedTokenInfo.entry.token,
            microAmount,
            walletAddress,
          })) || fallbackTxHash;

        // Close bottom sheet and show success modal
        setSheetVisible(false);
        setSelectedTokenInfo(null);

        setSuccessData({
          amount: selectedTokenInfo.entry.amount,
          tokenName: selectedTokenInfo.name,
          walletAddress,
          txHash,
        });
        setSuccessModalVisible(true);
      } catch (error) {
        console.error('Withdraw failed:', error);
        showFlashMessage({
          title: t('_ALERT_WITHDRAW_FAILED', undefined, 'Withdraw failed'),
          message: t(
            'AIRDROP_ERROR_WITHDRAW_FAILED',
            undefined,
            'Failed to withdraw. Please try again.'
          ),
          type: 'danger',
        });
        throw error;
      }
    },
    [
      selectedTokenInfo,
      contractService,
      authService,
      balanceService,
      recordService,
      getLatestWithdrawTxHash,
    ]
  );

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <StatusBar barStyle="dark-content" />
      <SafeAreaView edges={['top']} />

      <HeaderView title={t('AIRDROP_REWARDS', undefined, 'Rewards')} variant="light" />

      <ScrollView
        className="m-6"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
        <Text className="mb-4 text-sm font-semibold text-[#444] uppercase">
          {t('AIRDROP_AVAILABLE_TOKENS', undefined, 'Available Tokens')}
        </Text>

        {/* Only Non-Stablecoins */}
        {nonStablecoins.length > 0 && (
          <View>
            {nonStablecoins.map((tokenInfo) => (
              <View key={tokenInfo.entry.token} className="mb-4">
                <TokenCard tokenInfo={tokenInfo} onWithdraw={handleWithdrawClick} />
              </View>
            ))}
          </View>
        )}

        {/* Empty State */}
        {!loading && nonStablecoins.length === 0 && (
          <View className="mt-8 items-center py-12">
            <Text className="text-base text-gray-400">
              {t('AIRDROP_NO_TOKENS_AVAILABLE', undefined, 'No tokens available')}
            </Text>
          </View>
        )}

        {/* TEST BUTTON - Remove after testing UI */}
        {/* <TouchableOpacity
          onPress={() => {
            setSuccessData({
              amount: '1000000000', // 1.00 token (in micro units)
              tokenName: 'pWMON',
              walletAddress: '0x1234567890123456789012345678901234567890',
              txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
            });
            setSuccessModalVisible(true);
          }}
          className="mt-8 rounded-full bg-[#FD4912] px-6 py-4"
          activeOpacity={0.8}>
          <Text className="text-center text-lg font-bold text-white">
            [TEST] Show Success Modal
          </Text>
        </TouchableOpacity> */}
      </ScrollView>

      {/* Withdraw Bottom Sheet */}
      {selectedTokenInfo && (
        <AirdropWithdrawSheet
          ref={sheetRef}
          tokenInfo={selectedTokenInfo}
          onConfirm={handleWithdrawConfirm}
          visible={sheetVisible}
          onClose={handleSheetClose}
        />
      )}

      {/* Success Modal */}
      {successData && (
        <AirdropWithdrawSuccessModal
          ref={successSheetRef}
          visible={successModalVisible}
          amount={successData.amount}
          tokenName={successData.tokenName}
          walletAddress={successData.walletAddress}
          txHash={successData.txHash}
          onClose={() => {
            setSuccessModalVisible(false);
            setSuccessData(null);
          }}
        />
      )}
    </View>
  );
}
