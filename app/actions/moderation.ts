"use server";

import { revalidatePath } from "next/cache";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { requireStaff } from "@/server/access";

export async function approveFirstReceiptAction(formData: FormData) {
  const staff = await requireStaff();
  const receiptId = String(formData.get("receiptId") ?? "");
  const admin = createAdminSupabase();
  const { data: receipt } = await admin
    .from("receipts")
    .select("id, submitter_id, market_id, status")
    .eq("id", receiptId)
    .maybeSingle();
  if (!receipt || receipt.status !== "pending_moderation") {
    throw new Error("That receipt is not waiting in the first-submitter queue.");
  }

  await admin
    .from("price_observations")
    .update({ state: "provisional", outlier_held: false })
    .eq("receipt_id", receiptId)
    .eq("state", "pending");
  await admin.from("receipts").update({ status: "confirmed" }).eq("id", receiptId);
  if (receipt.market_id) {
    await admin.from("contributor_trust_events").insert({
      user_id: receipt.submitter_id,
      market_id: receipt.market_id,
      delta: 1,
      reason: "moderator_confirm",
    });
  }
  await admin.from("audit_logs").insert({
    actor_id: staff.id,
    action: "approve_first_receipt",
    entity_type: "receipt",
    entity_id: receiptId,
  });
  revalidatePath("/moderator");
}

export async function rejectFirstReceiptAction(formData: FormData) {
  const staff = await requireStaff();
  const receiptId = String(formData.get("receiptId") ?? "");
  const admin = createAdminSupabase();
  const { data: receipt } = await admin
    .from("receipts")
    .select("id, submitter_id, market_id, storage_path, status")
    .eq("id", receiptId)
    .maybeSingle();
  if (!receipt || receipt.status !== "pending_moderation") {
    throw new Error("That receipt is not waiting in the first-submitter queue.");
  }

  await admin.from("price_observations").update({ state: "rejected" }).eq("receipt_id", receiptId);
  await admin
    .from("receipts")
    .update({ status: "rejected", deleted_at: new Date().toISOString() })
    .eq("id", receiptId);
  if (receipt.storage_path) {
    await admin.storage.from("receipts").remove([receipt.storage_path]);
  }
  if (receipt.market_id) {
    await admin.from("contributor_trust_events").insert({
      user_id: receipt.submitter_id,
      market_id: receipt.market_id,
      delta: -4,
      reason: "rejected_receipt",
    });
  }
  await admin.from("audit_logs").insert({
    actor_id: staff.id,
    action: "reject_first_receipt",
    entity_type: "receipt",
    entity_id: receiptId,
  });
  revalidatePath("/moderator");
}

export async function resolveFlagAction(formData: FormData) {
  const staff = await requireStaff();
  const flagId = String(formData.get("flagId") ?? "");
  const outcome = String(formData.get("outcome") ?? "");
  const admin = createAdminSupabase();
  const { data: flag } = await admin
    .from("flags")
    .select("id, observation_id, status")
    .eq("id", flagId)
    .maybeSingle();
  if (!flag || flag.status !== "open") {
    throw new Error("Flag not found.");
  }

  if (outcome === "remove" && flag.observation_id) {
    await admin.from("price_observations").update({ state: "rejected" }).eq("id", flag.observation_id);
    await admin.from("flags").update({ status: "resolved" }).eq("id", flagId);
  } else if (outcome === "keep" && flag.observation_id) {
    await admin.from("price_observations").update({ state: "provisional" }).eq("id", flag.observation_id);
    await admin.from("flags").update({ status: "dismissed" }).eq("id", flagId);
  } else {
    throw new Error("Choose keep or remove.");
  }

  await admin.from("audit_logs").insert({
    actor_id: staff.id,
    action: outcome === "remove" ? "resolve_flag_remove" : "resolve_flag_keep",
    entity_type: "flag",
    entity_id: flagId,
  });
  revalidatePath("/moderator");
}
