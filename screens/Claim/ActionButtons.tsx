import { View } from 'react-native';
import PrimaryButton from 'components/PrimaryButton';
import OutlineButton from 'components/OutlineButton';
import { LockboxStatus } from './hooks/useClaimPayment';

interface ActionButtonsProps {
  status: LockboxStatus;
  loading: boolean;
  onVerify: () => void;
  onSignin: () => void;
  onSignup: () => void;
  onBack: () => void;
}

export const ActionButtons = ({
  status,
  loading,
  onVerify,
  onSignin,
  onSignup,
  onBack,
}: ActionButtonsProps) => {
  // Show verification buttons when no lockbox data
  if (status === 'UNKNOWN') {
    return (
      <View className="mt-10 flex-row items-center gap-4">
        <OutlineButton className="min-w-0 flex-1 flex-shrink" title="Cancel" onPress={onBack} />
        <PrimaryButton
          title="Verify"
          onPress={onVerify}
          loadingText="Verifying"
          loading={loading}
          className="min-w-0 flex-1 flex-shrink"
        />
      </View>
    );
  }

  // Show signin/signup buttons when payment is available
  if (status === 'OPEN') {
    return (
      <View className="mt-10 flex-row items-center gap-4">
        <OutlineButton className="min-w-0 flex-1 flex-shrink" title="Sign in" onPress={onSignin} />
        <PrimaryButton title="Sign up" onPress={onSignup} className="min-w-0 flex-1 flex-shrink" />
      </View>
    );
  }

  // Show back button for expired/claimed/reclaimed payments
  return (
    <View className="mt-10">
      <OutlineButton className="w-full" title="Back" onPress={onBack} />
    </View>
  );
};
