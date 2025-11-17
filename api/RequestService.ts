// business/services/RequestService.ts
import { Alert } from 'react-native';
import { Utils } from '../business/Utils';
import { ContractService } from '../business/services/ContractService';
import { GLOBALS, MIN_AMOUNT, TOKEN_NAMES } from '../business/Constants';
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

  // ---------- Main Entry ----------
  async requestPayment({
    entry,
    requestee,
    amount,
    customMessage,
    confirm,
    setLoading,
    setSent,
  }: {
    entry?: any;
    requestee?: string;
    amount?: string;
    customMessage?: string;
    confirm: (msg: string, okOnly?: boolean) => Promise<boolean>;
    setLoading: (loading: boolean) => void;
    setSent: (sent: boolean) => void;
  }) {
    try {
      console.log('🚀 [RequestService] Starting requestPayment()...');

      // ---------- Validation ----------
      const safeRequestee = (requestee ?? '').toLowerCase().trim();
      const safeAmount = amount?.trim() ?? '';

      if (!Utils.isValidEmail(safeRequestee)) {
        if (await confirm('_ALERT_INVALID_EMAIL', false)) return;
      }

      if (!safeAmount) {
        if (await confirm('_ALERT_ENTER_AMOUNT', false)) return;
      }
      const kMinAmount = BigInt(Utils.getSessionObject(GLOBALS)[MIN_AMOUNT]);
      const kAmount = Utils.toMicro(safeAmount);
      if (kAmount < kMinAmount) {
        if (await confirm('_ALERT_BELOW_MINIMUM', false)) return;
      }

      if (!entry?.token) {
        if (await confirm('_ALERT_SELECT_BALANCE', false)) return;
      } else {
        console.log('🚀 [RequestService] No entry available');
      }

      // ---------- Confirm ----------
      if (!(await confirm('_CONFIRM_REQUEST'))) return;
      setLoading(true);

      // ---------- Prepare Crypto ----------
      const cr = this.contractService.getCrypto();
      if (!cr?.username) throw new Error('Missing crypto username');

      const payload = {
        amount: kAmount.toString(),
        sender: cr.username,
        receiver: safeRequestee,
        token: entry.token,
        tokenSymbol: TOKEN_NAMES.USDC,
        customMessage: customMessage ?? '',
      };

      this.logRequest('requestPay', payload);

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
      this.handleError('Payment request failed', error);
      await confirm('_ALERT_REQUEST_FAILED', false);
    } finally {
      setLoading(false);
    }
  }

  async requestPaymentByLink({
    entry,
    requestee,
    amount,
    customMessage,
    confirm,
    setLoading,
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

      // ---------- Validation ----------
      const safeRequestee = (requestee ?? '').toLowerCase().trim();
      const safeAmount = amount?.trim() ?? '';

      if (!safeAmount) {
        if (await confirm('_ALERT_ENTER_AMOUNT', false)) return;
      }
      const kMinAmount = BigInt(Utils.getSessionObject(GLOBALS)[MIN_AMOUNT]);
      const kAmount = Utils.toMicro(safeAmount);
      if (kAmount < kMinAmount) {
        if (await confirm('_ALERT_BELOW_MINIMUM', false)) return;
      }

      // ---------- Confirm ----------
      if (!(await confirm('_CONFIRM_REQUEST'))) return;
      setLoading(true);

      // ---------- Prepare Crypto ----------
      const cr = this.contractService.getCrypto();
      if (!cr?.username) throw new Error('Missing crypto username');

      const payload = {
        amount: kAmount.toString(),
        sender: cr.username,
        customMessage: customMessage ?? '',
      };

      this.logRequest('requestPay', payload);

      // ---------- Execute Contract ----------
      const encodedRequester = encodeURIComponent(cr.username);
      const url = `${APP_URL}/pay?token=${entry.token}&amount=${kAmount.toString()}&requester=${encodedRequester}`;

      setPayLink(url);
      console.log('🎉 [RequestService] Payment request sent successfully.');
    } catch (error) {
      this.handleError('Payment request failed', error);
      await confirm('_ALERT_REQUEST_FAILED', false);
    } finally {
      setLoading(false);
    }
  }
}
