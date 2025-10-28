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

  private constructor() {
    this.contractService = ContractService.getInstance();
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

    try {
      const cr = this.contractService.getCrypto();
      this.balanceUpdateTime = null;
      this.notifyUpdateTimeChange();

      const ret = await this.contractService.getBalance(cr?.commitment).catch(() => ({
        amounts: [],
        update_time: null,
      }));

      this.balances = Utils.filterBalance(ret.amounts);
      this.balanceUpdateTime = ret.update_time;

      // 🔹 Compute and store total balance
      const sum = this.balances.reduce((acc, b) => {
        const amt = parseFloat(b.amount ?? "0");
        return acc + (isNaN(amt) ? 0 : amt);
      }, 0);
      this._totalBalance = (sum / 1_000_000).toFixed(2);

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
    this.notifyBalanceChange();
    this.notifyUpdateTimeChange();
  }
}
