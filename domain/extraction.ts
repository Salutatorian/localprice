import { z } from "zod";

export const UNCERTAIN_THRESHOLD = 0.72;

export const fieldConfidenceSchema = z.object({
  value: z.unknown().nullable(),
  confidence: z.number().min(0).max(1),
});

export const extractedLineItemSchema = z.object({
  rawDescription: z.string().min(1),
  normalizedName: z.string().min(1),
  brand: z.string().nullable(),
  quantity: z.number().positive().nullable(),
  packageSize: z.number().positive().nullable(),
  unit: z.enum(["oz", "lb", "g", "kg", "ml", "l", "fl_oz", "count", "unknown"]),
  lineTotalCents: z.number().int(),
  unitPriceCents: z.number().int().nullable(),
  discountCents: z.number().int().nullable(),
  barcode: z.string().nullable(),
  confidence: z.object({
    rawDescription: z.number().min(0).max(1),
    normalizedName: z.number().min(0).max(1),
    brand: z.number().min(0).max(1),
    quantity: z.number().min(0).max(1),
    packageSize: z.number().min(0).max(1),
    unit: z.number().min(0).max(1),
    lineTotalCents: z.number().min(0).max(1),
    unitPriceCents: z.number().min(0).max(1),
    barcode: z.number().min(0).max(1),
  }),
});

export const extractedReceiptSchema = z.object({
  merchantName: z.string().min(1),
  storeAddress: z.string().nullable(),
  branchClues: z.string().nullable(),
  phone: z.string().nullable(),
  purchasedAt: z.string().nullable(),
  currency: z.string().length(3),
  subtotalCents: z.number().int().nullable(),
  taxCents: z.number().int().nullable(),
  totalCents: z.number().int(),
  items: z.array(extractedLineItemSchema).min(1),
  confidence: z.object({
    merchantName: z.number().min(0).max(1),
    storeAddress: z.number().min(0).max(1),
    purchasedAt: z.number().min(0).max(1),
    currency: z.number().min(0).max(1),
    totalCents: z.number().min(0).max(1),
  }),
});

export type ExtractedReceipt = z.infer<typeof extractedReceiptSchema>;
export type ExtractedLineItem = z.infer<typeof extractedLineItemSchema>;

export type ArithmeticIssue = {
  code: "total_mismatch" | "negative_price" | "impossible_date" | "empty_items";
  message: string;
};

export function validateExtractedReceipt(
  input: unknown,
  now = new Date(),
): { receipt: ExtractedReceipt; issues: ArithmeticIssue[] } {
  const receipt = extractedReceiptSchema.parse(input);
  const issues: ArithmeticIssue[] = [];

  if (receipt.items.length === 0) {
    issues.push({ code: "empty_items", message: "Receipt has no line items." });
  }

  const itemSum = receipt.items.reduce((sum, item) => sum + item.lineTotalCents, 0);
  if (receipt.subtotalCents !== null && Math.abs(itemSum - receipt.subtotalCents) > 5) {
    issues.push({
      code: "total_mismatch",
      message: `Line items (${itemSum}) do not add up to subtotal (${receipt.subtotalCents}).`,
    });
  }

  if (receipt.totalCents <= 0) {
    issues.push({ code: "negative_price", message: "Receipt total must be greater than zero." });
  }

  for (const item of receipt.items) {
    if (item.lineTotalCents < 0) {
      issues.push({
        code: "negative_price",
        message: `Negative line total for ${item.rawDescription}.`,
      });
    }
  }

  if (receipt.purchasedAt) {
    const purchased = new Date(receipt.purchasedAt);
    const maxFuture = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const minPast = new Date(now.getTime() - 400 * 24 * 60 * 60 * 1000);
    if (Number.isNaN(purchased.getTime()) || purchased > maxFuture || purchased < minPast) {
      issues.push({
        code: "impossible_date",
        message: "Receipt date is missing or outside an acceptable range.",
      });
    }
  }

  return { receipt, issues };
}

export function isUncertain(confidence: number): boolean {
  return confidence < UNCERTAIN_THRESHOLD;
}

export function receiptOverallConfidence(receipt: ExtractedReceipt): number {
  const fields = [
    receipt.confidence.merchantName,
    receipt.confidence.totalCents,
    ...receipt.items.map((item) => item.confidence.normalizedName),
    ...receipt.items.map((item) => item.confidence.lineTotalCents),
  ];
  return fields.reduce((sum, value) => sum + value, 0) / fields.length;
}
