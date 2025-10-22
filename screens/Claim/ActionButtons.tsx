import { View } from 'react-native';
import PrimaryButton from 'components/PrimaryButton';
import OutlineButton from 'components/OutlineButton';
import { LockboxStatus } from './hooks/useClaimPayment';

interface ActionButtonsProps {
  status: LockboxStatus;
  loading: boolean;
  onVerify: () => void;
  onBack: () => void;
}

export const ActionButtons = ({ status, loading, onVerify, onBack }: ActionButtonsProps) => {
  // Show verification buttons when no lockbox data
  if (status === 'UNKNOWN') {
    return (
      <View className="mt-10 flex-1 flex-row items-center justify-between space-x-3">
        <View className="mr-3 flex-1">
          <OutlineButton title="Cancel" onPress={onBack} />
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

  // Show back button for expired/claimed/reclaimed payments
  return (
    <View className="mt-10">
      <PrimaryButton className="w-full" title="Back" onPress={onBack} />
    </View>
  );
};
