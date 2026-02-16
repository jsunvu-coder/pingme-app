import { Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCallback, useEffect } from 'react';
import { ScrollView } from 'react-native-gesture-handler';
import { setRootScreen } from 'navigation/Navigation';

// Components
import { PassphraseInput } from './PassphraseInput';
import { ClaimHeader } from './ClaimHeader';
import { VerificationCard } from './VerificationCard';
import { StatusCard } from './StatusCard';

// Hooks and Utils
import { useClaimPayment } from './hooks/useClaimPayment';
import { validateClaimParams } from './utils/claimUtils';
import { AuthService } from 'business/services/AuthService';
import { ActionButtons } from './ActionButtons';

import { t } from 'i18n';
import { KeyboardAwareScrollView, KeyboardStickyView } from 'react-native-keyboard-controller';

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
    handleClaim,
    username,
    lockboxSalt,
  } = useClaimPayment();

  const { bottom } = useSafeAreaInsets();

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
    <View style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
      <SafeAreaView edges={['top']} />
      <KeyboardAwareScrollView bottomOffset={250} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 16, paddingTop: 40 }}>
          <View>
            <ClaimHeader email={username} />

            {!lockbox && (
              <View className="mt-6">
                <PassphraseInput
                  value={passphrase}
                  onChangeText={setPassphrase}
                  error={!!verifyError}
                  errorMessage={verifyError || undefined}
                  disabled={loading}
                  helperText={t('_ENTER_PASSPHRASE_HELPER_TEXT')}
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
        </View>
      </KeyboardAwareScrollView>
      <KeyboardStickyView
        offset={{ closed: 0, opened: bottom }}
        style={{ backgroundColor: '#FAFAFA', paddingBottom: 16 + bottom }}>
        <View
          style={{
            paddingHorizontal: 16,
            minHeight: 72,
          }}>
          <ActionButtons
            marginTop={16}
            status={derivedStatus}
            loading={loading}
            onVerify={handleVerify}
            onClaim={handleClaim}
            onBack={handleBack}
            hasLockbox={!!lockbox && !!lockboxProof}
          />
        </View>
      </KeyboardStickyView>
    </View>
  );
}
