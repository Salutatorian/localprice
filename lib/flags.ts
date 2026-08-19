import { getServerEnv } from "@/lib/env";

export function flags() {
  const env = getServerEnv();
  const geminiReady = Boolean(env.GEMINI_API_KEY) && process.env.FEATURE_GEMINI_EXTRACTION === "true";
  const placesReady = Boolean(env.GOOGLE_PLACES_API_KEY) && process.env.FEATURE_GOOGLE_PLACES === "true";

  return {
    receiptUpload: process.env.FEATURE_RECEIPT_UPLOAD !== "false",
    geminiExtraction: geminiReady,
    googlePlaces: placesReady,
    basketComparison: process.env.FEATURE_BASKET_COMPARISON !== "false",
    moderation: process.env.FEATURE_MODERATION !== "false",
    usingMockExtractor: process.env.FEATURE_RECEIPT_UPLOAD !== "false" && !geminiReady,
  };
}
