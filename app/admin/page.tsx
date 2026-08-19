import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { EmptyState } from "@/components/empty-state";

export default async function AdminPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/admin");
  }

  const [{ count: receipts }, { data: requests }, { data: audits }] = await Promise.all([
    supabase.from("receipts").select("id", { count: "exact", head: true }),
    supabase.from("market_requests").select("id, proposed_name, status, created_at").limit(20),
    supabase.from("audit_logs").select("id, action, created_at").order("created_at", { ascending: false }).limit(20),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl">Administration</h1>
      <p className="text-sm text-muted-foreground">
        Queues for stores, products, outliers, disputes, users, market requests, usage, retention,
        and audits. Empty means empty — this page does not fake activity.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Receipts visible to you</p>
          <p className="font-[family-name:var(--font-numeric)] text-3xl">{receipts ?? 0}</p>
        </div>
      </div>
      <section>
        <h2 className="mb-2 text-2xl">Market requests</h2>
        {(requests ?? []).length === 0 ? (
          <EmptyState title="No market requests" body="Organizers submit them from /apply." />
        ) : (
          <ul className="grid gap-2">
            {(requests ?? []).map((request) => (
              <li key={request.id} className="rounded-xl bg-card px-3 py-2">
                {request.proposed_name} · {request.status}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2 className="mb-2 text-2xl">Audit log</h2>
        {(audits ?? []).length === 0 ? (
          <EmptyState title="No audits yet" body="Privileged actions are recorded when moderators act." />
        ) : (
          <ul className="grid gap-2">
            {(audits ?? []).map((row) => (
              <li key={row.id} className="rounded-xl bg-card px-3 py-2 text-sm">
                {row.action} · {row.created_at}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
