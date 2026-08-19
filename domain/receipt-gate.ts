export const NOT_A_RECEIPT_MESSAGE =
  "That photo is not a grocery receipt. Upload a store ticket from Saipan. Random or explicit photos are rejected and deleted.";

export type ReceiptGateResult = {
  isReceipt: boolean;
  confidence: number;
};

export function passesReceiptGate(result: ReceiptGateResult): boolean {
  return result.isReceipt && result.confidence >= 0.8;
}
