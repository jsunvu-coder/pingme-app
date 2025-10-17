import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import LogoWithText from 'assets/LogoWithText';
import { deepLinkHandler } from 'business/services/DeepLinkHandler';

export default function SplashScreen() {
  useEffect(() => {
    deepLinkHandler.handleAppStart();
  }, []);

  return (
    <View className="flex-1 items-center justify-center bg-[#FD4912]">
      <LogoWithText />
      <ActivityIndicator color="#fff" className="mt-6" />
    </View>
  );
}
