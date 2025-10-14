import { View, Text } from 'react-native';
import { LockboxStatus } from './hooks/useClaimPayment';

interface VerificationCardProps {
  status: LockboxStatus;
  statusColorClass: string;
  headerSubtitle: string;
}

export const VerificationCard = ({
  status,
  statusColorClass,
  headerSubtitle,
}: VerificationCardProps) => (
  <View className="mt-6">
    <View className="rounded-3xl bg-black px-5 py-6">
      <Text className="text-center text-2xl font-semibold text-white">Verification Successful</Text>
      {!!headerSubtitle && (
        <Text className="mt-3 text-center text-lg text-white/90">{headerSubtitle}</Text>
      )}
    </View>
  </View>
);
