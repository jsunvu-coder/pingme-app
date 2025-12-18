import { useEffect, useState, useRef, useCallback } from 'react';
import {
  ScrollView,
  View,
  Platform,
  Animated,
  Easing,
  Keyboard,
  StatusBar,
} from 'react-native';
import { useRoute, useFocusEffect, useIsFocused } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { push } from 'navigation/Navigation';

import SendRequestTab from './SendRequestTab';
import EmailRecipientSection from './EmailRecipientSection';
import ChannelSelectView from './ChannelSelectView';
import PaymentAmountView from './PaymentAmountView';
import PrimaryButton from 'components/PrimaryButton';
import HeaderView from 'components/HeaderView';
import { BalanceService } from 'business/services/BalanceService';
import { LOCKBOX_DURATION, MAX_PAYMENT_AMOUNT, MIN_PAYMENT_AMOUNT } from 'business/Constants';
import ContactPickerModal from './ContactList';
import { RecentEmailStorage } from './RecentEmailStorage';
import LockboxDurationView from './LockboxDurationView';
import { showFlashMessage } from 'utils/flashMessage';
import { Utils } from 'business/Utils';

export default function PingMeScreen() {
  const route = useRoute<any>();
  const isFocused = useIsFocused();

  const [mode, setMode] = useState<'send' | 'request'>('send');
  const [activeChannel, setActiveChannel] = useState<'Email' | 'Link'>('Email');
  const [amount, setAmount] = useState('');
  const [duration, setDuration] = useState<number>(LOCKBOX_DURATION);
  const [email, setEmail] = useState('');
  const [isPickerVisible, setPickerVisible] = useState(false);
  const balanceService = BalanceService.getInstance();

  const resetForm = useCallback(() => {
    setAmount('');
    setDuration(LOCKBOX_DURATION);
    setEmail('');
    setPickerVisible(false);
  }, []);

  // --- Animations ---
  const emailOpacity = useRef(new Animated.Value(1)).current;
  const emailTranslateY = useRef(new Animated.Value(0)).current;
  const amountTranslateY = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  // 🔹 Animate channel (Email ↔ Link)
  const animateChannel = useCallback(
    (toEmail: boolean) => {
    if (toEmail) {
      Animated.parallel([
        Animated.timing(emailOpacity, {
          toValue: 1,
          duration: 250,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(emailTranslateY, {
          toValue: 0,
          duration: 250,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(amountTranslateY, {
          toValue: 20,
          duration: 250,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(emailOpacity, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(emailTranslateY, {
          toValue: -20,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(amountTranslateY, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    }
    },
    [amountTranslateY, emailOpacity, emailTranslateY]
  );

  useEffect(() => {
    animateChannel(activeChannel === 'Email');
  }, [activeChannel, animateChannel]);

  // Reset fields when re-focusing (avoid setState on blur/detach).
  useFocusEffect(
    useCallback(() => {
      resetForm();
    }, [resetForm])
  );

  // Scope keyboard listeners to focus: tab screens stay mounted, so global listeners can
  // update hidden screens and leave their layout animation state out-of-sync.
  useFocusEffect(
    useCallback(() => {
      const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
      const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

      const showSub = Keyboard.addListener(showEvent, () => {
        Animated.timing(translateY, {
          toValue: -150,
          duration: 250,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }).start();
      });

      const hideSub = Keyboard.addListener(hideEvent, () => {
        Animated.timing(translateY, {
          toValue: 0,
          duration: 200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }).start();
      });

      return () => {
        showSub.remove();
        hideSub.remove();
        translateY.stopAnimation();
        translateY.setValue(0);
      };
    }, [translateY])
  );

  // ✅ Handle QR navigation params
  useEffect(() => {
    if (route.params) {
      const { mode: paramMode, email: paramEmail, amount: paramAmount } = route.params;
      if (paramMode && (paramMode === 'send' || paramMode === 'request')) setMode(paramMode);
      if (paramEmail && typeof paramEmail === 'string') setEmail(paramEmail);
      if (paramAmount && !isNaN(Number(paramAmount))) setAmount(String(paramAmount));
    }
  }, [route.params]);

  const handleContinue = async () => {
    Keyboard.dismiss();
    // --- 1️⃣ Validate email (only if Email mode is active)
    let recipient = '';
    if (activeChannel === 'Email') {
      if (!email.trim()) {
        showFlashMessage({
          title: 'Missing email',
          message: 'Please enter a recipient email address.',
          type: 'warning',
        });
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        showFlashMessage({
          title: 'Invalid email',
          message: 'Please enter a valid email address.',
          type: 'warning',
        });
        return;
      }

      recipient = email.trim();
      await RecentEmailStorage.save(recipient);
    }

    // --- 2️⃣ Validate amount
    const trimmedAmount = amount.trim();
    if (!trimmedAmount) {
      showFlashMessage({
        title: 'Amount required',
        message: 'Please input an amount.',
        type: 'warning',
      });
      return;
    }

    // Reject any non-numeric input instead of auto-parsing
    if (!/^\d*\.?\d*$/.test(trimmedAmount)) {
      showFlashMessage({
        title: 'Invalid amount',
        message: 'Please enter a valid payment amount.',
        type: 'warning',
      });
      return;
    }

    const amountMicro = Utils.toMicro(trimmedAmount);
    if (amountMicro <= 0n) {
      showFlashMessage({
        title: 'Invalid amount',
        message: 'Please enter a valid payment amount.',
        type: 'warning',
      });
      return;
    }

    const minMicro = BigInt(MIN_PAYMENT_AMOUNT) * Utils.MICRO_FACTOR;
    const maxMicro = BigInt(MAX_PAYMENT_AMOUNT) * Utils.MICRO_FACTOR;
    if (amountMicro < minMicro) {
      showFlashMessage({
        title: 'Amount too low',
        message: `Minimum payment amount is $${MIN_PAYMENT_AMOUNT.toFixed(2)}.`,
        type: 'warning',
      });
      return;
    }

    if (amountMicro > maxMicro) {
      showFlashMessage({
        title: 'Amount too high',
        message: `Maximum payment amount is $${MAX_PAYMENT_AMOUNT.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}.`,
        type: 'warning',
      });
      return;
    }

    if (mode === 'send') {
      const totalMicro = balanceService.balances.reduce((acc, b) => {
        try {
          return acc + BigInt(b.amount ?? '0');
        } catch {
          return acc;
        }
      }, 0n);
      if (amountMicro > totalMicro) {
        showFlashMessage({
          title: 'Exceed balance',
          message: 'The amount exceed the available balance.',
          type: 'warning',
        });
        return;
      }
    }

    // --- 3️⃣ Validate duration
    let lockboxDurationDays = LOCKBOX_DURATION;
    if (mode === 'send') {
      if (!Number.isFinite(duration) || duration < 1 || duration > 30) {
        showFlashMessage({
          title: 'Invalid duration',
          message: 'Lockbox duration must be between 1 and 30 days.',
          type: 'warning',
        });
        return;
      }
      lockboxDurationDays = Math.round(duration);
    }

    // --- 4️⃣ Proceed with navigation
    const amountUsd = Utils.formatMicroToUsd(amountMicro, undefined, { grouping: false, empty: '0.00' });
    const displayUsd = Utils.formatMicroToUsd(amountMicro, undefined, { grouping: true, empty: '0.00' });
    const commonParams = {
      amount: amountUsd,
      displayAmount: `$${displayUsd}`,
      recipient,
      channel: activeChannel,
      lockboxDuration: lockboxDurationDays,
      mode,
    };

    if (mode === 'send') {
      push('SendConfirmationScreen', commonParams);
    } else {
      push('RequestConfirmationScreen', {
        ...commonParams,
        lockboxDuration: LOCKBOX_DURATION,
      });
    }
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />
      <View className="z-40 bg-white pb-4">
        <SafeAreaView edges={['top']} />
        <HeaderView title="Ping Now" variant="light" />
      </View>

      <Animated.View style={{ flex: 1, transform: [{ translateY }] }}>
        <ScrollView
          className="flex-1 px-6"
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <SendRequestTab mode={mode} onChange={setMode} />
          <ChannelSelectView active={activeChannel} onChange={setActiveChannel} />

          <Animated.View
            style={{
              opacity: emailOpacity,
              transform: [{ translateY: emailTranslateY }],
            }}>
            {activeChannel === 'Email' && (
              <EmailRecipientSection
                email={email}
                setEmail={setEmail}
                onPressContactList={() => setPickerVisible(true)}
              />
            )}
          </Animated.View>

          <ContactPickerModal
            visible={isFocused && isPickerVisible}
            onClose={() => setPickerVisible(false)}
            onSelect={(selectedEmail) => {
              setEmail(selectedEmail);
              setPickerVisible(false);
            }}
          />

          {/* Animated Amount Section */}
          <Animated.View style={{ transform: [{ translateY: amountTranslateY }] }}>
            <PaymentAmountView
              balance={`$${BalanceService.getInstance().totalBalance}`}
              value={amount}
              onChange={setAmount}
              mode={mode}
            />

            {mode === 'send' ? (
              <LockboxDurationView onChange={setDuration} value={duration} />
            ) : null}

            <PrimaryButton title="Continue" className="mt-6" onPress={handleContinue} />
          </Animated.View>

          <SafeAreaView />
        </ScrollView>
      </Animated.View>
    </View>
  );
}
