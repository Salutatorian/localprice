import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { EmptyState } from "@/components/empty-state";

export default async function ContributionsPage({
  searchParams,
}: {
  searchParams: Promise<{ published?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/contributions");
  }

  const { data: receipts } = await supabase
    .from("receipts")
    .select("id, merchant_raw, status, created_at, total_cents, currency_code")
    .eq("submitter_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  return (
    <div className="space-y-5">
      <h1 className="text-3xl">Your contributions</h1>
      {params.published ? (
        <p className="rounded-2xl bg-secondary px-4 py-3">
          {params.published} anonymous prices were contributed from that receipt.
        </p>
      ) : null}
      {(receipts ?? []).length === 0 ? (
        <EmptyState title="No receipts yet" body="Scan one the next time you shop." actionHref="/scan" actionLabel="Scan receipt" />
      ) : (
        <ul className="grid gap-3">
          {(receipts ?? []).map((receipt) => (
            <li key={receipt.id} className="rounded-2xl border border-border bg-card p-4">
              <p className="font-medium">{receipt.merchant_raw ?? "Receipt"}</p>
              <p className="text-sm text-muted-foreground">
                {receipt.status} · {new Date(receipt.created_at).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
