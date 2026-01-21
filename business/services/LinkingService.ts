import { Linking } from 'react-native';
import { deepLinkHandler } from 'business/services/DeepLinkHandler';
import PayQrConfirmationScreen from 'screens/Pay/QrPayment/PayQrConfirmationScreen';

export const linking = {
  prefixes: ['https://app.staging.pingme.xyz', 'https://app.pingme.xyz', 'pingme://'],
  config: {
    screens: {
      SendConfirmationScreen: 'pay',
      ClaimPaymentScreen: 'claim',
      PayQrConfirmationScreen: 'deposit',
      HongBaoWithAuthScreen: 'redPocket',
    },
  },

  async getInitialURL() {
    const url = await Linking.getInitialURL();
    if (url) {
      // We let Splash -> DeepLinkHandler.handleAppStart() own cold-start handling
      console.log('[Linking] Cold-start URL (suppressed):', url);
    }
    return null; // prevent RN from auto-navigating
  },

  subscribe(listener: (url: string) => void) {
    const onReceiveURL = async ({ url }: { url: string }) => {
      console.log('[Linking] Runtime URL:', url);
      // We handle navigation ourselves via DeepLinkHandler to support auth gating
      await deepLinkHandler.handleURL(url);
    };
    const sub = Linking.addEventListener('url', onReceiveURL);
    return () => sub.remove();
  },
};
