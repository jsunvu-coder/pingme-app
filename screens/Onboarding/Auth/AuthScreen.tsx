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

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ✅ Small screen detection (e.g. iPhone SE/8)
const IS_SMALL_SCREEN = Platform.OS === 'ios' && SCREEN_HEIGHT <= 667;

type AuthParams = {
  mode?: 'signup' | 'login';
  headerType?: 'simple' | 'full';
  from?: string;
  lockboxProof?: string;
  username?: string;
  amountUsdStr?: string;
  showTabs?: boolean;
};

export default function AuthScreen() {
  const route = useRoute<RouteProp<Record<string, AuthParams>, string>>();
  const [activeTab, setActiveTab] = useState<'signup' | 'login'>('login');
  const [headerType, setHeaderType] = useState<'simple' | 'full'>('simple');
  const [showTabs, setShowTabs] = useState(false);
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (route.params?.mode) setActiveTab(route.params.mode);
    if (route.params?.headerType) setHeaderType(route.params.headerType);
    if (route.params?.showTabs !== undefined) setShowTabs(route.params.showTabs);

    if (route.params?.lockboxProof) {
      console.log('🔗 [AuthScreen] Received lockboxProof:', route.params.lockboxProof);
    }
  }, [route.params]);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (event) => {
        let offset = 0;
        if (showTabs) {
          offset = IS_SMALL_SCREEN ? 100 : 50;
        }

        if (headerType === 'full') {
          offset += IS_SMALL_SCREEN ? 150 : 100;
        }

        Animated.timing(translateY, {
          toValue: -offset,
          duration: 250,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }).start();
      }
    );

    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        Animated.timing(translateY, {
          toValue: 0,
          duration: 200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }).start();
      }
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [translateY]);

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
            {headerType === 'simple' ? <SimpleHeader /> : <Header />}

            {showTabs && <AuthTabs activeTab={activeTab} onChange={setActiveTab} />}

            {activeTab === 'login' ? (
              <LoginView
                lockboxProof={route.params?.lockboxProof}
                prefillUsername={route.params?.username}
                from={route.params?.from}
                amountUsdStr={route.params?.amountUsdStr}
              />
            ) : (
              <CreateAccountView
                lockboxProof={route.params?.lockboxProof}
                prefillUsername={route.params?.username}
                from={route.params?.from}
                amountUsdStr={route.params?.amountUsdStr}
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
