import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import {
  closeOnrampSDK,
  onRampSDKNativeEvent,
  startOnrampSDK,
} from '@onramp.money/onramp-react-native-sdk';

import NavigationBar from 'components/NavigationBar';
import { ONRAMP_APP_ID } from 'business/Config';
import { AccountDataService } from 'business/services/AccountDataService';
import { goBack, push } from 'navigation/Navigation';
import { showFlashMessage } from 'utils/flashMessage';

type Props = {
  route: { params?: { fiatType?: number } };
};

export default function OnrampScreen({ route }: Props) {
  const { fiatType } = route?.params ?? {};
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const sdkStarted = useRef(false);

  useEffect(() => {
    const listener = onRampSDKNativeEvent.addListener('widgetEvents', (eventData) => {
      const event = eventData?.type ?? eventData;
      console.log('[Onramp] widgetEvent:', eventData);

      if (event === 'ONRAMP_WIDGET_TX_COMPLETED') {
        showFlashMessage({
          title: 'Top-up successful',
          message: 'Your balance will update shortly.',
          type: 'success',
        });
        closeOnrampSDK();
        push('MainTab', {
          screen: 'Home',
        });
      } else if (event === 'ONRAMP_WIDGET_CLOSE_REQUEST_CONFIRMED') {
        closeOnrampSDK();
        goBack();
      }
    });

    return () => {
      listener.remove();
      if (sdkStarted.current) {
        closeOnrampSDK();
      }
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const launch = async () => {
      try {
        const accountData = AccountDataService.getInstance();
        const walletAddress = await accountData.getForwarder();

        if (!mounted) return;

        if (!walletAddress) {
          setStatus('error');
          return;
        }

        startOnrampSDK({
          appId: ONRAMP_APP_ID,
          walletAddress,
          flowType: 1,
          ...(fiatType !== undefined && { fiatType }),
          lang: 'en',
        });

        sdkStarted.current = true;
        setStatus('ready');
      } catch (err) {
        console.error('[Onramp] Failed to launch SDK:', err);
        if (mounted) setStatus('error');
      }
    };

    launch();
    return () => {
      mounted = false;
    };
  }, []);

  if (status === 'error') {
    return (
      <View className="flex-1 bg-[#fafafa]">
        <NavigationBar title="Buy Crypto" />
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-base text-red-500">
            Unable to launch the top-up widget. Please try again.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#fafafa]">
      <NavigationBar title="Buy Crypto" />
      {status === 'loading' && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#FD4912" />
          <Text className="mt-4 text-sm text-gray-500">Loading…</Text>
        </View>
      )}
    </View>
  );
}
