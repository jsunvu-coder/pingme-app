import { useEffect, useState, useRef, useCallback } from 'react';
import {
  ScrollView,
  View,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
  Dimensions,
  Keyboard,
  StatusBar,
} from 'react-native';
import { useRoute, useFocusEffect } from '@react-navigation/native';
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

export default function PingMeScreen() {
  const route = useRoute<any>();
  const defaultModeFromRoute = useCallback(() => {
    const paramMode = route?.params?.mode;
    return paramMode === 'request' ? 'request' : 'send';
  }, [route?.params?.mode]);

  const [mode, setMode] = useState<'send' | 'request'>('send');
  const [activeChannel, setActiveChannel] = useState<'Email' | 'Link'>('Email');
  const [amount, setAmount] = useState('');
  const [duration, setDuration] = useState<number>(LOCKBOX_DURATION);
  const [email, setEmail] = useState('');
  const [isPickerVisible, setPickerVisible] = useState(false);
  const balanceService = BalanceService.getInstance();

  const resetForm = useCallback(() => {
    setMode(defaultModeFromRoute());
    setActiveChannel('Email');
    setAmount('');
    setDuration(LOCKBOX_DURATION);
    setEmail('');
    setPickerVisible(false);
  }, [defaultModeFromRoute]);

  // --- Animations ---
  const emailOpacity = useRef(new Animated.Value(1)).current;
  const emailTranslateY = useRef(new Animated.Value(0)).current;
  const amountTranslateY = useRef(new Animated.Value(0)).current;
  const spacerHeight = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  // 🔹 Animate channel (Email ↔ Link)
  const animateChannel = (toEmail: boolean) => {
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
  };

  useEffect(() => {
    animateChannel(activeChannel === 'Email');
  }, [activeChannel]);

  // Reset fields when leaving the screen (or on re-focus)
  useFocusEffect(
    useCallback(() => {
      resetForm();
      return () => resetForm();
    }, [resetForm])
  );

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -150,
            duration: 250,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]).start();
      }
    );

    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: 0,
            duration: 200,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]).start();
      }
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [spacerHeight, translateY]);

  // ✅ Handle QR navigation params
  useEffect(() => {
    console.log('PingMeScreen route.params:', route.params);
    if (route.params) {
      const { mode: paramMode, email: paramEmail, amount: paramAmount } = route.params;
      if (paramMode && (paramMode === 'send' || paramMode === 'request')) setMode(paramMode);
      if (paramEmail && typeof paramEmail === 'string') setEmail(paramEmail);
      if (paramAmount && !isNaN(Number(paramAmount))) setAmount(String(paramAmount));
    }
  }, [route.params, defaultModeFromRoute]);

  const truncateToCents = (val: number) => Math.trunc(val * 100) / 100;

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

    const numericAmount = parseFloat(trimmedAmount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      showFlashMessage({
        title: 'Invalid amount',
        message: 'Please enter a valid payment amount.',
        type: 'warning',
      });
      return;
    }

    const normalizedAmount = truncateToCents(numericAmount);
    if (normalizedAmount < MIN_PAYMENT_AMOUNT) {
      showFlashMessage({
        title: 'Amount too low',
        message: `Minimum payment amount is $${MIN_PAYMENT_AMOUNT.toFixed(2)}.`,
        type: 'warning',
      });
      return;
    }

    if (normalizedAmount > MAX_PAYMENT_AMOUNT) {
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
      const availableBalance = parseFloat(balanceService.totalBalance || '0');
      if (Number.isFinite(availableBalance) && normalizedAmount > availableBalance) {
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
    const commonParams = {
      amount: normalizedAmount,
      displayAmount: `$${normalizedAmount.toFixed(2)}`,
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
            visible={isPickerVisible}
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
