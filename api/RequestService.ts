// business/services/RequestService.ts
import { Alert } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Utils } from '../business/Utils';
import { ContractService } from '../business/services/ContractService';
import { GLOBALS, MIN_AMOUNT, TOKEN_NAMES, TOKENS, STABLE_TOKENS } from '../business/Constants';
import { APP_URL } from 'business/Config';

export class RequestService {
  private static instance: RequestService;
  private contractService: ContractService;

  private constructor() {
    this.contractService = ContractService.getInstance();
  }

  static getInstance(): RequestService {
    if (!RequestService.instance) {
      RequestService.instance = new RequestService();
    }
    return RequestService.instance;
  }

  // ---------- Logging ----------
  private handleError(context: string, error: any): void {
    const message = error?.message ?? 'Unexpected error occurred.';
    console.error(`❌ [RequestService] ${context}:`, {
      message,
      stack: error?.stack,
      details: error,
    });
    Alert.alert('Error', `${context}\n\n${message}`);
  }

  private logRequest(api: string, payload: any) {
    console.log(`📡 [RequestService] Request → ${api}`, JSON.stringify(payload, null, 2));
  }

  private logResponse(api: string, result: any) {
    console.log(`✅ [RequestService] Response ← ${api}`, JSON.stringify(result, null, 2));
  }

  private logFailure(api: string, error: any) {
    console.error(`❌ [RequestService] Request Failed ← ${api}`, {
      message: error?.message,
      response: error?.response?.data ?? error,
      stack: error?.stack,
    });
  }

  // ---------- Helper: Get token name from entry ----------
  private getTokenName(entry: any): string {
    // If tokenName is already provided in entry, use it
    if (entry?.tokenName) {
      return entry.tokenName;
    }

    // Otherwise, derive it from the token address
    const tokenAddress = (entry?.token ?? entry?.tokenAddress ?? '').toString().toLowerCase();
    if (!tokenAddress) {
      return TOKEN_NAMES.USDC; // Default fallback
    }

    // Check if it matches any stable token
    for (const tokenName of STABLE_TOKENS) {
      const addr = TOKENS[tokenName as keyof typeof TOKENS]?.toLowerCase();
      if (addr === tokenAddress) {
        return TOKEN_NAMES[tokenName as keyof typeof TOKEN_NAMES] || tokenName;
      }
    }

    // Check other tokens
    for (const [key, addr] of Object.entries(TOKENS)) {
      if (addr.toLowerCase() === tokenAddress) {
        return TOKEN_NAMES[key as keyof typeof TOKEN_NAMES] || key;
      }
    }

    return TOKEN_NAMES.USDC; // Default fallback
  }

  private async isOnline(): Promise<boolean> {
    try {
      const state = await NetInfo.fetch();
      return !!(state.isConnected && state.isInternetReachable !== false);
    } catch {
      // If NetInfo fails, don't block the user; let the request attempt handle errors.
      return true;
    }
  }

  // ---------- Main Entry ----------
  async requestPayment({
    entry,
    requestee,
    amount,
    customMessage,
    confirm,
    setDisabledInput,
    setSent,
  }: {
    entry?: any;
    requestee?: string;
    amount?: string;
    customMessage?: string;
    confirm: (msg: string, okOnly?: boolean) => Promise<boolean>;
    setLoading: (loading: boolean) => void;
    setDisabledInput: (disabled: boolean) => void;
    setSent: (sent: boolean) => void;
  }) {
    try {
      setDisabledInput(true);
      console.log('🚀 [RequestService] Starting requestPayment()...');

      if (!(await this.isOnline())) {
        await confirm('_ALERT_NO_INTERNET', true);
        return;
      }

      // ---------- Validation ----------
      const safeRequestee = (requestee ?? '').toLowerCase().trim();
      const safeAmount = amount?.trim() ?? '';

      if (!Utils.isValidEmail(safeRequestee)) {
        setDisabledInput(false);
        if (await confirm('_ALERT_INVALID_EMAIL', false)) return;
      }

      if (!safeAmount) {
        setDisabledInput(false);
        if (await confirm('_ALERT_ENTER_AMOUNT', false)) return;
      }
      const kMinAmount = BigInt(Utils.getSessionObject(GLOBALS)[MIN_AMOUNT]);
      const tokenAddress = entry?.tokenAddress ?? entry?.token;
      const tokenDecimals = Utils.getTokenDecimals(tokenAddress);
      const kAmount = Utils.toMicro(safeAmount, tokenDecimals);
      if (kAmount < kMinAmount) {
        if (await confirm('_ALERT_BELOW_MINIMUM', false)) return;
      }

      if (!entry?.token) {
        setDisabledInput(false);
        if (await confirm('_ALERT_SELECT_BALANCE', false)) return;
      } else {
        console.log('🚀 [RequestService] No entry available');
      }

      // ---------- Confirm ----------
      if (!(await confirm('_CONFIRM_REQUEST'))) {
        setDisabledInput(false);
        return;
      }

      // ---------- Prepare Crypto ----------
      const cr = this.contractService.getCrypto();
      if (!cr?.username) throw new Error('Missing crypto username');

      const tokenName = this.getTokenName(entry);
      const payload = {
        amount: kAmount.toString(),
        sender: cr.username,
        receiver: safeRequestee,
        token: entry.tokenAddress ?? entry.token,
        tokenSymbol: tokenName,
        customMessage: customMessage ?? '',
      };

      // ---------- Execute Contract ----------
      const ret = await this.contractService.requestPay(
        payload.amount,
        payload.sender,
        payload.receiver,
        payload.token,
        payload.tokenSymbol,
        payload.customMessage
      );

      this.logResponse('requestPay', ret);

      setSent(true);
      console.log('🎉 [RequestService] Payment request sent successfully.');
    } catch (error) {
      if (!(await this.isOnline())) {
        await confirm('_ALERT_NO_INTERNET', true);
        return;
      }
      this.handleError('Payment request failed', error);
      await confirm('_ALERT_REQUEST_FAILED', false);
    } finally {
    }
  }

  async requestPaymentByLink({
    entry,
    requestee,
    amount,
    customMessage,
    confirm,
    setPayLink,
  }: {
    entry?: any;
    requestee?: string;
    amount?: string;
    customMessage?: string;
    confirm: (msg: string, okOnly?: boolean) => Promise<boolean>;
    setLoading: (loading: boolean) => void;
    setPayLink: (link: string) => void;
  }) {
    try {
      console.log('🚀 [RequestService] Starting requestPaymentByLink()...');

      if (!(await this.isOnline())) {
        await confirm('_ALERT_NO_INTERNET', true);
        return;
      }

      // ---------- Validation ----------
      const safeAmount = amount?.trim() ?? '';

      if (!safeAmount) {
        if (await confirm('_ALERT_ENTER_AMOUNT', false)) return;
      }
      const kMinAmount = BigInt(Utils.getSessionObject(GLOBALS)[MIN_AMOUNT]);
      const tokenAddress = entry?.tokenAddress ?? entry?.token;
      const tokenDecimals = Utils.getTokenDecimals(tokenAddress);
      const kAmount = Utils.toMicro(safeAmount, tokenDecimals);
      if (kAmount < kMinAmount) {
        if (await confirm('_ALERT_BELOW_MINIMUM', false)) return;
      }

      if (!entry?.token) {
        if (await confirm('_ALERT_SELECT_BALANCE', false)) return;
      }

      // ---------- Confirm ----------
      if (!(await confirm('_CONFIRM_REQUEST'))) return;

      // ---------- Prepare Crypto ----------
      const cr = this.contractService.getCrypto();
      if (!cr?.username) throw new Error('Missing crypto username');

      // ---------- Execute Contract ----------
      const encodedRequester = encodeURIComponent(cr.username);
      const token = entry.tokenAddress ?? entry.token;
      const url = `${APP_URL}/pay?token=${token}&amount=${kAmount.toString()}&requester=${encodedRequester}`;

      setPayLink(url);
      console.log('🎉 [RequestService] Payment request sent successfully.');
    } catch (error) {
      if (!(await this.isOnline())) {
        await confirm('_ALERT_NO_INTERNET', true);
        return;
      }
      this.handleError('Payment request failed', error);
      await confirm('_ALERT_REQUEST_FAILED', false);
    } finally {
    }
  }
}
