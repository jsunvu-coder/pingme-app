import { useMemo, forwardRef, useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Keyboard, Alert, Platform } from 'react-native';
import BottomSheetModal, { BottomSheetModalRef } from 'components/BottomSheetModal';
import CloseButton from 'components/CloseButton';
import WarningIcon from 'assets/WarningIcon';
import PrimaryButton from 'components/PrimaryButton';
import WithdrawlIcon from 'assets/WithdrawlIcon';
import WalletAddIcon from 'assets/WalletAddIcon';
import { Utils } from 'business/Utils';
import { CryptoUtils } from 'business/CryptoUtils';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import DownloadRectangleAltIcon from 'assets/DownloadRectangleAltIcon';
import WalletSendIcon from 'assets/WalletSendIcon';
import WalletSimpleIcon from 'assets/WalletSimpleIcon';
import { t } from 'i18n';

type AirdropWithdrawSheetProps = {
  tokenInfo: {
    entry: {
      amount: string;
      token: string;
    };
    name: string;
  };
  onConfirm: (walletAddress: string) => Promise<void>;
  visible: boolean;
  onClose: () => void;
};

const AirdropWithdrawSheet = forwardRef<BottomSheetModalRef, AirdropWithdrawSheetProps>(
  ({ tokenInfo, onConfirm, visible, onClose }, ref) => {
    const [walletAddress, setWalletAddress] = useState('');
    const [loading, setLoading] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [inputYPosition, setInputYPosition] = useState<number>(0);
    const inputRef = useRef<TextInput>(null);
    const inputContainerRef = useRef<View>(null);

    const formattedAmount = useMemo(() => {
      return Utils.formatMicroToUsd(tokenInfo.entry.amount, undefined, {
        grouping: true,
        empty: '0',
      });
    }, [tokenInfo.entry.amount]);

    const displayWalletAddress = useMemo(() => {
      if (!walletAddress) return '';
      // Show full address when focused, truncated when not focused
      if (isFocused) return walletAddress;
      // Truncate when not focused
      if (walletAddress.length <= 10) return walletAddress;
      return `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
    }, [walletAddress, loading, isFocused]);

    const handlePasteWallet = useCallback(async () => {
      try {
        const txt = await Clipboard.getStringAsync();
        if (txt) setWalletAddress(txt.trim());
      } catch (err) {
        console.error('Failed to paste wallet address:', err);
      }
    }, []);

    const handleConfirm = useCallback(async () => {
      Keyboard.dismiss();

      if (!walletAddress.trim()) {
        Alert.alert(
          t('AUTH_LOGIN_ERROR_TITLE', undefined, 'Error'),
          t('AIRDROP_ERROR_ENTER_WALLET', undefined, 'Please enter a wallet address')
        );
        return;
      }

      if (!CryptoUtils.isAddr(walletAddress.trim())) {
        Alert.alert(
          t('AUTH_LOGIN_ERROR_TITLE', undefined, 'Error'),
          t('AIRDROP_ERROR_INVALID_WALLET', undefined, 'Invalid wallet address')
        );
        return;
      }

      setLoading(true);
      try {
        await onConfirm(walletAddress.trim());
        (ref as any)?.current?.close();
        onClose();
        setWalletAddress('');
      } catch (error) {
        console.error('Withdraw failed:', error);
        Alert.alert(
          t('AUTH_LOGIN_ERROR_TITLE', undefined, 'Error'),
          t('AIRDROP_ERROR_WITHDRAW_FAILED', undefined, 'Failed to withdraw. Please try again.')
        );
      } finally {
        setLoading(false);
      }
    }, [walletAddress, onConfirm, ref, onClose]);

    const handleClose = useCallback(() => {
      (ref as any)?.current?.close();
      onClose();
    }, [ref, onClose]);

    const handleInputLayout = useCallback(
      (event: any) => {
        // Get input position from onLayout event (relative to parent View)
        // This position is relative to the content container
        const { y } = event.nativeEvent.layout;
        setInputYPosition(y);
        // Store for keyboard scroll
        if ((ref as any)?.current?.setInputPosition) {
          (ref as any).current.setInputPosition(y);
        }
      },
      [ref]
    );

    const handleInputFocus = useCallback(() => {
      setIsFocused(true);
      // Restore full address when focusing (in case it was truncated)
      if (inputRef.current && walletAddress) {
        // The value will be restored automatically since we use walletAddress state
        inputRef.current.setNativeProps({ text: walletAddress });
      }
      // Expand bottom sheet immediately (no delay for smooth animation)
      (ref as any)?.current?.expand();

      // Scroll to input: measure and scroll immediately when focus
      // iOS needs earlier scroll timing than Android
      const delay = Platform.OS === 'ios' ? 50 : 0;

      setTimeout(() => {
        if (inputContainerRef.current) {
          inputContainerRef.current.measure((x, y, width, height, pageX, pageY) => {
            // Store position for keyboard scroll
            if ((ref as any)?.current?.setInputPosition) {
              (ref as any).current.setInputPosition(pageY);
            }

            // Scroll to input position - calculate scrollY with larger offset for iOS
            const offset = Platform.OS === 'ios' ? 250 : 150; // iOS needs more space above keyboard
            const scrollY = Math.max(0, pageY - offset);

            if ((ref as any)?.current?.scrollTo) {
              // Scroll immediately
              (ref as any).current.scrollTo(scrollY);

              // iOS: scroll multiple times during keyboard animation for smooth effect
              if (Platform.OS === 'ios') {
                // Scroll again during keyboard animation (mid point)
                setTimeout(() => {
                  if ((ref as any)?.current?.scrollTo) {
                    (ref as any).current.scrollTo(scrollY);
                  }
                }, 150);
                // One more time near end of animation
                setTimeout(() => {
                  if ((ref as any)?.current?.scrollTo) {
                    (ref as any).current.scrollTo(scrollY);
                  }
                }, 300);
              } else {
                // Android: scroll once more after short delay
                setTimeout(() => {
                  if ((ref as any)?.current?.scrollTo) {
                    (ref as any).current.scrollTo(scrollY);
                  }
                }, 100);
              }
            }
          });
        } else {
          // Fallback: scroll to approximate position
          if ((ref as any)?.current?.scrollTo) {
            (ref as any).current.scrollTo(350);
          }
        }
      }, delay);
    }, [ref]);

    return (
      <BottomSheetModal visible={visible} onClose={onClose} ref={ref} enableDynamicSizing>
        <View className="px-6 py-4">
          <CloseButton className="flex-row justify-end" onPress={handleClose} />

          {/* Icon and Title */}
          <View className="mb-6 items-center">
            <DownloadRectangleAltIcon width={80} height={80} />
            <Text className="mt-6 text-center text-2xl font-bold text-[#0F0F0F]">
              {t('AIRDROP_WITHDRAW_REWARDS', undefined, 'Withdraw rewards')}
            </Text>
          </View>

          {/* Summary Card */}
          <View className="mt-6 flex-row rounded-2xl p-4">
            <View>
              <Text className="mb-4 text-base text-[#909090]">
                {t('AIRDROP_TOTAL_AMOUNT', undefined, 'Total Amount')}
              </Text>
              <Text className="mb-4 text-base text-[#909090]">
                {t('AIRDROP_NETWORK', undefined, 'Network')}
              </Text>
              <Text className="text-base text-[#909090]">
                {t('AIRDROP_ESTIMATED_TIME', undefined, 'Estimated Time')}
              </Text>
            </View>
            <View className="ml-4">
              <Text className="mb-4 text-base font-normal text-[#0F0F0F]">
                {formattedAmount} ${tokenInfo.name}
              </Text>
              <Text className="mb-4 text-base font-normal text-[#0F0F0F]">
                {t('AIRDROP_NETWORK_MONAD', undefined, 'Monad')}
              </Text>
              <Text className="text-base font-normal text-[#0F0F0F]">
                {t('AIRDROP_ESTIMATED_TIME_VALUE', undefined, '~30-60 seconds')}
              </Text>
            </View>
          </View>

          {/* Wallet Address Input */}
          <View
            ref={inputContainerRef}
            onLayout={handleInputLayout}
            className="mt-4 rounded-2xl bg-white p-4">
            <View className="mb-4">
              <WalletSimpleIcon />
            </View>
            <View className="relative">
              <TextInput
                ref={inputRef}
                placeholder={t('WITHDRAW_WALLET_PLACEHOLDER', undefined, 'Enter wallet address')}
                placeholderTextColor="#909090"
                value={displayWalletAddress}
                onChangeText={setWalletAddress}
                onFocus={handleInputFocus}
                onBlur={() => setIsFocused(false)}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                multiline={false}
                className="h-12 flex-1 px-1 text-base text-[#0F0F0F]"
                style={{ textAlignVertical: 'center' }}
              />
              <View
                style={{
                  height: 2,
                  backgroundColor: walletAddress ? '#BEBEBE' : '#3B3A3A',
                  marginTop: 6,
                }}
              />
            </View>
          </View>

          {/* Warning Box */}
          <View className="mb-10 flex-row items-start rounded-2xl bg-[#FB1028] p-4">
            <View className="">
              <WarningIcon color="#ffffff" />
            </View>
            <View className="ml-4 flex-1">
              <Text className="mb-2 text-sm font-bold text-white uppercase">
                {t('WARNING', undefined, 'WARNING')}
              </Text>
              <Text className="text-sm leading-5 font-medium text-white">
                {t(
                  'WITHDRAW_WARNING_BODY',
                  undefined,
                  'Withdrawing USDC to an incorrect address, or one that does not support the Monad Network, may result in irreversible loss of funds.'
                )}
              </Text>
            </View>
          </View>
          {/* Confirm Button */}
          <View className="mb-4">
            <PrimaryButton
              title={t('AIRDROP_CONFIRM_AND_WITHDRAW', undefined, 'Confirm & Withdraw')}
              onPress={handleConfirm}
              loading={loading}
              loadingText={t('AIRDROP_PROCESSING', undefined, 'Processing...')}
            />
          </View>
        </View>
      </BottomSheetModal>
    );
  }
);

AirdropWithdrawSheet.displayName = 'AirdropWithdrawSheet';

export default AirdropWithdrawSheet;
