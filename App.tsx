import './global.css';
import RootNavigator from 'navigation/RootNavigator';
import { NavigationContainer } from '@react-navigation/native';
import { navigationRef } from 'navigation/Navigation';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { linking } from 'business/services/LinkingService';
import { useEffect } from 'react';
import { install } from 'react-native-quick-crypto';
import FlashMessage from 'react-native-flash-message';
import { checkFirstRunAndClear } from 'screens/Claim/utils/AppLaunchCheck';
import { loadEnvFromStorage } from 'business/Config';

export default function App() {
  // Install crypto polyfill
  useEffect(() => {
    install();
  }, []);

  useEffect(() => {
    void checkFirstRunAndClear();
  }, []);

  useEffect(() => {
    void loadEnvFromStorage();
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navigationRef} linking={linking}>
        <RootNavigator />
        <FlashMessage position="top" />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
