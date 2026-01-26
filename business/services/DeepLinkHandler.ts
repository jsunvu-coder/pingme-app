import {
  navigationRef,
  presentOverMain,
  push,
  replace,
  setRootScreen,
} from 'navigation/Navigation';
import { AuthService } from 'business/services/AuthService';
import { Linking } from 'react-native';
import { computeLockboxProof, getLockbox, getLockboxInfo } from 'utils/claim';

class DeepLinkHandler {
  private pendingURL: string | null = null;
  private initialURLHandled = false;

  setPendingURL(url: string) {
    this.pendingURL = url;
    console.log('[DeepLinkHandler] Stored pending URL:', url);
  }

  clearPendingURL() {
    this.pendingURL = null;
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

      const auth = AuthService.getInstance();
      const isLoggedIn = await auth.isLoggedIn();

      if (this.initialURLHandled) {
        console.log('[DeepLinkHandler] Initial URL already handled → standard startup flow');
        if (isLoggedIn) {
          setRootScreen(['MainTab']);
        } else {
          setRootScreen(['OnboardingPager']);
        }
        return;
      }

      let url: string | null = null;
      try {
        url = await Linking.getInitialURL();
      } catch (linkError) {
        console.error('[DeepLinkHandler] getInitialURL error:', linkError);
      } finally {
        this.initialURLHandled = true;
      }

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
          console.log('[DeepLinkHandler] Cold start claim → processing');
          const params = Object.fromEntries(u.searchParams);

          if (isLoggedIn) {
            setRootScreen(['MainTab']);
            setTimeout(() => this.navigateClaim(params), 400);
          } else {
            // If signup=true and not logged in, verify first then go to auth
            if (params.signup === 'true') {
              console.log(
                '[DeepLinkHandler] Claim with signup=true and not logged in → verify first'
              );
              await this.handleClaimWithSignup(params);
            } else {
              this.navigateClaim(params, true); // reset stack so splash isn't behind
            }
          }
          return;
        }

        // Other links → respect login status
        if (!isLoggedIn) {
          console.log('[DeepLinkHandler] Not logged in → save pending URL & open AuthScreen');
          this.setPendingURL(url);
          setRootScreen([{ name: 'AuthScreen', params: { mode: 'login' } }]);
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
      case 'claim': {
        // If signup=true and not logged in, verify first then go to auth
        if (params.signup === 'true' && !isLoggedIn) {
          console.log(
            '[DeepLinkHandler] Runtime claim with signup=true and not logged in → verify first'
          );
          await this.handleClaimWithSignup(params);
        } else {
          this.navigateClaim(params);
        }
        return;
      }

      case 'pay':
      case 'deposit':
        if (!isLoggedIn) {
          this.setPendingURL(url);

          const isPayOnTop =
            navigationRef.isReady() && navigationRef.getCurrentRoute()?.name === 'AuthScreen';
          if (!isPayOnTop) {
            console.log(`[DeepLinkHandler] Not logged in → AuthScreen (${path})`);
            // Ensure we always surface the login screen even if the user is deep in another flow.
            setRootScreen([{ name: 'AuthScreen', params: { mode: 'login' } }]);
          }
          return;
        }

        if (path === 'pay') this.navigatePay(params);
        else this.navigatePayQr(params);
        return;

      default:
        console.log('[DeepLinkHandler] Unknown path:', path);
    }
  }

  // --- Navigation helpers ---

  /**
   * Handle claim with signup=true when not logged in
   * Verify with empty passphrase in background, then navigate to AuthScreen
   */
  private async handleClaimWithSignup(params: Record<string, string>) {
    try {
      console.log('[DeepLinkHandler] Starting background verify for signup flow');

      const { username, lockboxSalt, code } = params;

      if (!lockboxSalt) {
        console.error('[DeepLinkHandler] Missing required params for signup flow');
        // Fallback to normal claim flow
        this.navigateClaim(params, true);
        return;
      }

      // Verify with empty passphrase
      const passphrase = '';
      // Use empty string as default if username is not provided
      const crypto = computeLockboxProof(username || '', passphrase, lockboxSalt, code);

      console.log('[DeepLinkHandler] Getting lockbox with empty passphrase');
      const lockbox = await getLockbox(crypto.lockboxCommitment);

      // Get lockbox info
      const info = getLockboxInfo(lockbox);

      if (!info) {
        console.error('[DeepLinkHandler] Failed to get lockbox info');
        this.navigateClaim(params, true);
        return;
      }

      // Check if lockbox is still claimable
      if (!info.isClaimable) {
        console.warn(
          `[DeepLinkHandler] Lockbox is not claimable (status: ${info.derivedStatus}), showing ClaimPaymentScreen`
        );
        // Navigate to ClaimPaymentScreen to show the status (EXPIRED/CLAIMED/RECLAIMED)
        this.navigateClaim(
          {
            ...params,
            // Pass pre-verified data so ClaimPaymentScreen can show status immediately
            _lockboxData: JSON.stringify(lockbox),
            _lockboxProof: crypto.lockboxProof,
            _derivedStatus: info.derivedStatus,
          },
          true
        );
        return;
      }

      console.log(
        '[DeepLinkHandler] Lockbox verified and claimable, navigating to AuthScreen (signup)'
      );

      // Navigate directly to AuthScreen with lockbox info
      setRootScreen([
        {
          name: 'AuthScreen',
          params: {
            mode: 'signup',
            headerFull: true,
            lockboxProof: crypto.lockboxProof,
            amountUsdStr: info.formattedAmount,
            from: 'signup',
            tokenName: info.tokenName,
            disableSuccessScreen: true,
          },
        },
      ]);
    } catch (error) {
      console.error('[DeepLinkHandler] Verify failed for signup flow:', error);
      // Fallback to normal claim flow on error
      console.log('[DeepLinkHandler] Falling back to normal claim flow');
      this.navigateClaim(params, true);
    }
  }

  private navigateClaim(params: Record<string, string>, resetStack = false) {
    console.log('[DeepLinkHandler] Navigating to ClaimPaymentScreen', params);
    this.clearPendingURL();
    const route = {
      name: 'ClaimPaymentScreen',
      params: {
        ...params,
        onClaimSuccess: () => {
          console.log('[DeepLinkHandler] Claim finished → returning to MainTab');
          setRootScreen(['MainTab']);
        },
      },
    };

    if (resetStack) {
      setRootScreen([route]);
    } else {
      const isClaimOnTop =
        navigationRef.isReady() && navigationRef.getCurrentRoute()?.name === 'ClaimPaymentScreen';
      if (isClaimOnTop) {
        replace('ClaimPaymentScreen', route.params);
      } else {
        push('ClaimPaymentScreen', route.params);
      }
    }
  }

  private navigatePay(params: Record<string, string>) {
    const amount = params.amount;
    const token = params.token;
    const recipient = params.requester ?? params.recipient ?? params.email ?? params.requestee;

    const payload = {
      amount,
      token,
      recipient,
      channel: 'Email',
    };

    console.log('[DeepLinkHandler] Navigating to SendConfirmationScreen', payload);
    this.clearPendingURL();

    const isPayOnTop =
      navigationRef.isReady() && navigationRef.getCurrentRoute()?.name === 'SendConfirmationScreen';
    if (isPayOnTop) {
      replace('SendConfirmationScreen', payload);
      return;
    }
    // Always surface the send flow, even if the user is currently deep in another stack.
    presentOverMain('SendConfirmationScreen', payload);
  }

  private navigatePayQr(params: Record<string, string>) {
    console.log('[DeepLinkHandler] Navigating to PayQrConfirmationScreen', params);
    this.clearPendingURL();
    const isPayQrOnTop =
      navigationRef.isReady() &&
      navigationRef.getCurrentRoute()?.name === 'PayQrConfirmationScreen';
    if (isPayQrOnTop) {
      replace('PayQrConfirmationScreen', params);
      return;
    }

    presentOverMain('PayQrConfirmationScreen', params);
  }
}

export const deepLinkHandler = new DeepLinkHandler();
