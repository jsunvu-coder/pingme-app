import { useEffect, useState, useRef } from 'react';
import {
  ScrollView,
  View,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
  Easing,
  Dimensions,
  Keyboard,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { push } from 'navigation/Navigation';

import SendRequestTab from './SendRequestTab';
import EmailRecipientSection from './EmailRecipientSection';
import ChannelSelectView from './ChannelSelectView';
import PaymentAmountView from './PaymentAmountView';
import PrimaryButton from 'components/PrimaryButton';
import HeaderView from 'components/HeaderView';
import { BalanceService } from 'business/services/BalanceService';
import { LOCKBOX_DURATION } from 'business/Constants';
import ContactPickerModal from './ContactList';
import { RecentEmailStorage } from './RecentEmailStorage';
import LockboxDurationView from './LockboxDurationView';

export default function PingMeScreen() {
  const route = useRoute<any>();
  const [mode, setMode] = useState<'send' | 'request'>('send');
  const [activeChannel, setActiveChannel] = useState<'Email' | 'Link'>('Email');
  const [amount, setAmount] = useState('');
  const [duration, setDuration] = useState(`${LOCKBOX_DURATION}`);
  const [email, setEmail] = useState('');
  const [isPickerVisible, setPickerVisible] = useState(false);

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
  }, [route.params]);

  const handleContinue = async () => {
    // --- 1️⃣ Validate email (only if Email mode is active)
    let recipient = '';
    if (activeChannel === 'Email') {
      if (!email.trim()) {
        Alert.alert('Missing email', 'Please enter a recipient email address.');
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        Alert.alert('Invalid email', 'Please enter a valid email address.');
        return;
      }

      recipient = email.trim();
      await RecentEmailStorage.save(recipient);
    }

    // --- 2️⃣ Validate amount
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid payment amount.');
      return;
    }

    // --- 3️⃣ Validate duration
    let lockboxDurationDays = LOCKBOX_DURATION;
    if (mode === 'send') {
      const numericDuration = parseFloat(duration);
      if (isNaN(numericDuration) || numericDuration <= 0) {
        Alert.alert('Invalid duration', 'Please enter a valid lockbox duration (in days).');
        return;
      }
      lockboxDurationDays = numericDuration;
    }

    // --- 4️⃣ Proceed with navigation
    const commonParams = {
      amount: numericAmount,
      displayAmount: `$${numericAmount.toFixed(2)}`,
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
      <View className="z-40 bg-white pb-6">
        <SafeAreaView edges={['top']} />
        <HeaderView title="Ping Now" variant="light" />
      </View>

      <Animated.View style={{ flex: 1, transform: [{ translateY }] }}>
        <ScrollView
          className="flex-1 px-6 pt-5"
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled">
          <SendRequestTab mode={mode} onChange={setMode} />
          <ChannelSelectView active={activeChannel} onChange={setActiveChannel} />

          {/* Animated Email Section */}
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
            />

            {mode === 'send' ? (
              <LockboxDurationView onChange={setDuration} value={duration} />
            ) : null}

            <PrimaryButton title="Continue" className="mt-6" onPress={handleContinue} />
          </Animated.View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}
