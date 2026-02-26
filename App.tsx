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
import { useCommitmentGuard } from 'hooks/useCommitmentGuard';
import { Provider } from 'react-redux';
import { getStore } from './store';
import { useState as useStateOriginal } from 'react';
import { View, ActivityIndicator, StatusBar } from 'react-native';
import LogoWithText from 'assets/LogoWithText';
import OverlayManager from 'screens/Overlay/OverlayManager';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { FcmService } from 'business/services/FcmService';

export default function App() {
  const [storeReady, setStoreReady] = useStateOriginal(false);
  const [store, setStore] = useStateOriginal<any>(null);
  const [offline, setOffline] = useStateOriginal(false);
  const hasWarnedRef = useRef(false);

  // Initialize store on mount
  useEffect(() => {
    getStore().then((initializedStore) => {
      setStore(initializedStore);
      setStoreReady(true);
    });
  }, []);

  // Global commitment/session guard
  // useCommitmentGuard();

  // Install crypto polyfill
  useEffect(() => {
    install();
  }, []);

  // Initialize FCM and log token / messages for debugging
  useEffect(() => {
    const fcm = FcmService.getInstance();

    void (async () => {
      const token = await fcm.initAndGetToken();
      if (!token) return;
      // TODO: send token to backend if needed
    })();

    const unsubForeground = fcm.subscribeForeground((msg) => {
      console.log('[FCM] Foreground handler received message', msg);
    });

    const unsubOpened = fcm.subscribeNotificationOpened((msg) => {
      console.log('[FCM] Opened handler received message', msg);
    });

    return () => {
      unsubForeground();
      unsubOpened();
    };
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

  // Show loading screen while store is initializing
  if (!storeReady || !store) {
    return (
      <View className="flex-1 items-center justify-center bg-[#FD4912]">
        <LogoWithText />
        <ActivityIndicator color="#fff" className="mt-6" />
      </View>
    );
  }

  return (
    <Provider store={store}>
      <KeyboardProvider>
        <SafeAreaProvider>
          <NavigationContainer ref={navigationRef} linking={linking}>
            <RootNavigator />
            <NetworkBanner visible={offline} onRetry={retryConnectivity} />
            <FlashMessage position="top" statusBarHeight={StatusBar.currentHeight}/>
            <OverlayManager />
          </NavigationContainer>
        </SafeAreaProvider>
      </KeyboardProvider>
    </Provider>
  );
}
