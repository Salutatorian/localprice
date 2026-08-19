import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { EmptyState } from "@/components/empty-state";

export default async function CorrectionsPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/corrections");
  }

  return (
    <div className="space-y-5">
      <h1 className="text-3xl">Flag a price</h1>
      <p className="text-muted-foreground">
        Use this when a public price looks wrong, abusive, or from the wrong store. Flags go to the
        market moderator queue. They are rate limited.
      </p>
      <EmptyState
        title="Open a product page to flag"
        body="Each public price has a status and evidence count. Flagging from the product page keeps the context attached."
        actionHref="/m/saipan"
        actionLabel="Browse Saipan"
      />
    </div>
  );
}
