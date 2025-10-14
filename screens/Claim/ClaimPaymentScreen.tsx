import { View } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
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

  const handleSignin = () => {
    push('AuthScreen', {
      mode: 'login',
      headerType: 'simple',
      from: 'claim',
      lockboxProof,
      username,
      amountUsdStr: formatUsdFromLockbox(),
    });
  };

  const handleSignup = () => {
    push('AuthScreen', {
      mode: 'signup',
      headerType: 'simple',
      from: 'claim',
      lockboxProof,
      username,
      amountUsdStr: formatUsdFromLockbox(),
    });
  };

  const handleBack = () => {
    setRootScreen(['AuthScreen']);
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

          <ActionButtons
            status={derivedStatus}
            loading={loading}
            onVerify={handleVerify}
            onSignin={handleSignin}
            onSignup={handleSignup}
            onBack={handleBack}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
