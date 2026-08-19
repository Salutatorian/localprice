import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { signOutAction } from "@/app/actions/access";
import { createServerSupabase } from "@/lib/supabase/server";
import { isStaffUser } from "@/server/access";

export default async function ContributionsPage({
  searchParams,
}: {
  searchParams: Promise<{ published?: string; queued?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/contributions");
  }

  const staff = await isStaffUser(user.id, user.email);
  const { data: receipts } = await supabase
    .from("receipts")
    .select("id, merchant_raw, status, created_at, total_cents, currency_code")
    .eq("submitter_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-4xl">Your contributions</h1>
        <form action={signOutAction}>
          <Button type="submit" variant="outline" size="sm">
            Sign out
          </Button>
        </form>
      </div>
      {staff ? (
        <p className="flex flex-wrap gap-3 text-sm">
          <Link className="text-primary" href="/moderator">
            Moderator queue
          </Link>
          <Link className="text-primary" href="/admin">
            Admin
          </Link>
        </p>
      ) : null}
      {params.queued ? (
        <p className="rounded-2xl bg-primary/15 px-4 py-3 text-primary">
          First receipt is in the moderator queue. Prices stay unpublished until someone on-island
          confirms it looks real.
        </p>
      ) : null}
      {params.published ? (
        <p className="rounded-2xl bg-primary/15 px-4 py-3 text-primary">
          {params.published} anonymous prices were contributed from that receipt.
        </p>
      ) : null}
      {(receipts ?? []).length === 0 ? (
        <EmptyState title="No receipts yet" body="Scan one the next time you shop." actionHref="/scan" actionLabel="Scan receipt" />
      ) : (
        <ul className="grid gap-3">
          {(receipts ?? []).map((receipt) => (
            <li key={receipt.id} className="rounded-[1.5rem] bg-card p-4 ring-1 ring-white/8">
              <p className="font-medium">{receipt.merchant_raw ?? "Receipt"}</p>
              <p className="text-sm text-muted-foreground">
                {receipt.status === "pending_moderation"
                  ? "Waiting on moderator"
                  : receipt.status}{" "}
                · {new Date(receipt.created_at).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
