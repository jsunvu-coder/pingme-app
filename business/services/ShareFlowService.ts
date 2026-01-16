type ClaimSharePayload = {
  amountUsdStr?: string;
  from?: 'login' | 'signup';
  tokenName?: string;
};

class ShareFlowService {
  private pendingClaim: ClaimSharePayload | null = null;

  setPendingClaim(payload: ClaimSharePayload) {
    this.pendingClaim = payload;
  }

  consumePendingClaim(): ClaimSharePayload | null {
    const payload = this.pendingClaim;
    this.pendingClaim = null;
    return payload;
  }
}

export const shareFlowService = new ShareFlowService();
