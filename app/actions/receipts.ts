"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getServerEnv } from "@/lib/env";
import { flags } from "@/lib/flags";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { assertReceiptFile, prepareReceiptImage, perceptualHash, sha256 } from "@/server/image";
import { assignReceiptStore, processExtractionJob } from "@/server/jobs";
import { ensureProductForItem } from "@/server/products";
import { enforceRateLimit } from "@/server/rate-limit";
import { isOutlier } from "@/domain/trust";
import { firstSubmissionHoldsPrices } from "@/domain/access";
import { comparableUnitPrice } from "@/lib/units";
import { requireSignedIn } from "@/server/access";

export async function uploadReceiptAction(formData: FormData) {
  const enabled = flags();
  if (!enabled.receiptUpload) {
    throw new Error("Receipt upload is not enabled in this environment.");
  }

  const user = await requireSignedIn("/scan");

  await enforceRateLimit({ action: "upload", userId: user.id });

  const file = formData.get("receipt");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Choose a receipt photo first.");
  }
  assertReceiptFile(file);

  const rawMarketId = formData.get("marketId");
  const browsingMarketId =
    typeof rawMarketId === "string" && rawMarketId.length > 0 ? z.guid().parse(rawMarketId) : null;
  const env = getServerEnv();
  const original = Buffer.from(await file.arrayBuffer());
  const compressed = await prepareReceiptImage(original, file.name, file.type);
  const digest = sha256(compressed);
  const pHash = await perceptualHash(compressed);
  const admin = createAdminSupabase();

  const { data: duplicate } = await admin
    .from("receipts")
    .select("id")
    .eq("sha256", digest)
    .is("deleted_at", null)
    .maybeSingle();

  const receiptId = crypto.randomUUID();
  const storagePath = `${user.id}/${receiptId}/${crypto.randomUUID()}.jpg`;
  const retainUntil = new Date();
  retainUntil.setUTCDate(retainUntil.getUTCDate() + env.RECEIPT_RETENTION_DAYS);

  const { error: uploadError } = await admin.storage.from("receipts").upload(storagePath, compressed, {
    contentType: "image/jpeg",
    upsert: false,
  });
  if (uploadError) {
    throw new Error("Could not store the receipt image privately.");
  }

  const { error: insertError } = await admin.from("receipts").insert({
    id: receiptId,
    submitter_id: user.id,
    browsing_market_id: browsingMarketId,
    storage_path: storagePath,
    sha256: digest,
    perceptual_hash: pHash,
    duplicate_of: duplicate?.id ?? null,
    status: duplicate ? "duplicate" : "uploaded",
    retain_until: retainUntil.toISOString(),
  });
  if (insertError) {
    throw new Error(insertError.message);
  }

  if (duplicate) {
    throw new Error("This receipt was already submitted. Duplicate photos are not published again.");
  }

  const { data: job, error: jobError } = await admin
    .from("extraction_jobs")
    .insert({
      receipt_id: receiptId,
      status: "queued",
    })
    .select("id")
    .single();
  if (jobError || !job) {
    throw new Error("Could not queue extraction.");
  }

  after(async () => {
    await processExtractionJob(job.id);
  });

  redirect(`/receipts/${receiptId}/review`);
}

const reviewSchema = z.object({
  receiptId: z.string().uuid(),
  merchantName: z.string().min(2),
  items: z.array(
    z.object({
      id: z.string().uuid(),
      normalizedName: z.string().min(1),
      brand: z.string().optional(),
      quantity: z.coerce.number().positive().optional(),
      packageSize: z.coerce.number().positive().optional(),
      unit: z.enum(["oz", "lb", "g", "kg", "ml", "l", "fl_oz", "count", "unknown"]),
      lineTotalCents: z.coerce.number().int(),
    }),
  ),
});

export async function confirmReceiptAction(input: z.infer<typeof reviewSchema>) {
  const parsed = reviewSchema.parse(input);
  const user = await requireSignedIn("/scan");

  const admin = createAdminSupabase();
  let { data: receipt } = await admin
    .from("receipts")
    .select("id, submitter_id, market_id, branch_id, currency_code, purchased_at, status")
    .eq("id", parsed.receiptId)
    .single();

  if (!receipt || receipt.submitter_id !== user.id) {
    throw new Error("Receipt not found.");
  }
  if (!receipt.market_id || !receipt.branch_id) {
    await assignReceiptStore(parsed.receiptId);
    const { data: rematched } = await admin
      .from("receipts")
      .select("id, submitter_id, market_id, branch_id, currency_code, purchased_at, status")
      .eq("id", parsed.receiptId)
      .single();
    if (rematched) {
      receipt = rematched;
    }
  }
  if (!receipt.market_id || !receipt.branch_id) {
    throw new Error("This receipt still needs a verified store before prices can be published.");
  }

  for (const item of parsed.items) {
    await admin
      .from("receipt_items")
      .update({
        normalized_name: item.normalizedName,
        brand: item.brand || null,
        quantity: item.quantity ?? 1,
        package_size: item.packageSize ?? null,
        unit: item.unit,
        line_total_cents: item.lineTotalCents,
        needs_review: false,
      })
      .eq("id", item.id)
      .eq("receipt_id", parsed.receiptId);
  }

  const { data: items } = await admin
    .from("receipt_items")
    .select("*")
    .eq("receipt_id", parsed.receiptId);

  const { count: confirmedCount } = await admin
    .from("receipts")
    .select("id", { count: "exact", head: true })
    .eq("submitter_id", user.id)
    .eq("status", "confirmed");
  const firstTime = firstSubmissionHoldsPrices(confirmedCount ?? 0);

  let published = 0;
  for (const item of items ?? []) {
    if (item.line_total_cents === null) {
      continue;
    }
    let productId = item.product_id as string | null;
    if (!productId) {
      productId = await ensureProductForItem(admin, {
        normalizedName: String(item.normalized_name ?? item.raw_description),
        brand: (item.brand as string | null) ?? null,
        packageSize: item.package_size === null ? null : Number(item.package_size),
        unit: String(item.unit ?? "unknown"),
        rawDescription: String(item.raw_description),
      });
      await admin.from("receipt_items").update({ product_id: productId }).eq("id", item.id);
    }

    const { data: recent } = await admin
      .from("price_observations")
      .select("price_cents")
      .eq("product_id", productId)
      .eq("branch_id", receipt.branch_id)
      .in("state", ["provisional", "verified"])
      .order("observed_on", { ascending: false })
      .limit(8);

    const held = isOutlier(
      item.line_total_cents,
      (recent ?? []).map((row) => row.price_cents as number),
    );
    const unitPrice =
      item.package_size && item.unit
        ? comparableUnitPrice({
            lineTotalCents: item.line_total_cents,
            packageSize: Number(item.package_size),
            unit: item.unit,
            quantity: Number(item.quantity ?? 1),
          })
        : null;

    const { error } = await admin.from("price_observations").insert({
      market_id: receipt.market_id,
      branch_id: receipt.branch_id,
      product_id: productId,
      receipt_id: receipt.id,
      receipt_item_id: item.id,
      price_cents: item.line_total_cents,
      currency_code: receipt.currency_code ?? "USD",
      quantity: item.quantity ?? 1,
      package_size: item.package_size,
      unit: item.unit ?? "unknown",
      unit_price_cents: unitPrice?.cents ?? item.unit_price_cents,
      unit_price_basis: unitPrice?.basis ?? null,
      is_sale: (item.discount_cents ?? 0) > 0,
      observed_on: (receipt.purchased_at ?? new Date().toISOString()).slice(0, 10),
      confidence: 0.8,
      state: held || firstTime ? "pending" : "provisional",
      evidence_count: 1,
      outlier_held: held,
      created_by: user.id,
    });
    if (!error && !held && !firstTime) {
      published += 1;
    }
  }

  await admin
    .from("receipts")
    .update({
      status: firstTime ? "pending_moderation" : "confirmed",
      first_submission: firstTime,
    })
    .eq("id", parsed.receiptId);
  await admin
    .from("extraction_jobs")
    .update({ status: "completed", finished_at: new Date().toISOString() })
    .eq("receipt_id", parsed.receiptId);
  if (!firstTime) {
    await admin.from("contributor_trust_events").insert({
      user_id: user.id,
      market_id: receipt.market_id,
      delta: 2,
      reason: "accepted_receipt",
    });
  }
  await admin.from("audit_logs").insert({
    actor_id: user.id,
    action: firstTime ? "queue_first_receipt" : "confirm_receipt",
    entity_type: "receipt",
    entity_id: parsed.receiptId,
    metadata: { published, firstTime },
  });

  redirect(firstTime ? "/contributions?queued=1" : `/contributions?published=${published}`);
}
