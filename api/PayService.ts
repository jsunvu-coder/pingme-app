// business/services/PayService.ts
import { Alert } from "react-native";
import { CryptoUtils } from "../business/CryptoUtils";
import { Utils } from "../business/Utils";
import { GLOBALS, MIN_AMOUNT, TOKENS } from "../business/Constants";
import { AuthService } from "business/services/AuthService";
import { ContractService } from "business/services/ContractService";
import { BalanceService } from "business/services/BalanceService";
import { SKIP_PASSPHRASE, URL } from "business/Config";
import { RecordService } from "business/services/RecordService";

export class PayService {
  private static instance: PayService;
  private authService: AuthService;
  private contractService: ContractService;
  private balanceService: BalanceService;

  private constructor() {
    this.authService = AuthService.getInstance();
    this.contractService = ContractService.getInstance();
    this.balanceService = BalanceService.getInstance();
  }

  static getInstance(): PayService {
    if (!PayService.instance) {
      PayService.instance = new PayService();
    }
    return PayService.instance;
  }

  // ---------- Logging ----------
  private handleError(context: string, error: any): void {
    const message = error?.message ?? "Unexpected error occurred.";
    console.error(`❌ [PayService] ${context}:`, { message, stack: error?.stack, details: error });
    Alert.alert("Error", `${context}\n\n${message}`);
  }

  private logRequest(api: string, payload: any) {
    console.log(`📡 [PayService] Request → ${api}`, JSON.stringify(payload, null, 2));
  }

  private logResponse(api: string, result: any) {
    console.log(`✅ [PayService] Response ← ${api}`, JSON.stringify(result, null, 2));
  }

  private logFailure(api: string, error: any) {
    console.error(`❌ [PayService] Request Failed ← ${api}`, {
      message: error?.message,
      response: error?.response?.data ?? error,
      stack: error?.stack,
    });
  }

  // ---------- Main Entry ----------
  async pay({
    entry,
    username,
    amount,
    passphrase,
    days,
    confirm,
    setLoading,
    setTxHash,
    setPayLink
  }: {
    entry: any;
    username: string;
    amount: string;
    passphrase: string;
    days: number;
    confirm: (msg: string, okOnly?: boolean) => Promise<boolean>;
    setLoading: (loading: boolean) => void;
    setTxHash: (hash?: string) => void;
    setPayLink: (link?: string) => void
  }) {
    try {
      console.log("🚀 [PayService] Starting pay() process...");

      // ---------- Validation ----------
      if (!entry?.amount) {
        if (await confirm("_ALERT_SELECT_BALANCE", false)) return;
      }

      username = username.toLowerCase().trim();
      const isEmail = username.includes("@");

      if (isEmail && !username) {
        if (await confirm("_ALERT_EMAIL_BLANK", false)) return;
      }

      if (!amount) {
        if (await confirm("_ALERT_ENTER_AMOUNT", false)) return;
      }

      const kMinAmount = BigInt(Utils.getSessionObject(GLOBALS)[MIN_AMOUNT]);
      const kAmount = Utils.toMicro(amount);
      const kEntry = BigInt(entry.amount);

      if (kAmount < kMinAmount) {
        if (await confirm("_ALERT_BELOW_MINIMUM", false)) return;
      } else if (kAmount > kEntry) {
        if (await confirm("_ALERT_ABOVE_AVAILABLE", false)) return;
      }

      passphrase = passphrase.trim();
      if (kAmount >= BigInt(SKIP_PASSPHRASE * 1_000_000) && !passphrase) {
        if (await confirm("_ALERT_SKIP_PASSPHRASE", false)) return;
      }

      if (days < 1) {
        if (await confirm("_ALERT_MIN_DURATION", false)) return;
      }

      // ---------- Confirm ----------
      if (!(await confirm("_CONFIRM_PAYMENT"))) return;
      setLoading(true);

      // ---------- Cryptographic preparation ----------
      console.log("🔐 [PayService] Generating cryptographic data...");
      const lockboxInputData = CryptoUtils.strToHex2(username, passphrase);
      const lockboxSalt = CryptoUtils.globalHash(CryptoUtils.randomHex());
      if (!lockboxSalt) throw new Error("Failed to generate lockbox salt.");

      const lockboxCommitmentInput = CryptoUtils.globalHash2(lockboxInputData, lockboxSalt);
      if (!lockboxCommitmentInput) throw new Error("Failed to generate lockbox commitment input.");

      const lockboxCommitment = CryptoUtils.globalHash(lockboxCommitmentInput);
      console.log("🔏 [PayService] Lockbox commitment generated:", lockboxCommitment);

      const contractService = ContractService.getInstance();
      const authService = AuthService.getInstance();
      const balanceService = BalanceService.getInstance();
      const recordService = RecordService.getInstance();

      const cr = contractService.getCrypto();
      const nextCurrentSalt = CryptoUtils.globalHash(cr.current_salt);
      if (!nextCurrentSalt) throw new Error("Failed to generate next current salt.");
      const nextProof = CryptoUtils.globalHash2(cr.input_data, nextCurrentSalt);
      if (!nextProof) throw new Error("Failed to generate next proof.");
      const nextCommitment = CryptoUtils.globalHash(nextProof);
      if (!nextCommitment) throw new Error("Failed to generate next commitment.");

      // ---------- Check lockbox ----------
      this.logRequest("pm_has_lockbox", { lockboxCommitment });
      if (!lockboxCommitment) throw new Error("Lockbox commitment is required.");
      const ret = await contractService.hasLockbox(lockboxCommitment);
      this.logResponse("pm_has_lockbox", ret);

      if (ret.has_lockbox) {
        await confirm("_ALERT_LOCKBOX_ALREADY_EXISTS", false);
        return;
      }

      // ---------- Execute payment ----------
      console.log("💳 [PayService] Executing payment...");
      const nextCommitmentHash = CryptoUtils.globalHash(nextCommitment);
      if (!nextCommitmentHash) throw new Error("Failed to generate next commitment hash.");
      const lockboxCommitmentHash = CryptoUtils.globalHash(lockboxCommitment);
      if (!lockboxCommitmentHash) throw new Error("Failed to generate lockbox commitment hash.");
      await authService.commitProtect(
        async () => {
          const { txHash, payLink } = await this._pay(
            isEmail,
            entry,
            username,
            days,
            kAmount.toString(),
            lockboxCommitment,
            lockboxSalt,
            nextCurrentSalt,
            nextProof,
            nextCommitment
          );

          setTxHash(txHash);
          console.log("✅ [PayService] Payment success! TX Hash:", txHash);

          if (payLink) {console.log("🔗 Payment link:", payLink);
            setPayLink(payLink)
          }
          return txHash;
        },
        cr.commitment,
        nextCommitmentHash,
        lockboxCommitmentHash
      );

      // ---------- Refresh balances & records ----------
      console.log("🔄 [PayService] Updating balances and records...");
      await balanceService.getBalance();
      await recordService.updateRecord();

      console.log("🎉 [PayService] Payment flow completed successfully.");
    } catch (error) {
      this.handleError("Payment process failed", error);
      await confirm("_ALERT_PAYMENT_FAILED", false);
    } finally {
      setLoading(false);
    }
  }

  // ---------- Core Payment Execution ----------
  async _pay(
    isEmail: boolean,
    entry: any,
    username: string,
    days: number,
    amt: string,
    lockboxCommitment: string,
    lockboxSalt: string,
    nextCurrentSalt: string,
    nextProof: string,
    nextCommitment: string
  ): Promise<{ txHash: string; payLink?: string }> {
    const duration = days * 86400; // seconds per day
    const contractService = ContractService.getInstance();
    const cr = contractService.getCrypto();

    const apiName = isEmail ? "withdrawAndSendEmail" : "withdrawAndSend";
    const payload = {
      token: entry.token,
      amt,
      proof: cr.proof,
      salt: cr.salt,
      nextCommitment,
      duration,
      lockboxCommitment,
      ...(isEmail ? { username, lockboxSalt, tokenType: "USDT" } : {}),
    };

    this.logRequest(apiName, payload);

    try {
      let ret: any;
      if (isEmail) {
        ret = await contractService.withdrawAndSendEmail(
          entry.token,
          amt,
          cr.proof,
          cr.salt,
          nextCommitment,
          duration,
          lockboxCommitment,
          username,
          lockboxSalt,
          "USDT"
        );
      } else {
        ret = await contractService.withdrawAndSend(
          entry.token,
          amt,
          cr.proof,
          cr.salt,
          nextCommitment,
          duration,
          lockboxCommitment
        );
      }

      this.logResponse(apiName, ret);

      // ✅ Update cryptographic state
      cr.current_salt = nextCurrentSalt;
      cr.proof = nextProof;
      cr.commitment = nextCommitment;
      contractService.setCrypto(cr);

      // ✅ Return transaction hash and link (if applicable)
      const txHash = ret.txHash;
      const payLink = !isEmail ? `${URL}/claim?lockboxSalt=${lockboxSalt}` : undefined;

      console.log("📦 [PayService] TX Hash:", txHash);
      if (payLink) console.log("🌐 [PayService] Pay Link:", payLink);

      return { txHash, payLink };
    } catch (err) {
      this.logFailure(apiName, err);
      throw err;
    }
  }
}
