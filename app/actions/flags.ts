"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isReportReason } from "@/domain/access";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { enforceRateLimit } from "@/server/rate-limit";

export async function reportPriceAction(formData: FormData) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/corrections");
  }

  await enforceRateLimit({ action: "flag", userId: user.id });

  const observationId = String(formData.get("observationId") ?? "");
  const reason = String(formData.get("reason") ?? "");
  const details = String(formData.get("details") ?? "").trim().slice(0, 500);
  if (!observationId || !isReportReason(reason)) {
    throw new Error("Pick a reason for the report.");
  }

  const admin = createAdminSupabase();
  const { data: observation } = await admin
    .from("price_observations")
    .select("id, receipt_id, state")
    .eq("id", observationId)
    .maybeSingle();
  if (!observation) {
    throw new Error("That price is no longer on the ledger.");
  }

  const { error } = await admin.from("flags").insert({
    reporter_id: user.id,
    observation_id: observationId,
    receipt_id: observation.receipt_id,
    reason,
    details: details || null,
    status: "open",
  });
  if (error) {
    throw new Error(error.message);
  }

  if (observation.state === "provisional" || observation.state === "verified") {
    await admin.from("price_observations").update({ state: "disputed" }).eq("id", observationId);
  }

  await admin.from("audit_logs").insert({
    actor_id: user.id,
    action: "flag_price",
    entity_type: "price_observation",
    entity_id: observationId,
    metadata: { reason },
  });

  revalidatePath("/moderator");
  revalidatePath("/corrections");
}
