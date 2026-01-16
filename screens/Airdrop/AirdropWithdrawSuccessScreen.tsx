import { useMemo, forwardRef, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomSheetModal, { BottomSheetModalRef } from 'components/BottomSheetModal';
import CloseButton from 'components/CloseButton';
import * as WebBrowser from 'expo-web-browser';
import { showFlashMessage } from 'utils/flashMessage';
import { Utils } from 'business/Utils';
import { ENV } from 'business/Config';
import * as Clipboard from 'expo-clipboard';
import CheckAllIcon from 'assets/CheckAllIcon';
import { t } from 'i18n';

type AirdropWithdrawSuccessModalProps = {
  visible: boolean;
  amount?: string;
  tokenName?: string;
  walletAddress?: string;
  tokenAddress?: string;
  txHash?: string;
  onClose: () => void;
};

const AirdropWithdrawSuccessModal = forwardRef<
  BottomSheetModalRef,
  AirdropWithdrawSuccessModalProps
>(
  (
    {
      visible,
      amount = '0',
      tokenName = '',
      walletAddress = '',
      tokenAddress = '',
      txHash = '',
      onClose,
    },
    ref
  ) => {
    const formattedAmount = useMemo(() => {
      const tokenDecimals = Utils.getTokenDecimals(tokenAddress);
      return Utils.formatMicroToUsd(
        amount,
        undefined,
        {
          grouping: true,
          empty: '0',
        },
        tokenDecimals
      );
    }, [amount, tokenName]);

    const truncatedWallet = useMemo(() => {
      if (!walletAddress || walletAddress.length <= 10) return walletAddress;
      return `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
    }, [walletAddress]);

    const handleViewOnMonadScan = async () => {
      if (!txHash) return;
      const normalizedHash = txHash.trim().replace(/[^\da-fA-Fx]/g, '');
      const baseUrl =
        ENV === 'staging' ? 'https://testnet.monadvision.com' : 'https://monadvision.com';
      const url = `${baseUrl}/tx/${normalizedHash}`;

      try {
        await WebBrowser.openBrowserAsync(url);
      } catch (err) {
        console.error('Open tx details failed:', err);
        await Clipboard.setStringAsync(normalizedHash);
        showFlashMessage({
          title: t('AUTH_LOGIN_ERROR_TITLE', undefined, 'Error'),
          message: t(
            'AIRDROP_ERROR_UNABLE_TO_OPEN_LINK',
            undefined,
            'Unable to open link. Transaction hash copied.'
          ),
          type: 'danger',
        });
      }
    };

    const handleClose = useCallback(() => {
      (ref as any)?.current?.close();
      onClose();
    }, [ref, onClose]);

    return (
      <BottomSheetModal visible={visible} onClose={onClose} ref={ref}>
        <View style={{ flex: 1, minHeight: '100%', padding: 24 }}>
          <CloseButton className="flex-row justify-end" onPress={handleClose} />

          {/* Scrollable Content */}
          <View style={{ flexGrow: 1 }}>
            {/* Success Icon and Title */}
            <View className="mt-8 items-center">
              <CheckAllIcon color="#14B957" width={80} height={80} />
              <Text className="mt-6 text-center text-3xl font-bold text-[#0F0F0F]">
                {t('AIRDROP_WITHDRAWAL_SUCCESSFUL', undefined, 'Withdrawal Successful')}
              </Text>
            </View>

            {/* Success Message */}
            <View className="mt-8 items-center px-4">
              <Text className="text-lg font-medium text-[#0F0F0F]">
                {t(
                  'AIRDROP_SUCCESS_MESSAGE',
                  { amount: formattedAmount, tokenName },
                  `${formattedAmount} $${tokenName} has been sent to your external wallet.`
                )}
              </Text>
            </View>
            <View className="mx-4 mt-4 h-px bg-[#FFDBD0]"></View>
            {/* Details Card */}
            <View className="mt-4 mb-8 flex-row rounded-2xl px-4">
              <View>
                <Text className="mb-4 text-base text-[#909090]">
                  {t('AIRDROP_TOTAL_AMOUNT', undefined, 'Total Amount')}
                </Text>
                <Text className="mb-4 text-base text-[#909090]">
                  {t('WALLET_ADDRESS', undefined, 'Wallet Address')}
                </Text>
                <Text className="text-base text-[#909090]">
                  {t('TX_HASH', undefined, 'Transaction Hash')}
                </Text>
              </View>
              <View className="ml-4">
                <Text className="mb-4 text-sm font-normal text-[#0F0F0F]">
                  {formattedAmount} ${tokenName}
                </Text>
                <Text className="mb-4 text-base font-normal text-[#0F0F0F]">{truncatedWallet}</Text>
                <TouchableOpacity
                  onPress={handleViewOnMonadScan}
                  className="flex-row items-center"
                  activeOpacity={0.8}>
                  <Text className="mr-2 text-base font-semibold text-[#FD4912]">
                    {t('AIRDROP_VIEW_ON_MONADSCAN', undefined, 'View on MonadScan')}
                  </Text>
                  <Ionicons name="open-outline" size={18} color="#3B3A3A" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Back Button - Sticky at bottom */}
          <View style={{ marginTop: 'auto', marginBottom: 24 }}>
            <TouchableOpacity
              onPress={handleClose}
              className="rounded-full bg-[#FFEDE7] px-8 py-4"
              activeOpacity={0.8}>
              <Text className="text-center text-lg font-bold text-[#FD4912]">
                {t('AIRDROP_BACK_TO_REWARDS', undefined, 'Back to Rewards')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </BottomSheetModal>
    );
  }
);

AirdropWithdrawSuccessModal.displayName = 'AirdropWithdrawSuccessModal';

export default AirdropWithdrawSuccessModal;
