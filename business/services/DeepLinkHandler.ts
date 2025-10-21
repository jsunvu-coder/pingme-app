import { push, setRootScreen } from 'navigation/Navigation';
import { AuthService } from 'business/services/AuthService';
import { Linking } from 'react-native';

class DeepLinkHandler {
  private pendingURL: string | null = null;

  setPendingURL(url: string) {
    this.pendingURL = url;
    console.log('[DeepLinkHandler] Stored pending URL:', url);
  }

  getPendingLink(): string | null {
    return this.pendingURL;
  }

  async resumePendingLink() {
    if (!this.pendingURL) return;
    console.log('[DeepLinkHandler] Resuming pending link:', this.pendingURL);
    const url = this.pendingURL;
    this.pendingURL = null;
    await this.handleURL(url);
  }

  /**
   * 🔹 Called on cold start (from SplashScreen)
   */
  async handleAppStart() {
    try {
      // Small delay for smoother splash animation
      await new Promise((res) => setTimeout(res, 1000));

      const isLoggedIn = await AuthService.getInstance().isLoggedIn();
      const url = await Linking.getInitialURL();

      if (url) {
        console.log('[DeepLinkHandler] Cold start URL detected:', url);

        const u = new URL(url);
        const normalizedPathname = u.pathname.replace(/^\/+--\//, '/');
        let path = normalizedPathname.replace(/^\//, '');
        // For custom scheme like pingme://claim, pathname may be empty and 'claim' is the host
        if (!path) path = (u.host || u.hostname || '').toLowerCase();
        console.log(
          '[DeepLinkHandler] Cold start parsed path:',
          path,
          'query=',
          Object.fromEntries(u.searchParams)
        );

        // If initial URL has no path (e.g., exp://host:port), treat as NO deep link
        if (!path) {
          console.log('[DeepLinkHandler] Empty path on cold start → treating as no deep link');
          if (isLoggedIn) {
            setRootScreen(['MainTab']);
          } else {
            setRootScreen(['OnboardingPager']);
          }
          return;
        }

        // CLAIM → open immediately regardless of login
        if (path === 'claim') {
          console.log('[DeepLinkHandler] Cold start claim → open ClaimPaymentScreen');
          this.navigateClaim(Object.fromEntries(u.searchParams));
          return;
        }

        // Other links → respect login status
        if (!isLoggedIn) {
          console.log('[DeepLinkHandler] Not logged in → save pending URL & open AuthScreen');
          this.setPendingURL(url);
          setRootScreen(['AuthScreen']);
          return;
        }

        console.log('[DeepLinkHandler] Logged in → handling deep link');
        await this.handleURL(url);
        return;
      }

      // No deep link → normal app start
      if (isLoggedIn) {
        console.log('[DeepLinkHandler] No link & logged in → MainTab');
        setRootScreen(['MainTab']);
      } else {
        console.log('[DeepLinkHandler] No link & not logged in → OnboardingPager');
        setRootScreen(['OnboardingPager']);
      }
    } catch (err) {
      console.error('[DeepLinkHandler] handleAppStart error:', err);
      setRootScreen(['OnboardingPager']);
    }
  }

  /**
   * 🔹 Handles runtime or resumed deep links
   */
  async handleURL(url: string) {
    let path: string;
    const params: Record<string, string> = {};

    try {
      const u = new URL(url);
      // Expo dev URLs may use "/--/" as the app path separator, e.g. exp://host:port/--/claim
      // Normalize by removing leading "--/" if present
      const normalizedPathname = u.pathname.replace(/^\/+--\//, '/');
      path = normalizedPathname.replace(/^\//, '');
      // For custom scheme like pingme://claim, pathname may be empty and 'claim' is the host
      if (!path) path = (u.host || u.hostname || '').toLowerCase();
      u.searchParams.forEach((v, k) => (params[k] = v));
    } catch (e) {
      console.error('[DeepLinkHandler] Invalid URL:', e);
      return;
    }

    const isLoggedIn = await AuthService.getInstance().isLoggedIn();
    console.log('[DeepLinkHandler] handleURL:', path, params, 'loggedIn=', isLoggedIn);

    switch (path) {
      case 'claim':
        // Skip login check always
        this.navigateClaim(params);
        return;

      case 'pay':
      case 'deposit':
        if (!isLoggedIn) {
          this.setPendingURL(url);
          console.log(`[DeepLinkHandler] Not logged in → AuthScreen (${path})`);
          push('AuthScreen', { mode: 'login' });
          return;
        }

        if (path === 'pay') this.navigatePay(params);
        else this.navigateDeposit(params);
        return;

      default:
        console.log('[DeepLinkHandler] Unknown path:', path);
    }
  }

  // --- Navigation helpers ---
  private navigateClaim(params: Record<string, string>) {
    console.log('[DeepLinkHandler] Navigating to ClaimPaymentScreen', params);
    push('ClaimPaymentScreen', {
      ...params,
      onClaimSuccess: () => {
        console.log('[DeepLinkHandler] Claim finished → returning to MainTab');
        setRootScreen(['MainTab']);
      },
    });
  }

  private navigatePay(params: Record<string, string>) {
    console.log('[DeepLinkHandler] Navigating to SendConfirmationScreen', params);
    push('SendConfirmationScreen', params);
  }

  private navigateDeposit(params: Record<string, string>) {
    console.log('[DeepLinkHandler] Navigating to DepositScreen', params);
    push('DepositScreen', params);
  }
}

export const deepLinkHandler = new DeepLinkHandler();
