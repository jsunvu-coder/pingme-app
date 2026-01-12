import { useEffect } from 'react';
import { ContractService } from 'business/services/ContractService';
import { AuthService } from 'business/services/AuthService';
import { setRootScreen } from 'navigation/Navigation';

const POLL_INTERVAL_MS = 10_000;

async function checkCurrentCommitmentAndLogoutIfInvalid() {
  try {
    const contractService = ContractService.getInstance();
    const authService = AuthService.getInstance();

    if (contractService.isCommitmentGuardPaused()) {
      return;
    }

    const cr = contractService.getCrypto();
    if (!cr?.commitment) {
      // No active crypto/session → nothing to validate.
      return;
    }

    const result = await contractService.hasBalance(cr.commitment);
    const hasBalance = !!result?.has_balance;

    if (!hasBalance) {
      console.warn('[useCommitmentGuard] Commitment no longer has balance. Logging out user.', {
        commitment: cr.commitment,
      });
      await authService.logout();
      setRootScreen(['SplashScreen']);
    }
  } catch (error) {
    console.warn('[useCommitmentGuard] Failed to validate commitment state', error);
  }
}

export function useCommitmentGuard() {
  useEffect(() => {
    // Initial check on mount.
    void checkCurrentCommitmentAndLogoutIfInvalid();

    // Periodic polling via interval.
    const id = setInterval(() => {
      void checkCurrentCommitmentAndLogoutIfInvalid();
    }, POLL_INTERVAL_MS);

    return () => {
      clearInterval(id);
    };
  }, []);
}
