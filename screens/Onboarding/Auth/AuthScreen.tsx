import { useEffect, useState, useRef } from 'react';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import {
  View,
  Text,
  ScrollView,
  Keyboard,
  Animated,
  Platform,
  Easing,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AuthTabs from './AuthTabs';
import CreateAccountView from './CreateAccountView';
import LoginView from './LoginView';

type AuthParams = {
  mode?: 'signup' | 'login';
  headerFull?: boolean;
  from?: string;
  lockboxProof?: string;
  username?: string;
  amountUsdStr?: string;
  tokenName?: string;
};

export default function AuthScreen() {
  const route = useRoute<RouteProp<Record<string, AuthParams>, string>>();
  const [activeTab, setActiveTab] = useState<'signup' | 'login'>('login');
  const [headerFull, setHeaderFull] = useState(false);
  const translateY = useRef(new Animated.Value(0)).current;
  const isSmallScreen = Dimensions.get('window').height <= 700;

  useEffect(() => {
    if (route.params?.mode) setActiveTab(route.params.mode);
    if (route.params?.headerFull !== undefined) setHeaderFull(route.params.headerFull);

    if (route.params?.lockboxProof) {
      console.log('🔗 [AuthScreen] Received lockboxProof:', route.params.lockboxProof);
    }
  }, [route.params]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const handleShow = (event: any) => {
      const keyboardHeight = event?.endCoordinates?.height ?? 0;

      // Large screens keep layout static.
      if (!isSmallScreen && !headerFull) {
        Animated.timing(translateY, {
          toValue: 0,
          duration: 200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }).start();
        return;
      }

      // Small screens: scale lift based on layout complexity.
      const multiplier = headerFull ? 0.85 : 0.55;
      const baseLift = headerFull ? 100 : 50;

      let offset = keyboardHeight * multiplier + baseLift;
      const maxLift = Math.max(0, keyboardHeight - 16);
      if (offset > maxLift) offset = maxLift;
      const minLift = headerFull ? 100 : 40;
      if (offset < minLift) offset = minLift;

      if (activeTab === 'login' && !headerFull) {
        offset = 0;
      }

      Animated.timing(translateY, {
        toValue: -offset,
        duration: 250,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    };

    const handleHide = () => {
      Animated.timing(translateY, {
        toValue: 0,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    };

    const showSub = Keyboard.addListener(showEvent, handleShow);
    const hideSub = Keyboard.addListener(hideEvent, handleHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [translateY, headerFull, isSmallScreen]);

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />
      <SafeAreaView edges={['top']} />

      <Animated.View style={{ flex: 1, transform: [{ translateY }] }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View className="flex-1 bg-white py-8">
            {headerFull ? <Header /> : <SimpleHeader />}

            {headerFull && <AuthTabs activeTab={activeTab} onChange={setActiveTab} />}

            {activeTab === 'login' ? (
              <LoginView
                lockboxProof={route.params?.lockboxProof}
                prefillUsername={route.params?.username}
                from={route.params?.from}
                amountUsdStr={route.params?.amountUsdStr}
                tokenName={route.params?.tokenName}
              />
            ) : (
              <CreateAccountView
                lockboxProof={route.params?.lockboxProof}
                prefillUsername={route.params?.username}
                from={route.params?.from}
                amountUsdStr={route.params?.amountUsdStr}
                tokenName={route.params?.tokenName}
              />
            )}
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

/* ---------- Headers ---------- */

const Header = () => (
  <View>
    <View className="mb-6 items-center">
      <View className="h-24 w-24 items-center justify-center rounded-full bg-orange-50">
        <Ionicons name="wallet-outline" size={56} color="#FD4912" />
      </View>
    </View>
    <Text className="mb-8 text-center text-2xl font-bold text-gray-900">
      Payment is ready.{'\n'}Just one more step.
    </Text>
  </View>
);

const SimpleHeader = () => (
  <Text className="mx-6 mb-8 text-3xl font-medium text-[#FD4912]">Continue to PingMe</Text>
);
