import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { EmptyState } from "@/components/empty-state";

export default async function ModeratorPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/moderator");
  }

  const { data: flags } = await supabase
    .from("flags")
    .select("id, reason, status, created_at")
    .eq("status", "open")
    .limit(50);

  return (
    <div className="space-y-5">
      <h1 className="text-3xl">Moderator queue</h1>
      <p className="text-muted-foreground">
        Roles come from protected application tables, not editable profile metadata.
      </p>
      {(flags ?? []).length === 0 ? (
        <EmptyState title="No open flags" body="Disputes, outliers, and unmatched stores will land here." />
      ) : (
        <ul className="grid gap-3">
          {(flags ?? []).map((flag) => (
            <li key={flag.id} className="rounded-2xl border border-border bg-card p-4">
              <p className="font-medium">{flag.reason}</p>
              <p className="text-sm text-muted-foreground">{flag.created_at}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
