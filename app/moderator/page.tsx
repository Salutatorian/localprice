import { EmptyState } from "@/components/empty-state";
import { FirstReceiptButtons, FlagButtons } from "@/components/moderation-actions";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { requireStaff } from "@/server/access";
import { REPORT_REASON_LABELS, type ReportReason } from "@/domain/access";

export default async function ModeratorPage() {
  await requireStaff("/moderator");
  const admin = createAdminSupabase();

  const [{ data: firstReceipts }, { data: flags }] = await Promise.all([
    admin
      .from("receipts")
      .select("id, merchant_raw, created_at, total_cents, currency_code, submitter_id")
      .eq("status", "pending_moderation")
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .limit(50),
    admin
      .from("flags")
      .select("id, reason, details, created_at, observation_id")
      .eq("status", "open")
      .order("created_at", { ascending: true })
      .limit(50),
  ]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl">Moderator queue</h1>
        <p className="mt-2 text-muted-foreground">
          First receipts stay off the board until you publish them. Reports come off the board until
          you keep or remove them.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-2xl">First receipts</h2>
        {(firstReceipts ?? []).length === 0 ? (
          <EmptyState title="No first receipts waiting" body="A new contributor’s first ticket stays here until you publish it." />
        ) : (
          <ul className="grid gap-3">
            {(firstReceipts ?? []).map((receipt) => (
              <li key={receipt.id} className="rounded-[1.5rem] bg-card p-4 ring-1 ring-white/8">
                <p className="font-medium">{receipt.merchant_raw ?? "Receipt"}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(receipt.created_at).toLocaleString()}
                  {receipt.total_cents != null ? ` · ${receipt.total_cents} cents` : ""}
                </p>
                <FirstReceiptButtons receiptId={receipt.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl">Reports</h2>
        {(flags ?? []).length === 0 ? (
          <EmptyState title="No open reports" body="Product pages have a Report button. Hits show up here." />
        ) : (
          <ul className="grid gap-3">
            {(flags ?? []).map((flag) => {
              const label =
                flag.reason in REPORT_REASON_LABELS
                  ? REPORT_REASON_LABELS[flag.reason as ReportReason]
                  : flag.reason;
              return (
                <li key={flag.id} className="rounded-[1.5rem] bg-card p-4 ring-1 ring-white/8">
                  <p className="font-medium">{label}</p>
                  <p className="text-sm text-muted-foreground">
                    {flag.details || "No extra details"} · {new Date(flag.created_at).toLocaleString()}
                  </p>
                  <FlagButtons flagId={flag.id} reason={flag.reason} />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
