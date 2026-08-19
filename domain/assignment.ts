export type AssignmentEvidence = {
  browsingMarketId: string | null;
  verifiedBranchMarketId: string | null;
  receiptAddressMarketId: string | null;
  deviceMarketId: string | null;
  marketBoundaryHitId: string | null;
};

export type AssignmentResult =
  | { status: "assigned"; marketId: string; source: string }
  | { status: "needs_moderation"; reason: string; candidates: string[] };

export function assignMarket(evidence: AssignmentEvidence): AssignmentResult {
  const ranked = [
    evidence.verifiedBranchMarketId,
    evidence.marketBoundaryHitId,
    evidence.receiptAddressMarketId,
    evidence.deviceMarketId,
  ].filter((value): value is string => Boolean(value));

  if (ranked[0]) {
    const unique = [...new Set(ranked)];
    if (unique.length > 1 && unique[1] && unique[0] !== unique[1]) {
      return {
        status: "needs_moderation",
        reason: "Receipt evidence points at more than one market.",
        candidates: unique,
      };
    }
    return { status: "assigned", marketId: ranked[0], source: "receipt_evidence" };
  }

  if (evidence.browsingMarketId) {
    return {
      status: "needs_moderation",
      reason: "Browsing location cannot assign a receipt. Store evidence is required.",
      candidates: [evidence.browsingMarketId],
    };
  }

  return {
    status: "needs_moderation",
    reason: "Not enough geographic evidence to assign this receipt.",
    candidates: [],
  };
}

export function browsingCannotAssign(browsingMarketId: string, assignedMarketId: string): boolean {
  return browsingMarketId !== assignedMarketId;
}
