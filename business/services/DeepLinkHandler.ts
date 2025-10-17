import { push } from 'navigation/Navigation';
import { AuthService } from 'business/services/AuthService';

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
    await this.navigate(url);
  }

  async handleURL(url: string) {
    const isLoggedIn = await AuthService.getInstance().isLoggedIn();
    if (!isLoggedIn) {
      this.setPendingURL(url);
      console.log('[DeepLinkHandler] User not logged in → AuthScreen');
      push('AuthScreen');
      return;
    }
    await this.navigate(url);
  }

  private async navigate(url: string) {
    try {
      const u = new URL(url);
      const path = u.pathname.replace(/^\//, '');
      const params: Record<string, string> = {};
      u.searchParams.forEach((v, k) => (params[k] = v));

      console.log('[DeepLinkHandler] Navigating to', path, params);

      switch (path) {
        case 'pay':
          push('SendConfirmationScreen', params);
          break;
        case 'claim':
          push('ClaimPaymentScreen', params);
          break;
        case 'deposit':
          push('DepositScreen', params);
          break;
        default:
          console.log('[DeepLinkHandler] Unknown path:', path);
      }
    } catch (e) {
      console.error('[DeepLinkHandler] Failed to parse URL:', e);
    }
  }
}

export const deepLinkHandler = new DeepLinkHandler();
