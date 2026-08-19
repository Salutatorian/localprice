import { notFound, redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { ReviewForm, ReviewWaiter } from "@/components/review-form";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ receiptId: string }>;
}) {
  const { receiptId } = await params;
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=/receipts/${receiptId}/review`);
  }

  const { data: receipt } = await supabase
    .from("receipts")
    .select("id, merchant_raw, status, submitter_id, branch_id, store_branches(name)")
    .eq("id", receiptId)
    .maybeSingle();
  if (!receipt) {
    notFound();
  }

  const { data: job } = await supabase
    .from("extraction_jobs")
    .select("status, error")
    .eq("receipt_id", receiptId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: items } = await supabase
    .from("receipt_items")
    .select(
      "id, raw_description, normalized_name, brand, quantity, package_size, unit, line_total_cents, field_confidence, needs_review",
    )
    .eq("receipt_id", receiptId)
    .order("line_index");

  const { count: confirmedCount } = await supabase
    .from("receipts")
    .select("id", { count: "exact", head: true })
    .eq("submitter_id", user.id)
    .eq("status", "confirmed");

  const status = job?.status ?? receipt.status;
  const branch = Array.isArray(receipt.store_branches)
    ? receipt.store_branches[0]
    : receipt.store_branches;
  const storeVerifiedIn = branch?.name ?? null;

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <header className="text-center">
        <p className="text-sm text-primary">Ledger copy</p>
        <h1 className="mt-1 text-4xl">Check the ticket</h1>
        <p className="mt-2 text-muted-foreground">
          This is the rebuilt receipt, not your photo. Fix yellow fields, then confirm.
        </p>
      </header>
      <ReviewWaiter initialStatus={status} />
      {status === "needs_review" && items ? (
        <ReviewForm
          receiptId={receiptId}
          merchantName={receipt.merchant_raw ?? ""}
          items={items as never}
          storeLookupPending={!receipt.branch_id}
          storeVerifiedIn={storeVerifiedIn}
          firstSubmission={(confirmedCount ?? 0) === 0}
        />
      ) : null}
      {job?.error ? <p className="text-sm text-destructive">{job.error}</p> : null}
    </div>
  );
}
