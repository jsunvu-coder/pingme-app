import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import LogoWithText from 'assets/LogoWithText';
import { setRootScreen } from 'navigation/Navigation';
import { AuthService } from 'business/services/AuthService';
import { deepLinkHandler } from 'business/services/DeepLinkHandler';
import { Linking } from 'react-native';

export default function SplashScreen() {
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        // Small visual delay (1s) for logo animation
        await new Promise((res) => setTimeout(res, 1000));

        if (!mounted) return;

        // Check login status
        const isLoggedIn = await AuthService.getInstance().isLoggedIn();

        // See if a cold-start deep link exists
        const url = await Linking.getInitialURL();
        if (url) {
          console.log('[Splash] Cold start URL detected:', url);

          if (isLoggedIn) {
            console.log('[Splash] Already logged in → handling deep link');
            await deepLinkHandler.handleURL(url);
            return;
          }

          console.log('[Splash] Not logged in → save pending link & go to AuthScreen');
          deepLinkHandler.setPendingURL(url);
          setRootScreen(['AuthScreen']);
          return;
        }

        // No deep link
        if (isLoggedIn) {
          console.log('[Splash] Logged in → go to MainTab');
          setRootScreen(['MainTab']);
        } else {
          console.log('[Splash] Not logged in → show onboarding/login flow');
          setRootScreen(['OnboardingPager']);
        }
      } catch (err) {
        console.error('[Splash] Init error:', err);
        setRootScreen(['OnboardingPager']);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <View className="flex-1 items-center justify-center bg-[#FD4912]">
      <LogoWithText />
      <ActivityIndicator color="#fff" className="mt-6" />
    </View>
  );
}
