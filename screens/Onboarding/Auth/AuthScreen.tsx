import { useEffect, useState } from 'react';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';

import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from '@expo/vector-icons';
import AuthTabs from './AuthTabs';
import CreateAccountView from './CreateAccountView';
import LoginView from './LoginView';

type AuthParams = {
  mode?: 'signup' | 'login';
  headerType?: 'simple' | 'full';
  from?: string;
  lockboxProof?: string;
  username?: string;
  amountUsdStr?: string;
};

export default function AuthScreen() {
  const route = useRoute<RouteProp<Record<string, AuthParams>, string>>();
  const [activeTab, setActiveTab] = useState<'signup' | 'login'>('signup');
  const [headerType, setHeaderType] = useState<'simple' | 'full'>('full');

  useEffect(() => {
    if (route.params?.mode) {
      setActiveTab(route.params.mode);
    }
    if (route.params?.headerType) {
      setHeaderType(route.params.headerType);
    }
  }, [route.params?.mode, route.params?.headerType]);

  return (
    <View className="flex-1 bg-white">
      <SafeAreaView edges={['top']} />
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View className="flex-1 py-8 bg-white">
            {headerType === 'simple' ? <SimpleHeader /> : <Header />}

            <AuthTabs activeTab={activeTab} onChange={setActiveTab} />

            {activeTab === 'signup' ? (
              <CreateAccountView
                lockboxProof={route.params?.lockboxProof}
                prefillUsername={route.params?.username}
                from={route.params?.from}
                amountUsdStr={route.params?.amountUsdStr}
              />
            ) : (
              <LoginView
                lockboxProof={route.params?.lockboxProof}
                prefillUsername={route.params?.username}
                from={route.params?.from}
                amountUsdStr={route.params?.amountUsdStr}
              />
            )}
          </View>
        </ScrollView>
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
