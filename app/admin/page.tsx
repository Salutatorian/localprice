import { EmptyState } from "@/components/empty-state";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { requireStaff } from "@/server/access";

export default async function AdminPage() {
  await requireStaff("/admin");
  const admin = createAdminSupabase();

  const [{ count: receipts }, { data: audits }] = await Promise.all([
    admin.from("receipts").select("id", { count: "exact", head: true }),
    admin.from("audit_logs").select("id, action, created_at").order("created_at", { ascending: false }).limit(20),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl">Administration</h1>
      <p className="text-sm text-muted-foreground">
        Anyone with Google can scan. Junk photos are rejected. First receipts and reports land in
        the moderator queue.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-[1.5rem] bg-card p-5 ring-1 ring-white/8">
          <p className="text-sm text-muted-foreground">Receipts</p>
          <p className="font-[family-name:var(--font-numeric)] text-3xl">{receipts ?? 0}</p>
        </div>
      </div>
      <section>
        <h2 className="mb-2 text-2xl">Audit log</h2>
        {(audits ?? []).length === 0 ? (
          <EmptyState title="No audits yet" body="Publishing first receipts and resolving reports shows up here." />
        ) : (
          <ul className="grid gap-2">
            {(audits ?? []).map((row) => (
              <li key={row.id} className="rounded-2xl bg-card px-4 py-3 text-sm ring-1 ring-white/8">
                {row.action} · {row.created_at}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
