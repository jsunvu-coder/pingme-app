import { useState, useMemo } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import PrimaryButton from 'components/PrimaryButton';
import OutlineButton from 'components/OutlineButton';
import { useDepositFlow, type DepositPayload } from './hooks/useDepositFlow';
import { Utils } from 'business/Utils';

interface DepositFormProps {
  payload?: DepositPayload | null;
}

const shortenHash = (hash: string) => {
  if (!hash) return '';
  return hash.length <= 18 ? hash : `${hash.slice(0, 10)}...${hash.slice(-6)}`;
};

export default function DepositForm({ payload }: DepositFormProps) {
  const [qrValue, setQrValue] = useState('');
  const {
    balances,
    selectedBalance,
    stablecoinTotal,
    amount,
    setAmount,
    handleAmountBlur,
    commitment,
    setCommitment,
    selectBalance,
    withdrawAndDeposit,
    loading,
    txHash,
    copyTxHash,
    copied,
    scanned,
    handleQrResult,
    resetSection,
    formatMicroToUsd,
  } = useDepositFlow(payload);

  const availableBalance = useMemo(() => {
    if (!stablecoinTotal) return '$0.00';
    return `$${stablecoinTotal}`;
  }, [stablecoinTotal]);

  return (
    <View className="mt-10 rounded-2xl border border-[#F0F0F0] bg-white p-6 shadow-sm">
      <Text className="text-lg font-semibold text-[#0F0F0F]">Deposit & Commit</Text>
      <Text className="mt-1 text-sm text-[#606060]">
        Provide the target commitment and amount to move funds into your deposit address.
      </Text>

      <View className="mt-6">
        <Text className="text-xs font-semibold text-[#909090] uppercase">Select Balance</Text>
        {balances.length === 0 ? (
          <Text className="mt-3 text-sm text-[#A0A0A0]">No balances available.</Text>
        ) : (
          balances.map((entry) => {
            const isActive = selectedBalance?.token === entry.token;
            return (
              <TouchableOpacity
                key={entry.token}
                activeOpacity={0.8}
                onPress={() => selectBalance(entry)}
                className={`mt-3 rounded-2xl border px-4 py-3 ${
                  isActive ? 'border-[#FD4912] bg-[#FFF2EB]' : 'border-[#E5E5E5] bg-white'
                }`}>
                <Text className="text-sm font-semibold text-[#0F0F0F]">{entry.token}</Text>
                <Text className="mt-1 text-xs text-[#606060]">
                  Available: $
                  {Utils.formatMicroToUsd(
                    entry.amount,
                    undefined,
                    { grouping: true, empty: '0.00' },
                    Utils.getTokenDecimals(entry.token)
                  )}
                </Text>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      <View className="mt-6">
        <Text className="text-xs font-semibold text-[#909090] uppercase">Amount (USD)</Text>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          onBlur={handleAmountBlur}
          keyboardType="decimal-pad"
          placeholder="0.00"
          className="mt-2 rounded-2xl border border-[#E5E5E5] bg-white px-4 py-3 text-base text-[#0F0F0F]"
        />
        <Text className="mt-1 text-xs text-[#909090]">Available balance: {availableBalance}</Text>
      </View>

      <View className="mt-6">
        <Text className="text-xs font-semibold text-[#909090] uppercase">Commitment</Text>
        <TextInput
          value={commitment}
          onChangeText={setCommitment}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="0x..."
          className="mt-2 rounded-2xl border border-[#E5E5E5] bg-white px-4 py-3 text-base text-[#0F0F0F]"
        />
        {scanned ? <Text className="mt-1 text-xs text-emerald-600">QR data applied.</Text> : null}
      </View>

      <View className="mt-6">
        <Text className="text-xs font-semibold text-[#909090] uppercase">Paste Deposit Link</Text>
        <TextInput
          value={qrValue}
          onChangeText={setQrValue}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="https://app.pingme.xyz/deposit?commitment=..."
          className="mt-2 rounded-2xl border border-[#E5E5E5] bg-white px-4 py-3 text-sm text-[#0F0F0F]"
        />
        <OutlineButton
          title="Apply QR Link"
          onPress={() => {
            if (!qrValue.trim()) return;
            void handleQrResult(qrValue);
          }}
          className="mt-3 border-[#FD4912]"
        />
      </View>

      <View className="mt-8">
        <PrimaryButton
          title="Withdraw & Deposit"
          onPress={withdrawAndDeposit}
          loading={loading}
          disabled={loading}
          loadingText="Submitting"
        />
        <OutlineButton
          title="Reset Form"
          onPress={resetSection}
          className="mt-4 border-[#E5E5E5]"
        />
      </View>

      {txHash ? (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={copyTxHash}
          className="mt-8 rounded-2xl border border-[#E5E5E5] bg-[#F9FAFB] px-4 py-4">
          <Text className="text-xs font-semibold text-[#909090] uppercase">Transaction Hash</Text>
          <Text className="mt-2 text-sm font-semibold text-[#0F0F0F]">{shortenHash(txHash)}</Text>
          <Text className="mt-1 text-xs text-[#FD4912]">{copied ? 'Copied' : 'Tap to copy'}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
