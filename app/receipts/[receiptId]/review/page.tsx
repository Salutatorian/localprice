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
    .select("id, merchant_raw, status, submitter_id, branch_id")
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

  const status = job?.status ?? receipt.status;

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <h1 className="text-4xl">Review extraction</h1>
      <p className="text-muted-foreground">
        Correct yellow fields only. Confirming publishes anonymous provisional prices, not your
        photo or identity.
      </p>
      <ReviewWaiter initialStatus={status} />
      {status === "needs_review" && items ? (
        <ReviewForm
          receiptId={receiptId}
          merchantName={receipt.merchant_raw ?? ""}
          items={items as never}
          storeLookupPending={!receipt.branch_id}
        />
      ) : null}
      {job?.error ? <p className="text-sm text-destructive">{job.error}</p> : null}
    </div>
  );
}
