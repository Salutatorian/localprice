export type TrustEvent = {
  marketId: string;
  delta: number;
  reason: string;
};

export function trustDeltaFor(reason: string): number {
  switch (reason) {
    case "accepted_receipt":
      return 2;
    case "independent_confirmation":
      return 3;
    case "moderator_confirm":
      return 1;
    case "rejected_receipt":
      return -4;
    case "confirmed_abuse":
      return -15;
    default:
      return 0;
  }
}

export function scoreForMarket(events: TrustEvent[], marketId: string): number {
  return events
    .filter((event) => event.marketId === marketId)
    .reduce((sum, event) => sum + event.delta, 0);
}

export function isOutlier(candidateCents: number, recentCents: number[]): boolean {
  if (recentCents.length < 3) {
    return false;
  }
  const mean = recentCents.reduce((sum, value) => sum + value, 0) / recentCents.length;
  if (mean <= 0) {
    return false;
  }
  const ratio = candidateCents / mean;
  return ratio >= 2.5 || ratio <= 0.4;
}
