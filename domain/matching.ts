import { normalizeMerchant } from "@/domain/normalization";

export type StoreCandidate = {
  storeId: string;
  branchId: string | null;
  marketId: string | null;
  name: string;
  alias: string;
};

export type StoreMatch =
  | { kind: "registry"; candidate: StoreCandidate; confidence: number }
  | { kind: "ambiguous"; candidates: StoreCandidate[] }
  | { kind: "unknown"; merchant: string };

export function matchStore(
  merchantName: string,
  aliases: StoreCandidate[],
  marketId?: string | null,
): StoreMatch {
  const needle = normalizeMerchant(merchantName);
  if (!needle) {
    return { kind: "unknown", merchant: merchantName };
  }

  const scored = aliases
    .map((candidate) => {
      const hay = normalizeMerchant(candidate.alias || candidate.name);
      const sameMarket = !marketId || !candidate.marketId || candidate.marketId === marketId;
      const exact = hay === needle;
      const contains = hay.includes(needle) || needle.includes(hay);
      const confidence = exact ? 0.98 : contains ? 0.82 : 0;
      return { candidate, confidence, sameMarket };
    })
    .filter((row) => row.confidence > 0)
    .sort((a, b) => {
      if (a.sameMarket !== b.sameMarket) {
        return a.sameMarket ? -1 : 1;
      }
      return b.confidence - a.confidence;
    });

  const top = scored[0];
  if (!top) {
    return { kind: "unknown", merchant: merchantName };
  }

  const close = scored.filter((row) => row.confidence >= 0.82);
  const uniqueStores = new Set(close.map((row) => row.candidate.storeId));
  if (uniqueStores.size > 1) {
    return { kind: "ambiguous", candidates: close.map((row) => row.candidate) };
  }

  return { kind: "registry", candidate: top.candidate, confidence: top.confidence };
}

const MARKET_LOCALITY: Record<string, string[]> = {
  saipan: [
    "saipan",
    "cnmi",
    "northern mariana",
    "96950",
    "susupe",
    "garapan",
    "chalan kanoa",
    "kagman",
    "koblerville",
    "coblerville",
    "dan dan",
    "tanapag",
  ],
};

export function marketLocalityTokens(marketName: string): string[] {
  const key = marketName.trim().toLowerCase();
  return MARKET_LOCALITY[key] ?? [key];
}

export function addressMentionsMarket(address: string | null, marketName: string): boolean {
  if (!address) {
    return false;
  }
  const hay = address.toLowerCase();
  return marketLocalityTokens(marketName).some((token) => hay.includes(token));
}

export function selectDiscoveredStore<T extends { name: string; address: string | null }>(
  merchantName: string,
  marketName: string,
  places: T[],
): T | null {
  const local = places.filter((place) => addressMentionsMarket(place.address, marketName));
  if (local.length === 0) {
    return null;
  }
  const candidates: StoreCandidate[] = local.map((place, index) => ({
    storeId: String(index),
    branchId: String(index),
    marketId: null,
    name: place.name,
    alias: place.name,
  }));
  const match = matchStore(merchantName, candidates);
  if (match.kind !== "registry") {
    return null;
  }
  return local[Number(match.candidate.storeId)] ?? null;
}
