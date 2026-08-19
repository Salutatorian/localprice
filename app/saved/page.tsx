import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { EmptyState } from "@/components/empty-state";

export default async function SavedBasketsPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/saved");
  }

  const { data: baskets } = await supabase
    .from("saved_baskets")
    .select("id, name, created_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-5">
      <h1 className="text-3xl">Saved baskets</h1>
      {(baskets ?? []).length === 0 ? (
        <EmptyState
          title="No saved baskets"
          body="Compare the staple basket first, then save your own household list after you sign in."
          actionHref="/m/saipan/baskets"
          actionLabel="See staple basket"
        />
      ) : (
        <ul className="grid gap-3">
          {(baskets ?? []).map((basket) => (
            <li key={basket.id} className="rounded-2xl border border-border bg-card p-4">
              {basket.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
