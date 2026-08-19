export const REPORT_REASONS = [
  "wrong_price",
  "wrong_store",
  "spam",
  "abusive",
  "other",
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  wrong_price: "Price looks wrong",
  wrong_store: "Wrong store",
  spam: "Spam or fake",
  abusive: "Abusive or junk",
  other: "Something else",
};

export function parseEmailList(raw: string | undefined): string[] {
  if (!raw) {
    return [];
  }
  return raw
    .split(/[,;\s]+/)
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.includes("@"));
}

export function emailIsListed(email: string | null | undefined, list: string[]): boolean {
  if (!email) {
    return false;
  }
  return list.includes(email.trim().toLowerCase());
}

export function firstSubmissionHoldsPrices(confirmedReceiptCount: number): boolean {
  return confirmedReceiptCount === 0;
}

export function isReportReason(value: string): value is ReportReason {
  return (REPORT_REASONS as readonly string[]).includes(value);
}
