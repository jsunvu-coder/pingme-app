// services/BalanceService.ts

import { ContractService } from './ContractService';
import { BalanceEntry } from 'business/Types';
import { Utils } from 'business/Utils';
import { TOKENS, STABLE_TOKENS } from 'business/Constants';
import { CryptoUtils } from 'business/CryptoUtils';
import { AccountDataService } from './AccountDataService';
import { getStore, type AppDispatch } from 'store/index';
import { setStablecoinBalance } from 'store/balanceSlice';

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

  private _totalBalance: string = '0.00'; // 🔹 store last computed balance
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

  /**
   * Get only stablecoin balances (USDC, pUSDC)
   */
  getStablecoinBalances(): BalanceEntry[] {
    const stableAddresses = STABLE_TOKENS.map((tokenName) =>
      TOKENS[tokenName as keyof typeof TOKENS]?.toLowerCase()
    ).filter(Boolean);

    return this.balances.filter((b) => {
      const tokenAddress = (b?.token ?? '').toString().toLowerCase();
      return stableAddresses.includes(tokenAddress);
    });
  }

  /**
   * Get only non-stablecoin balances (all tokens except stablecoins)
   */
  getNonStablecoinBalances(): BalanceEntry[] {
    const stableAddresses = STABLE_TOKENS.map((tokenName) =>
      TOKENS[tokenName as keyof typeof TOKENS]?.toLowerCase()
    ).filter(Boolean);

    return this.balances.filter((b) => {
      const tokenAddress = (b?.token ?? '').toString().toLowerCase();
      return !stableAddresses.includes(tokenAddress);
    });
  }

  /**
   * Get total balance of stablecoins only
   */
  getStablecoinTotal(): string {
    const stablecoinBalances = this.getStablecoinBalances();
    return this.computeTotal(stablecoinBalances);
  }

  // ----------------- ACTIONS -----------------
  async getBalance(): Promise<void> {
    if (this._mutex) return;
    this._mutex = true;

    const prevBalances = [...this.balances];
    const prevUpdateTime = this.balanceUpdateTime;

    // Pause commitment guard when updating balance
    this.contractService.pauseCommitmentGuard();

    try {
      const cr = this.contractService.getCrypto();
      if (!cr) {
        this.balanceUpdateTime = null;
        this.notifyUpdateTimeChange();
        return;
      }

      // Update commitment from input_data if available
      let commitment = cr.commitment;
      if (cr.input_data) {
        try {
          console.log('[BalanceService] Updating commitment from input_data...');

          // create salt from input_data
          const salt = CryptoUtils.globalHash(cr.input_data);
          if (!salt) {
            console.warn('[BalanceService] Failed to generate salt from input_data');
          } else {
            // Fetch current_salt from server
            const ret1 = await this.contractService.getCurrentSalt(salt);
            const current_salt = ret1.current_salt;
            if (current_salt) {
              // Derive proof from input_data and current_salt
              const proof = CryptoUtils.globalHash2(cr.input_data, current_salt);
              if (proof) {
                // Derive commitment from proof
                commitment = CryptoUtils.globalHash(proof);
                if (commitment) {
                  // Prepare updated crypto object with new commitment
                  const updated = {
                    ...cr,
                    salt,
                    current_salt,
                    proof,
                    commitment,
                  };
                  // If the session was cleared (e.g., user logged out) while this
                  // async flow was in-flight, do not resurrect crypto state.
                  const currentCrypto = this.contractService.getCrypto();
                  if (!currentCrypto) {
                    console.warn(
                      '[BalanceService] Skipping setCrypto because session is no longer active'
                    );
                  } else {
                    this.contractService.setCrypto(updated);
                    console.log('[BalanceService] Successfully updated commitment:', commitment);
                  }
                }
              }
            }
          }
        } catch (error) {
          console.warn('[BalanceService] Failed to update commitment from input_data', error);
          // Tiếp tục với commitment hiện có nếu có lỗi
        }
      }

      this.balanceUpdateTime = null;
      this.notifyUpdateTimeChange();

      const ret = await this.contractService.getBalance(commitment);

      this.balances = Utils.filterBalance(ret.amounts);
      this.balanceUpdateTime = ret.update_time;

      this._totalBalance = this.computeTotal(this.balances);
      this.needsRetryOnReconnect = false;

      // Update Redux store with stablecoin balance
      this.updateReduxBalance();

      this.notifyBalanceChange();
      this.notifyUpdateTimeChange();
    } catch (err) {
      console.error('❌ [BalanceService] Failed to fetch balance:', err);
      // Keep showing the last known balance instead of clearing to $0 on failure.
      this.balances = prevBalances;
      this.balanceUpdateTime = prevUpdateTime;
      this._totalBalance = this.computeTotal(this.balances);
      this.needsRetryOnReconnect = true;
      this.notifyBalanceChange();
      this.notifyUpdateTimeChange();
    } finally {
      // Resume commitment guard sau khi update balance xong
      this.contractService.resumeCommitmentGuard();
      this._mutex = false;
    }
  }

  clear(): void {
    this.balances = [];
    this.balanceUpdateTime = null;
    this._totalBalance = '0.00';
    this.needsRetryOnReconnect = false;
    this.notifyBalanceChange();
    this.notifyUpdateTimeChange();
  }

  private attachConnectivityListener() {
    try {
      // Lazy import to avoid requiring NetInfo in non-RN contexts (e.g., tests).
      const NetInfo = require('@react-native-community/netinfo').default;
      this.netInfoUnsubscribe = NetInfo.addEventListener((state: any) => {
        const reachable = state.isConnected && state.isInternetReachable !== false;
        if (reachable && this.needsRetryOnReconnect && !this._mutex) {
          void this.getBalance();
        }
      });
    } catch (err) {
      console.warn(
        '⚠️ [BalanceService] NetInfo unavailable; auto-retry on reconnect disabled.',
        err
      );
    }
  }

  private computeTotal(balances: BalanceEntry[]): string {
    // Note: This method is primarily used for stablecoin totals (6 decimals)
    // When mixing tokens with different decimals, we sum amounts with the same decimals
    // For display purposes, we use the most common decimals (stablecoin = 6)

    // Group by decimals and sum separately
    const sumsByDecimals = new Map<number, bigint>();

    balances.forEach((b) => {
      try {
        if (!b?.amount) return;
        const tokenDecimals = Utils.getTokenDecimals(b.token);
        const amount = BigInt(b.amount);
        const current = sumsByDecimals.get(tokenDecimals) || 0n;
        sumsByDecimals.set(tokenDecimals, current + amount);
      } catch {
        // Skip invalid entries
      }
    });

    // If all balances have the same decimals, use that
    // Otherwise, default to stablecoin decimals (6) for display
    const decimalsArray = Array.from(sumsByDecimals.keys());
    const displayDecimals = decimalsArray.length === 1 ? decimalsArray[0] : 6;

    // Sum amounts with the same decimals (they're already in correct units)
    // For display, we'll use the primary decimals (stablecoin = 6)
    const totalMicro = Array.from(sumsByDecimals.values()).reduce((acc, val) => acc + val, 0n);

    return Utils.formatMicroToUsd(
      totalMicro,
      undefined,
      { grouping: true, empty: '0.00' },
      displayDecimals
    );
  }

  /**
   * Update Redux store with current stablecoin balance for the current account
   */
  private async updateReduxBalance(): Promise<void> {
    try {
      const accountEmail = AccountDataService.getInstance().email;
      if (!accountEmail) {
        console.warn('[BalanceService] No account email available, skipping Redux update');
        return;
      }

      const stablecoinBalance = this.getStablecoinTotal();
      const store = await getStore();
      // Dispatch action to update Redux store
      const dispatch = store.dispatch as AppDispatch;
      dispatch(setStablecoinBalance({ accountEmail, stablecoinBalance }));
    } catch (error) {
      console.warn('[BalanceService] Failed to update Redux balance:', error);
      // Don't throw - this is a non-critical update
    }
  }
}
