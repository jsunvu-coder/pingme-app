import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Keyboard,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { goBack, setRootScreen } from 'navigation/Navigation';
import BackIcon from 'assets/BackIcon';
import * as SecureStore from 'expo-secure-store';
import { ContractService } from 'business/services/ContractService';
import { AuthService } from 'business/services/AuthService';
import { AccountDataService } from 'business/services/AccountDataService';
import { pendingSignupService } from 'business/services/PendingSignupService';
import { LoginViewModel } from 'screens/Onboarding/Auth/LoginViewModel';
import { deepLinkHandler } from 'business/services/DeepLinkHandler';
import { shareFlowService } from 'business/services/ShareFlowService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showFlashMessage } from 'utils/flashMessage';
import { CryptoUtils } from 'business/CryptoUtils';
import {
  accountSecureKey,
  accountDataKey,
  ACCOUNT_EMAILS_KEY,
  ACTIVE_ACCOUNT_EMAIL_KEY,
} from 'business/Constants';
import { OtpInput } from 'components/OtpInput';
import { EXPIRY_MS } from 'business/Config';
import { store } from 'store';
import { setMessagingKeysAvailable } from 'store/authSlice';

const C_BG = '#FAFAFA';
const C_BLACK = '#0F0F0F';
const C_BODY = '#444444';
const C_BORDER = '#E9E9E9';
const C_FOCUS = '#FD6D41';
const C_SUCCESS = '#14B957';
const C_ORANGE = '#FD4912';
const C_DIM_DIGIT = '#909090';

const OTP_LENGTH = 6;
const RESEND_START = 59;
const HEADER_SIDE = 40;
const OTP_GAP = 8;
/** Spec: signup OTP is valid for 10 minutes from /pm_register_key. */
const OTP_EXPIRY_MS = 10 * 60 * 1000;
/** Spec: more than 5 incorrect attempts forces the user to restart the flow. */
const MAX_ATTEMPTS = 5;

type VerifyEmailParams = {
  email?: string;
  /**
   * enc_key_ref returned by /pm_register_key.
   * Required for pm_verify_key (spec body: {enc_key_ref, v_code}).
   * In 'signup' / 'generate_new_key' modes this is read from PendingSignupService.
   */
  encKeyRef?: string;
  /**
   * 'signup' — verify OTP then complete account creation via PendingSignupService.
   * 'generate_new_key' — verify OTP then persist messaging keys for an already
   *     signed-in user (spec: Sign In step 2). No faucet, no setCrypto.
   * undefined / omitted — standalone verify screen; calls optional onCodeComplete.
   */
  mode?: 'signup' | 'generate_new_key';
  onCodeComplete?: (code: string) => void;
  bundle_uuid?: string;
  message?: string;
  /**
   * In 'generate_new_key' mode, when true, show a success flash message on the
   * home page after successful OTP verification. Set by manual triggers (e.g.
   * Account menu) so the post-login Alert flow stays silent.
   */
  showSuccessToast?: boolean;
};

const navigateToHongBaoVerification = (
  bundle_uuid: string,
  mode: 'signup' | 'login',
  message: string
) => {
  setRootScreen([
    {
      name: 'HongBaoVerificationScreen',
      params: { bundle_uuid, from: mode, message },
    },
  ]);
};

async function setupBiometrics(
  email: string,
  password: string,
  biometricType: string | undefined
): Promise<void> {
  const vm = new LoginViewModel();
  if (!vm.useBiometric) {
    const result = await vm.enableBiometricLogin(email, password, biometricType as any);
    if (!result.success && result.message) {
      showFlashMessage({ title: 'Face ID', message: result.message, type: 'warning' });
    }
  } else {
    await LoginViewModel.saveCredentials(email, password);
    await LoginViewModel.setUseBiometricPreference(true);
  }
}

function deriveCryptoParams(
  email: string,
  password: string
): { input_data: string; salt: string; proof: string; commitment: string } {
  const input_data = CryptoUtils.strToHex2(email, password);
  const salt = CryptoUtils.globalHash(input_data);
  if (!salt) throw new Error('Failed to generate salt.');
  const proof = CryptoUtils.globalHash2(input_data, salt);
  if (!proof) throw new Error('Failed to generate proof.');
  const commitment = CryptoUtils.globalHash(proof);
  if (!commitment) throw new Error('Failed to generate commitment.');
  return { input_data, salt, proof, commitment };
}

async function completeSignupFlow(
  digits: string,
  bundleUuid: string | undefined,
  bundleMessage: string | undefined
): Promise<void> {
  const pending = pendingSignupService.get();
  if (!pending) throw new Error('Signup data expired. Please go back and try again.');

  // Step 1: Verify OTP — tag failures so the UI can distinguish them from later errors.
  try {
    await ContractService.getInstance().verifyEmailKey(pending.encKeyRef, digits);
  } catch (err: any) {
    if (err && typeof err === 'object') err.isOtpError = true;
    throw err;
  }

  // Step 2: Persist messaging identity — written only AFTER successful OTP verification.
  // Spec: SEED + MESSAGING_PRIVATE_KEY → SecureStore (FaceID-gated).
  //       ENC_KEY_REF → AsyncStorage (NON-SECURED UNENCRYPTED).
  await Promise.all([
    SecureStore.setItemAsync(accountSecureKey(pending.email, 'seed'), pending.seed),
    AsyncStorage.setItem(accountDataKey(pending.email, 'enc_key_ref'), pending.encKeyRef),
    SecureStore.setItemAsync(
      accountSecureKey(pending.email, 'messaging_private_key'),
      pending.privateKeyMessaging
    ),
  ]);

  // Spec: signup just wrote both PRIVATE_KEY + ENC_KEY_REF, so the app is fully functional.
  store.dispatch(setMessagingKeysAvailable(true));

  // Step 3: Register email in the account list + set as active account
  const rawList = await AsyncStorage.getItem(ACCOUNT_EMAILS_KEY);
  const emailList: string[] = rawList ? JSON.parse(rawList) : [];
  if (!emailList.includes(pending.email)) {
    emailList.push(pending.email);
    await AsyncStorage.setItem(ACCOUNT_EMAILS_KEY, JSON.stringify(emailList));
  }
  await AsyncStorage.setItem(ACTIVE_ACCOUNT_EMAIL_KEY, pending.email);

  // Step 4: Configure biometrics + track the active account in memory.
  // NOTE: do NOT call AuthService.signup() here — that was already executed before
  // this screen and would cause a second /pm_register_key (duplicate OTP email,
  // plus a brand-new seed/messaging keypair that overwrites the verified ones).
  if (pending.useBiometric) {
    await setupBiometrics(pending.email, pending.password, pending.biometricType ?? undefined);
  } else {
    const vm = new LoginViewModel();
    if (vm.useBiometric) await vm.disableBiometricLogin();
  }
  AccountDataService.getInstance().email = pending.email;

  // Step 5: Derive and set on-chain crypto state
  const { input_data, salt, proof, commitment } = deriveCryptoParams(
    pending.email,
    pending.password
  );

  if (!bundleUuid && !pending.lockboxProof) {
    await ContractService.getInstance().faucet(salt, commitment);
  }

  ContractService.getInstance().setCrypto({
    username: pending.email,
    input_data,
    salt,
    current_salt: salt,
    proof,
    commitment,
    expiry: Date.now() + EXPIRY_MS,
  });

  // Step 6: Claim lockbox if applicable
  if (pending.lockboxProof) {
    const lockboxProofHash = CryptoUtils.globalHash(pending.lockboxProof);
    if (!lockboxProofHash) throw new Error('Failed to generate lockbox proof hash.');
    const saltHash = CryptoUtils.globalHash(salt);
    if (!saltHash) throw new Error('Failed to generate salt hash.');
    const commitmentHash = CryptoUtils.globalHash(commitment);
    if (!commitmentHash) throw new Error('Failed to generate commitment hash.');

    await AuthService.getInstance().commitProtect(
      () =>
        ContractService.getInstance().claim(
          pending.lockboxProof!,
          salt,
          commitment,
          pending.senderCommitment
        ),
      lockboxProofHash,
      saltHash,
      commitmentHash
    );
  }

  // Step 7: Navigate to next screen
  if (!pending.disableSuccessCallback) {
    if (pending.lockboxProof && !pending.disableSuccessScreen) {
      shareFlowService.setPendingClaim({
        amountUsdStr: pending.claimedAmountUsd,
        from: 'signup',
        tokenName: pending.tokenName,
      });
    }
    setRootScreen(['MainTab']);

    const pendingLink = deepLinkHandler.getPendingLink();
    if (pendingLink) deepLinkHandler.resumePendingLink();
  }

  if (bundleUuid) {
    navigateToHongBaoVerification(bundleUuid, 'signup', bundleMessage ?? '');
  }

  pendingSignupService.clear();
}

/**
 * Spec: GENERATE NEW KEY flow — reruns signup steps 3-8 for an already-logged-in
 * user whose device is missing messaging keys. No faucet, no setCrypto.
 */
async function completeKeyGenerationFlow(digits: string): Promise<void> {
  const pending = pendingSignupService.get();
  if (!pending) throw new Error('Key generation data expired. Please try again.');

  // Step 1: Verify OTP
  try {
    await ContractService.getInstance().verifyEmailKey(pending.encKeyRef, digits);
  } catch (err: any) {
    if (err && typeof err === 'object') err.isOtpError = true;
    throw err;
  }

  // Step 2: Persist messaging identity — ONLY after successful OTP verification.
  // Spec: SEED + MESSAGING_PRIVATE_KEY → SecureStore; ENC_KEY_REF → AsyncStorage.
  await Promise.all([
    SecureStore.setItemAsync(accountSecureKey(pending.email, 'seed'), pending.seed),
    AsyncStorage.setItem(accountDataKey(pending.email, 'enc_key_ref'), pending.encKeyRef),
    SecureStore.setItemAsync(
      accountSecureKey(pending.email, 'messaging_private_key'),
      pending.privateKeyMessaging
    ),
  ]);

  // Step 3: Ensure email is tracked as an active account (signin already set
  // ACTIVE_ACCOUNT_EMAIL_KEY, but the list may be empty for migrating users).
  const rawList = await AsyncStorage.getItem(ACCOUNT_EMAILS_KEY);
  const emailList: string[] = rawList ? JSON.parse(rawList) : [];
  if (!emailList.includes(pending.email)) {
    emailList.push(pending.email);
    await AsyncStorage.setItem(ACCOUNT_EMAILS_KEY, JSON.stringify(emailList));
  }

  // Spec: app is fully functional once messaging keys are present for this email.
  store.dispatch(setMessagingKeysAvailable(true));

  pendingSignupService.clear();
}

export default function VerifyEmailScreen() {
  const route = useRoute<RouteProp<Record<string, VerifyEmailParams>, string>>();
  const {
    email: routeEmail,
    mode,
    bundle_uuid,
    message: routeBundleMessage,
    showSuccessToast,
  } = route.params ?? {};
  // encKeyRef is intentionally NOT destructured at the top — in signup mode it comes from
  // PendingSignupService (more secure); in generic mode it's read inside handleVerify.
  const emailDisplay = routeEmail ?? '[email address]';

  const [code, setCode] = useState('');
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [resendLeft, setResendLeft] = useState(RESEND_START);
  const [isProcessing, setIsProcessing] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const completionStartedRef = useRef(false);

  // Countdown timer
  useEffect(() => {
    const t = setInterval(() => {
      setResendLeft((s) => (s <= 0 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const complete = code.length === OTP_LENGTH;

  // Reset completion guard when digits are removed
  useEffect(() => {
    if (code.length < OTP_LENGTH) {
      completionStartedRef.current = false;
      if (isProcessing) setIsProcessing(false);
    }
  }, [code.length, isProcessing]);

  const isOtpFlow = mode === 'signup' || mode === 'generate_new_key';

  const restartVerifyFlow = useCallback(
    (reason: 'expired' | 'attempts') => {
      pendingSignupService.clear();
      const message =
        reason === 'expired'
          ? 'Your verification code has expired. Please start again.'
          : 'Too many incorrect attempts. Please start again.';
      showFlashMessage({
        title: 'Verification failed',
        message,
        type: 'danger',
      });
      setIsProcessing(false);
      completionStartedRef.current = false;
      setCode('');
      if (mode === 'generate_new_key') {
        // Spec: on cancel/error during key generation, go back to Home (disabled state).
        setRootScreen(['MainTab']);
      } else {
        goBack();
      }
    },
    [mode]
  );

  const handleVerify = useCallback(
    async (digits: string) => {
      setIsProcessing(true);
      setVerifyError(null);

      // Spec: OTP expires 10 minutes after /pm_register_key — restart before hitting the server.
      if (isOtpFlow) {
        const pending = pendingSignupService.get();
        if (pending && Date.now() - pending.startedAt > OTP_EXPIRY_MS) {
          restartVerifyFlow('expired');
          return;
        }
      }

      try {
        if (mode === 'signup') {
          await completeSignupFlow(digits, bundle_uuid, routeBundleMessage);
        } else if (mode === 'generate_new_key') {
          await completeKeyGenerationFlow(digits);
          setRootScreen(['MainTab']);
          if (showSuccessToast) {
            showFlashMessage({
              title: 'Success',
              message: 'Your email has been verified.',
              type: 'success',
            });
          }
        } else {
          // Generic mode — verify with enc_key_ref from route params, then hand off to caller
          const encKeyRef = route.params?.encKeyRef ?? '';
          await ContractService.getInstance().verifyEmailKey(encKeyRef, digits);
          route.params?.onCodeComplete?.(digits);
        }
      } catch (err: any) {
        console.error('[VerifyEmailScreen] verify error:', err);

        if (isOtpFlow && err?.isOtpError) {
          const pending = pendingSignupService.get();
          if (pending) {
            pending.attempts += 1;
            if (pending.attempts >= MAX_ATTEMPTS) {
              restartVerifyFlow('attempts');
              return;
            }
            const remaining = MAX_ATTEMPTS - pending.attempts;
            setVerifyError(
              `Invalid code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
            );
          } else {
            setVerifyError('Verification failed. Please try again.');
          }
        } else {
          setVerifyError('Verification failed. Please try again.');
        }

        setIsProcessing(false);
        completionStartedRef.current = false;
        setCode('');
      }
    },
    [
      mode,
      isOtpFlow,
      route.params,
      bundle_uuid,
      routeBundleMessage,
      restartVerifyFlow,
      showSuccessToast,
    ]
  );

  // Trigger verify when 6 digits entered
  useEffect(() => {
    if (!complete || completionStartedRef.current) return;
    completionStartedRef.current = true;
    void handleVerify(code);
  }, [complete, code, handleVerify]);

  const onChangeCode = useCallback((t: string) => {
    const digits = t.replace(/\D/g, '').slice(0, OTP_LENGTH);
    setVerifyError(null);
    setCode(digits);
  }, []);

  const handleResend = useCallback(async () => {
    try {
      const normalizedEmail = routeEmail?.trim().toLowerCase() ?? '';
      const pending = pendingSignupService.get();
      if (!normalizedEmail) {
        throw new Error('Missing email');
      }

      // /pm_register_key requires pk (hex-encoded X25519 public key)
      // In signup flow we can reconstruct it from the pending private messaging key.
      if (!pending?.privateKeyMessaging) {
        throw new Error('Missing signup data. Please go back and try again.');
      }

      const priv = CryptoUtils.hexToBytes(pending.privateKeyMessaging);
      const pub = CryptoUtils.x25519PublicKey(priv);
      const pkHex = CryptoUtils.bytesToHex(pub);

      const res = await ContractService.getInstance().registerEmailKey(normalizedEmail, pkHex);
      // New OTP issued — reset the 10-minute timer and attempt counter (spec).
      if (pending) {
        pending.encKeyRef = res.enc_key_ref;
        pending.startedAt = Date.now();
        pending.attempts = 0;
      }
      setResendLeft(RESEND_START);
      setVerifyError(null);
      showFlashMessage({
        title: 'Code sent',
        message: 'A new code has been sent to your email.',
        type: 'success',
      });
    } catch {
      showFlashMessage({
        title: 'Error',
        message: 'Failed to resend code. Please try again.',
        type: 'danger',
      });
    }
  }, [routeEmail]);

  const cellBorderStyle = useCallback(
    (index: number): { borderColor: string; borderWidth: number } => {
      if (verifyError) return { borderColor: '#E84040', borderWidth: 1 };
      if (isProcessing || complete) return { borderColor: C_SUCCESS, borderWidth: 1 };
      if (focusedIndex !== null && index === focusedIndex)
        return { borderColor: C_FOCUS, borderWidth: 2 };
      return { borderColor: C_BORDER, borderWidth: 1 };
    },
    [verifyError, isProcessing, complete, focusedIndex]
  );

  const digitColor = isProcessing ? C_DIM_DIGIT : C_BLACK;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerSide}
            onPress={() => {
              if (mode === 'generate_new_key') {
                pendingSignupService.clear();
                setRootScreen(['MainTab']);
              } else {
                goBack();
              }
            }}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Go back">
            <BackIcon />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Verify Email
          </Text>
          <View style={styles.headerSide} />
        </View>

        {/* Content */}
        <Pressable onPress={Keyboard.dismiss} style={styles.dismissArea}>
          <View style={styles.block}>
            <Text style={styles.headline}>Enter the 6-digit code we emailed you</Text>
            <Text style={styles.body}>
              Verify your email <Text style={styles.bodyBold}>{emailDisplay}</Text>. This helps us
              keep your account secure by verifying that it is really you.
            </Text>
          </View>

          <OtpInput
            length={OTP_LENGTH}
            value={code}
            onChange={onChangeCode}
            editable={!isProcessing}
            gap={OTP_GAP}
            cellBorderStyle={cellBorderStyle}
            digitColor={digitColor}
            selectionColor={C_FOCUS}
            onFocusChange={setFocusedIndex}
          />

          {/* Error message */}
          {verifyError ? <Text style={styles.errorText}>{verifyError}</Text> : null}

          {/* Bottom state: processing / countdown / resend */}
          {isProcessing ? (
            <View style={styles.processingRow}>
              <ActivityIndicator size="small" color={C_DIM_DIGIT} />
              <Text style={styles.processingText}>Processing...</Text>
            </View>
          ) : resendLeft > 0 ? (
            <Text style={styles.resendCountdown}>Resend Code in {resendLeft}s</Text>
          ) : (
            <ResendCodeButton onPress={handleResend} />
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function ResendCodeButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.resendLink}>Resend Code</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C_BG,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: 16,
  },
  headerSide: {
    width: HEADER_SIDE,
    height: HEADER_SIDE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    lineHeight: 30,
    fontWeight: '500',
    color: C_BLACK,
  },
  dismissArea: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  block: {
    marginBottom: 24,
    gap: 24,
  },
  headline: {
    fontSize: 28,
    lineHeight: 40,
    fontWeight: '700',
    color: C_BLACK,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    color: C_BODY,
  },
  bodyBold: {
    fontWeight: '700',
    color: C_BLACK,
  },
  errorText: {
    fontSize: 12,
    lineHeight: 20,
    fontWeight: '500',
    color: '#E84040',
    marginTop: 8,
  },
  processingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
    marginTop: 24,
  },
  processingText: {
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '700',
    color: C_DIM_DIGIT,
  },
  resendCountdown: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 22,
    color: C_ORANGE,
    marginTop: 24,
  },
  resendLink: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '600',
    color: C_ORANGE,
    marginTop: 24,
  },
});
