import './global.css';
import RootNavigator from 'navigation/RootNavigator';
import { NavigationContainer } from '@react-navigation/native';
import { navigationRef } from 'navigation/Navigation';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { linking } from 'business/services/LinkingService';
import { useEffect, useRef, useState, useCallback } from 'react';
import { install } from 'react-native-quick-crypto';
import FlashMessage from 'react-native-flash-message';
import { checkFirstRunAndClear } from 'screens/Claim/utils/AppLaunchCheck';
import { loadEnvFromStorage } from 'business/Config';
import NetInfo from '@react-native-community/netinfo';
import { NetworkBanner } from 'components/NetworkBanner';

export default function App() {
  const [offline, setOffline] = useState(false);
  const hasWarnedRef = useRef(false);

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

  // Global network reachability warning + banner
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const reachable = state.isConnected && state.isInternetReachable !== false;
      setOffline(!reachable);
      if (!reachable && !hasWarnedRef.current) {
        hasWarnedRef.current = true;
      }
      if (reachable) {
        hasWarnedRef.current = false;
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const retryConnectivity = useCallback(async () => {
    try {
      const state = await NetInfo.fetch();
      const reachable = state.isConnected && state.isInternetReachable !== false;
      setOffline(!reachable);
    } catch {
      setOffline(true);
    }
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navigationRef} linking={linking}>
        <RootNavigator />
        <NetworkBanner visible={offline} onRetry={retryConnectivity} />
        <FlashMessage position="top" />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
