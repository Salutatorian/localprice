import { getServerEnv } from "@/lib/env";
import { flags } from "@/lib/flags";
import { comparableUnitPrice } from "@/lib/units";
import { createAdminSupabase } from "@/lib/supabase/admin";
import {
  validateExtractedReceipt,
  type ExtractedReceipt,
} from "@/domain/extraction";
import { matchStore, selectDiscoveredStore, type StoreCandidate } from "@/domain/matching";
import { assignMarket } from "@/domain/assignment";
import { extractReceiptWithGemini, searchStoreWithGemini } from "@/server/gemini";
import { getMockExtraction } from "@/server/mock-extraction";
import { cacheKey, searchPlaces, type PlaceMatch } from "@/server/places";
import { upsertStoreFromPlace } from "@/server/stores";
import { ensureProductForItem } from "@/server/products";
import { normalizeProductName } from "@/domain/normalization";

export async function processExtractionJob(jobId: string) {
  const admin = createAdminSupabase();
  const env = getServerEnv();
  const enabled = flags();

  const { data: job, error: jobError } = await admin
    .from("extraction_jobs")
    .select("id, receipt_id, status, attempt")
    .eq("id", jobId)
    .single();
  if (jobError || !job) {
    throw new Error("Extraction job not found.");
  }

  await admin
    .from("extraction_jobs")
    .update({
      status: "processing",
      started_at: new Date().toISOString(),
      model_primary: env.GEMINI_MODEL,
      model_retry: env.GEMINI_MODEL_RETRY,
    })
    .eq("id", jobId);

  const { data: receipt } = await admin
    .from("receipts")
    .select("id, submitter_id, storage_path, browsing_market_id, sha256")
    .eq("id", job.receipt_id)
    .single();
  if (!receipt) {
    throw new Error("Receipt not found.");
  }

  try {
    const extracted = await runExtractor(admin, receipt.storage_path, enabled.geminiExtraction);
    const { receipt: validated, issues } = validateExtractedReceipt(extracted);
    const retryable = issues.some((issue) => issue.code === "total_mismatch" || issue.code === "empty_items");

    let finalReceipt = validated;
    let finalIssues = issues;
    let attempt = 1;

    if (retryable && enabled.geminiExtraction) {
      const retried = await extractFromStorage(admin, receipt.storage_path, env.GEMINI_MODEL_RETRY);
      const second = validateExtractedReceipt(retried);
      finalReceipt = second.receipt;
      finalIssues = second.issues;
      attempt = 2;
    }

    if (finalIssues.some((issue) => issue.code === "negative_price" || issue.code === "impossible_date")) {
      await admin
        .from("extraction_jobs")
        .update({
          status: "failed",
          attempt,
          validated_output: finalReceipt,
          raw_output: finalReceipt,
          error: finalIssues.map((issue) => issue.message).join(" "),
          finished_at: new Date().toISOString(),
        })
        .eq("id", jobId);
      await admin.from("receipts").update({ status: "failed" }).eq("id", receipt.id);
      return;
    }

    const store = await resolveStore(admin, finalReceipt, receipt.browsing_market_id);
    await persistLineItems(admin, receipt.id, finalReceipt);

    await admin
      .from("receipts")
      .update({
        merchant_raw: finalReceipt.merchantName,
        address_raw: finalReceipt.storeAddress,
        phone_raw: finalReceipt.phone,
        currency_code: finalReceipt.currency,
        purchased_at: finalReceipt.purchasedAt,
        subtotal_cents: finalReceipt.subtotalCents,
        tax_cents: finalReceipt.taxCents,
        total_cents: finalReceipt.totalCents,
        market_id: store.marketId,
        branch_id: store.branchId,
        status: "needs_review",
      })
      .eq("id", receipt.id);

    await admin
      .from("extraction_jobs")
      .update({
        status: "needs_review",
        attempt,
        validated_output: { receipt: finalReceipt, issues: finalIssues, store },
        raw_output: enabled.geminiExtraction ? { model: env.GEMINI_MODEL } : { model: "mock" },
        finished_at: new Date().toISOString(),
      })
      .eq("id", jobId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Extraction failed.";
    await admin
      .from("extraction_jobs")
      .update({
        status: "failed",
        error: message,
        finished_at: new Date().toISOString(),
      })
      .eq("id", jobId);
    await admin.from("receipts").update({ status: "failed" }).eq("id", receipt.id);
  }
}

async function runExtractor(
  admin: ReturnType<typeof createAdminSupabase>,
  storagePath: string,
  useGemini: boolean,
): Promise<ExtractedReceipt> {
  if (!useGemini) {
    return getMockExtraction();
  }
  const env = getServerEnv();
  return extractFromStorage(admin, storagePath, env.GEMINI_MODEL);
}

async function extractFromStorage(
  admin: ReturnType<typeof createAdminSupabase>,
  storagePath: string,
  model: string,
): Promise<ExtractedReceipt> {
  const { data, error } = await admin.storage.from("receipts").download(storagePath);
  if (error || !data) {
    throw new Error("Could not download the private receipt image.");
  }
  const bytes = Buffer.from(await data.arrayBuffer());
  return extractReceiptWithGemini(bytes, "image/jpeg", model);
}

export async function assignReceiptStore(receiptId: string) {
  const admin = createAdminSupabase();
  const { data: receipt } = await admin
    .from("receipts")
    .select("id, merchant_raw, browsing_market_id, branch_id")
    .eq("id", receiptId)
    .single();
  if (!receipt?.merchant_raw || receipt.branch_id) {
    return;
  }
  const store = await resolveStore(
    admin,
    { merchantName: receipt.merchant_raw },
    receipt.browsing_market_id,
  );
  if (store.branchId && store.marketId) {
    await admin
      .from("receipts")
      .update({ market_id: store.marketId, branch_id: store.branchId })
      .eq("id", receipt.id);
  }
}

async function resolveStore(
  admin: ReturnType<typeof createAdminSupabase>,
  receipt: { merchantName: string },
  browsingMarketId: string | null,
) {
  const { data: aliases } = await admin
    .from("store_aliases")
    .select("alias, store_id, branch_id, stores(name), store_branches(market_id, id, name)");

  const candidates: StoreCandidate[] = (aliases ?? []).map((row) => {
    const branch = Array.isArray(row.store_branches) ? row.store_branches[0] : row.store_branches;
    const store = Array.isArray(row.stores) ? row.stores[0] : row.stores;
    return {
      storeId: row.store_id as string,
      branchId: (row.branch_id as string | null) ?? (branch?.id as string | null) ?? null,
      marketId: (branch?.market_id as string | null) ?? null,
      name: (store?.name as string | undefined) ?? receipt.merchantName,
      alias: row.alias as string,
    };
  });

  const match = matchStore(receipt.merchantName, candidates, browsingMarketId);
  let branchId: string | null = null;
  let marketId: string | null = null;
  let placeConfidence = 0;

  if (match.kind === "registry") {
    branchId = match.candidate.branchId;
    marketId = match.candidate.marketId;
    placeConfidence = match.confidence;
  } else if (match.kind === "unknown") {
    const discovered = await discoverStore(admin, receipt.merchantName, browsingMarketId);
    if (discovered) {
      branchId = discovered.branchId;
      marketId = discovered.marketId;
      placeConfidence = 0.9;
    }
  }

  const assignment = assignMarket({
    browsingMarketId,
    verifiedBranchMarketId: marketId,
    receiptAddressMarketId: marketId,
    deviceMarketId: null,
    marketBoundaryHitId: marketId,
  });

  return {
    branchId,
    marketId: assignment.status === "assigned" ? assignment.marketId : null,
    assignment,
    placeConfidence,
    overallConfidence: 0,
  };
}

async function discoverStore(
  admin: ReturnType<typeof createAdminSupabase>,
  merchantName: string,
  browsingMarketId: string | null,
) {
  const { data: markets } = await admin.from("markets").select("id, name, slug").eq("status", "public");
  const market = (markets ?? []).find((row) => row.id === browsingMarketId) ?? markets?.[0];
  if (!market) {
    return null;
  }

  const key = cacheKey(market.id, merchantName);
  const { data: cached } = await admin.from("places_cache").select("results").eq("query_hash", key).maybeSingle();
  let results = (cached?.results as PlaceMatch[] | null) ?? null;
  if (!results) {
    results = [];
    if (flags().googlePlaces) {
      try {
        results = await searchPlaces({ query: merchantName, marketName: market.name });
      } catch {
        results = [];
      }
    }
    if (results.length === 0 && flags().geminiExtraction) {
      try {
        const found = await searchStoreWithGemini({ merchantName, marketName: market.name });
        results = found ? [found] : [];
      } catch {
        results = [];
      }
    }
    await admin.from("places_cache").insert({
      query_hash: key,
      market_id: market.id,
      results,
    });
  }

  const picked = selectDiscoveredStore(merchantName, market.name, results);
  if (!picked) {
    return null;
  }
  return upsertStoreFromPlace(admin, market.id, merchantName, picked);
}

async function persistLineItems(
  admin: ReturnType<typeof createAdminSupabase>,
  receiptId: string,
  receipt: ExtractedReceipt,
) {
  await admin.from("receipt_items").delete().eq("receipt_id", receiptId);

  const { data: products } = await admin
    .from("products")
    .select("id, name, brand, package_size, unit, product_barcodes(barcode), product_aliases(alias)")
    .eq("status", "approved");

  const rows = [];
  for (const [index, item] of receipt.items.entries()) {
    const barcodeHit = (products ?? []).find((product) =>
      (product.product_barcodes ?? []).some((code: { barcode: string }) => code.barcode === item.barcode),
    );
    const nameHit = (products ?? []).find((product) => {
      const names = [
        product.name,
        ...((product.product_aliases ?? []) as Array<{ alias: string }>).map((alias) => alias.alias),
      ].map((value) => normalizeProductName(value));
      return names.includes(normalizeProductName(item.normalizedName))
        && (!item.brand || !product.brand || product.brand.toLowerCase() === item.brand.toLowerCase())
        && (!item.packageSize || !product.package_size || Number(product.package_size) === item.packageSize)
        && (item.unit === "unknown" || product.unit === item.unit);
    });

    const productId =
      barcodeHit?.id ??
      nameHit?.id ??
      (await ensureProductForItem(admin, {
        normalizedName: item.normalizedName,
        brand: item.brand,
        packageSize: item.packageSize,
        unit: item.unit,
        rawDescription: item.rawDescription,
      }));
    const unitPrice = item.packageSize
      ? comparableUnitPrice({
          lineTotalCents: item.lineTotalCents,
          packageSize: item.packageSize,
          unit: item.unit,
          quantity: item.quantity ?? 1,
        })
      : null;

    const needsReview = Object.values(item.confidence).some((value) => value < 0.72);

    rows.push({
      receipt_id: receiptId,
      product_id: productId,
      line_index: index,
      raw_description: item.rawDescription,
      normalized_name: item.normalizedName,
      brand: item.brand,
      quantity: item.quantity,
      package_size: item.packageSize,
      unit: item.unit,
      line_total_cents: item.lineTotalCents,
      unit_price_cents: unitPrice?.cents ?? item.unitPriceCents,
      discount_cents: item.discountCents,
      barcode: item.barcode,
      field_confidence: item.confidence,
      needs_review: needsReview,
    });
  }

  const { error } = await admin.from("receipt_items").insert(rows);
  if (error) {
    throw error;
  }
}
