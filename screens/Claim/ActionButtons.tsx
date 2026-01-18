import { View } from 'react-native';
import PrimaryButton from 'components/PrimaryButton';
import OutlineButton from 'components/OutlineButton';
import { LockboxStatus } from './hooks/useClaimPayment';

interface ActionButtonsProps {
  status: LockboxStatus;
  loading: boolean;
  onVerify: () => void;
  onClaim: () => void;
  onBack: () => void;
  hasLockbox: boolean;
}

export const ActionButtons = ({
  status,
  loading,
  onVerify,
  onClaim,
  onBack,
  hasLockbox,
}: ActionButtonsProps) => {
  // Before verification (no lockbox yet): passphrase -> verify.
  if (!hasLockbox) {
    return (
      <View className="mt-10 flex-1 flex-row items-center justify-between space-x-3">
        <View className="mr-3 flex-1">
          <OutlineButton disabled={loading} title="Cancel" onPress={onBack} />
        </View>
        <View className="ml-3 flex-1">
          <PrimaryButton
            title="Claim"
            onPress={onVerify}
            loading={loading}
            loadingText="Claiming"
          />
        </View>
      </View>
    );
  }

  // After verification: if still open, allow claiming (or re-attempt).
  if (status === 'OPEN') {
    return (
      <View className="mt-10 flex-1 flex-row items-center justify-between space-x-3">
        <View className="mr-3 flex-1">
          <OutlineButton title="Back" onPress={onBack} />
        </View>
        <View className="ml-3 flex-1">
          <PrimaryButton title="Claim" onPress={onClaim} loading={loading} loadingText="Claiming" />
        </View>
      </View>
    );
  }

  // Expired/claimed/reclaimed payments: back only.
  return (
    <View className="mt-10">
      <PrimaryButton className="w-full" title="Back" onPress={onBack} />
    </View>
  );
};
