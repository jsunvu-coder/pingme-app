import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { ScrollView } from 'react-native-gesture-handler';
import { setRootScreen, push } from 'navigation/Navigation';

// Components
import { PassphraseInput } from './PassphraseInput';
import { ClaimHeader } from './ClaimHeader';
import { VerificationCard } from './VerificationCard';
import { StatusCard } from './StatusCard';
import { ActionButtons } from './ActionButtons';

// Hooks and Utils
import { useClaimPayment } from './hooks/useClaimPayment';
import { validateClaimParams } from './utils/claimUtils';
import { AuthService } from 'business/services/AuthService';
import OutlineButton from 'components/OutlineButton';
import PrimaryButton from 'components/PrimaryButton';

export default function ClaimPaymentScreen() {
  const {
    passphrase,
    setPassphrase,
    loading,
    lockbox,
    lockboxProof,
    verifyError,
    derivedStatus,
    statusColorClass,
    headerSubtitle,
    handleVerify,
    formatUsdFromLockbox,
    username,
    lockboxSalt,
  } = useClaimPayment();

  // Validate params and redirect if invalid
  useEffect(() => {
    const validation = validateClaimParams({ lockboxSalt });
    if (!validation.isValid) {
      console.warn(`⚠️ ${validation.error}. Redirecting to AuthScreen.`);
      setRootScreen(['AuthScreen']);
    }
  }, [lockboxSalt]);

  const handleBack = async () => {
    const isLoggedIn = await AuthService.getInstance().isLoggedIn();
    if (isLoggedIn) {
      setRootScreen(['MainTab']);
    } else {
      setRootScreen(['AuthScreen']);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFA]">
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="flex-1 justify-between px-6 py-10">
          <View>
            <ClaimHeader />

            {!lockbox && (
              <View className="mt-6">
                <PassphraseInput
                  value={passphrase}
                  onChangeText={setPassphrase}
                  error={!!verifyError}
                  errorMessage={verifyError || undefined}
                />
              </View>
            )}

            {!!lockbox && (
              <View className="mt-6">
                <VerificationCard
                  status={derivedStatus}
                  statusColorClass={statusColorClass}
                  headerSubtitle={headerSubtitle}
                />
                <StatusCard
                  lockbox={lockbox}
                  status={derivedStatus}
                  statusColorClass={statusColorClass}
                />
              </View>
            )}
          </View>

          <View className="mt-10 flex-1 flex-row items-center justify-between space-x-3">
            <View className="mr-3 flex-1">
              <OutlineButton title="Cancel" onPress={handleBack} />
            </View>
            <View className="ml-3 flex-1">
              <PrimaryButton title="Claim" onPress={handleVerify} />
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
