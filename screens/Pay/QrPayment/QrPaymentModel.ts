// business/models/QrPaymentModel.ts

export type QrPaymentMode = "predefined" | "input";

export interface QrPaymentData {
  recipient: string;
  merchant?: string;
  invoiceNo?: string;
  amount?: string;
  method?: string;
  mode: QrPaymentMode;
}

/**
 * Helper to normalize incoming QR data and determine correct mode
 */
export function createQrPaymentData(raw: Partial<QrPaymentData>): QrPaymentData {
  const hasAmount = !!raw.amount && Number(raw.amount) > 0;

  return {
    recipient: raw.recipient ?? "unknown@pingme.io",
    merchant: raw.merchant ?? undefined,
    invoiceNo: raw.invoiceNo ?? undefined,
    amount: hasAmount ? raw.amount : undefined,
    method: raw.method ?? "PingMe Wallet",
    mode: hasAmount ? "predefined" : "input",
  };
}


export const rawPredefined: QrPaymentData = {
    recipient: "store@pingme.io",
    merchant: "Wellcome Supermarket – Central Branch",
    invoiceNo: "PM20251010A001",
    amount: "100.00",
    mode: "predefined",
  };

  // Case 2: open QR (no amount)
export const rawOpen: QrPaymentData = {
    recipient: "donation@charity.org",
    merchant: "PingMe Charity Fund",
    invoiceNo: "PM20251010A002",
    mode: 'input'
  };
