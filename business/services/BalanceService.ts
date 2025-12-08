// services/BalanceService.ts

import { ContractService } from "./ContractService";
import { BalanceEntry } from "business/Types";
import { Utils } from "business/Utils";

type BalanceListener = (balances: BalanceEntry[]) => void;
type UpdateTimeListener = (time: number | null) => void;

export class BalanceService {
  private static instance: BalanceService;

  balances: BalanceEntry[] = [];
  private balanceUpdateTime: number | null = null;

  private balanceListeners: BalanceListener[] = [];
  private updateTimeListeners: UpdateTimeListener[] = [];

  private _mutex = false;
  private contractService: ContractService;

  private _totalBalance: string = "0.00"; // 🔹 store last computed balance
  private needsRetryOnReconnect = false;
  private netInfoUnsubscribe?: () => void;

  private constructor() {
    this.contractService = ContractService.getInstance();
    this.attachConnectivityListener();
  }

  static getInstance(): BalanceService {
    if (!BalanceService.instance) {
      BalanceService.instance = new BalanceService();
    }
    return BalanceService.instance;
  }

  // ----------------- SUBSCRIPTIONS -----------------
  onBalanceChange(listener: BalanceListener): void {
    this.balanceListeners.push(listener);
  }

  offBalanceChange(listener: BalanceListener): void {
    this.balanceListeners = this.balanceListeners.filter((fn) => fn !== listener);
  }

  onUpdateTimeChange(listener: UpdateTimeListener): void {
    this.updateTimeListeners.push(listener);
  }

  offUpdateTimeChange(listener: UpdateTimeListener): void {
    this.updateTimeListeners = this.updateTimeListeners.filter((fn) => fn !== listener);
  }

  private notifyBalanceChange(): void {
    this.balanceListeners.forEach((fn) => fn(this.balances));
  }

  private notifyUpdateTimeChange(): void {
    this.updateTimeListeners.forEach((fn) => fn(this.balanceUpdateTime));
  }

  // ----------------- GETTERS -----------------
  get currentBalances(): BalanceEntry[] {
    return this.balances;
  }

  get currentUpdateTime(): number | null {
    return this.balanceUpdateTime;
  }

  get totalBalance(): string {
    return this._totalBalance;
  }

  // ----------------- ACTIONS -----------------
  async getBalance(): Promise<void> {
    if (this._mutex) return;
    this._mutex = true;

    const prevBalances = [...this.balances];
    const prevUpdateTime = this.balanceUpdateTime;

    try {
      const cr = this.contractService.getCrypto();
      this.balanceUpdateTime = null;
      this.notifyUpdateTimeChange();

      const ret = await this.contractService.getBalance(cr?.commitment);

      this.balances = Utils.filterBalance(ret.amounts);
      this.balanceUpdateTime = ret.update_time;

      this._totalBalance = this.computeTotal(this.balances);
      this.needsRetryOnReconnect = false;

      this.notifyBalanceChange();
      this.notifyUpdateTimeChange();
    } catch (err) {
      console.error("❌ [BalanceService] Failed to fetch balance:", err);
      // Keep showing the last known balance instead of clearing to $0 on failure.
      this.balances = prevBalances;
      this.balanceUpdateTime = prevUpdateTime;
      this._totalBalance = this.computeTotal(this.balances);
      this.needsRetryOnReconnect = true;
      this.notifyBalanceChange();
      this.notifyUpdateTimeChange();
    } finally {
      this._mutex = false;
    }
  }

  clear(): void {
    this.balances = [];
    this.balanceUpdateTime = null;
    this._totalBalance = "0.00";
    this.needsRetryOnReconnect = false;
    this.notifyBalanceChange();
    this.notifyUpdateTimeChange();
  }

  private attachConnectivityListener() {
    try {
      // Lazy import to avoid requiring NetInfo in non-RN contexts (e.g., tests).
      const NetInfo = require("@react-native-community/netinfo").default;
      this.netInfoUnsubscribe = NetInfo.addEventListener((state: any) => {
        const reachable = state.isConnected && state.isInternetReachable !== false;
        if (reachable && this.needsRetryOnReconnect && !this._mutex) {
          void this.getBalance();
        }
      });
    } catch (err) {
      console.warn("⚠️ [BalanceService] NetInfo unavailable; auto-retry on reconnect disabled.", err);
    }
  }

  private computeTotal(balances: BalanceEntry[]): string {
    const sum = balances.reduce((acc, b) => {
      const amt = parseFloat(b.amount ?? "0");
      return acc + (isNaN(amt) ? 0 : amt);
    }, 0);
    return (sum / 1_000_000).toFixed(2);
  }
}
