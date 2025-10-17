import './global.css';
import RootNavigator from 'navigation/RootNavigator';
import { NavigationContainer } from '@react-navigation/native';
import { navigationRef } from 'navigation/Navigation';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { linking } from 'business/services/LinkingService';
import { install } from 'react-native-quick-crypto';

export default function App() {
  // Install crypto polyfill
  useEffect(() => {
    install();
  }, []);

  // const linking = {
  //   prefixes: ['https://app.staging.pingme.xyz', 'https://app.pingme.xyz', 'pingme://'],
  //   config: {
  //     screens: {
  //       SendConfirmationScreen: 'pay',
  //       ClaimPaymentScreen: 'claim',
  //       DepositScreen: 'deposit',
  //     },
  //   },
  //   async getInitialURL() {
  //     const url = await Linking.getInitialURL();
  //     if (url) console.log('[Linking] Initial URL:', url);
  //     return url;
  //   },
  //   subscribe(listener: (url: string) => void) {
  //     const onReceiveURL = ({ url }: { url: string }) => {
  //       console.log('[Linking] Received URL:', url);
  //       listener(url);
  //     };
  //     const subscription = Linking.addEventListener('url', onReceiveURL);
  //     return () => subscription.remove();
  //   },
  // };

  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navigationRef} linking={linking}>
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
