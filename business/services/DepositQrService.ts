import { AuthService } from './AuthService';
import { BalanceService } from './BalanceService';
import { ContractService } from './ContractService';
import { RecordService } from './RecordService';
import { CryptoUtils } from 'business/CryptoUtils';
import { Utils } from 'business/Utils';
import { GLOBALS, MIN_AMOUNT } from 'business/Constants';

type DepositSubmissionParams = {
  token: string;
  commitment: string;
  amountDecimal: string; // human readable, e.g. "10.00"
  availableBalance: string; // micro units as string
};

const normalizeDecimal = (value: string) => value.replace(/,/g, '').trim();

export async function submitDepositTransaction({
  token,
  commitment,
  amountDecimal,
  availableBalance,
}: DepositSubmissionParams): Promise<{ txHash: string }> {
  const tokenAddress = (token ?? '').toString();
  const normalizedAmount = normalizeDecimal(amountDecimal);

  if (!normalizedAmount) {
    throw new Error('_ALERT_ENTER_AMOUNT');
  }

  const tokenDecimals = Utils.getTokenDecimals(token);
  const amountMicro = Utils.toMicro(normalizedAmount, tokenDecimals);
  const globals = Utils.getSessionObject(GLOBALS) ?? {};
  const minAmount = BigInt(globals?.[MIN_AMOUNT] ?? 0);
  const available = BigInt(availableBalance ?? '0');

  if (amountMicro < minAmount) {
    throw new Error('_ALERT_BELOW_MINIMUM');
  }
  if (amountMicro > available) {
    throw new Error('_ALERT_ABOVE_AVAILABLE');
  }

  const contractService = ContractService.getInstance();
  const authService = AuthService.getInstance();
  const balanceService = BalanceService.getInstance();
  const recordService = RecordService.getInstance();

  const cr = contractService.getCrypto();
  if (!cr) {
    throw new Error('Session required');
  }

  const trimmedCommitment = commitment.trim();
  if (!trimmedCommitment) {
    throw new Error('_ALERT_MISSING_COMMITMENT');
  }

  const nextCurrentSalt = CryptoUtils.globalHash(cr.current_salt);
  if (!nextCurrentSalt) throw new Error('Failed to derive next current salt.');

  const nextProof = CryptoUtils.globalHash2(cr.input_data, nextCurrentSalt);
  if (!nextProof) throw new Error('Failed to derive next proof.');

  const nextCommitment = CryptoUtils.globalHash(nextProof);
  if (!nextCommitment) throw new Error('Failed to derive next commitment.');

  const nextCommitmentHash = CryptoUtils.globalHash(nextCommitment);
  if (!nextCommitmentHash) throw new Error('Failed to derive commitment hash.');

  // Pause commitment guard before starting deposit transaction
  contractService.pauseCommitmentGuard();

  let txHash: string | null = null;

  try {
    await authService.commitProtect(
      async () => {
        const result = await contractService.withdrawAndDeposit(
          tokenAddress,
          amountMicro.toString(),
          cr.proof,
          nextCommitment,
          trimmedCommitment
        );

        txHash = result?.txHash ?? null;

        const updated = {
          ...cr,
          current_salt: nextCurrentSalt,
          proof: nextProof,
          commitment: nextCommitment,
        };
        contractService.setCrypto(updated);

        return result;
      },
      cr.commitment,
      nextCommitmentHash
    );

    if (!txHash) {
      throw new Error('Failed to obtain transaction hash.');
    }

    // Note: balanceService.getBalance() will pause/resume its own commitment guard,
    // but we keep it paused here to ensure guard stays paused during the entire flow
    await balanceService.getBalance();
    recordService.updateRecord();

    return { txHash };
  } finally {
    // Resume commitment guard after deposit transaction completes
    contractService.resumeCommitmentGuard();
  }
}
