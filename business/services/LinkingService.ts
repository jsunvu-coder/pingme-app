import { Linking } from 'react-native';
import { deepLinkHandler } from 'business/services/DeepLinkHandler';

export const linking = {
  prefixes: ['https://app.staging.pingme.xyz', 'https://app.pingme.xyz', 'pingme://'],
  config: {
    screens: {
      SendConfirmationScreen: 'pay',
      ClaimPaymentScreen: 'claim',
      DepositScreen: 'deposit',
    },
  },

  async getInitialURL() {
    const url = await Linking.getInitialURL();
    if (url) {
      console.log('[Linking] Cold-start URL:', url);
      await deepLinkHandler.handleURL(url);
    }
    return null; // prevent RN from auto-navigating
  },

  subscribe(listener: (url: string) => void) {
    const onReceiveURL = async ({ url }: { url: string }) => {
      console.log('[Linking] Runtime URL:', url);
      listener(url);
      await deepLinkHandler.handleURL(url);
    };
    const sub = Linking.addEventListener('url', onReceiveURL);
    return () => sub.remove();
  },
};
