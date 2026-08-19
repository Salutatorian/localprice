import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { EmptyState } from "@/components/empty-state";
import { ReportPriceButton } from "@/components/report-price";

export default async function CorrectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ observationId?: string }>;
}) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/corrections");
  }

  const params = await searchParams;
  const observationId = params.observationId;

  return (
    <div className="space-y-5">
      <h1 className="text-3xl">Flag a price</h1>
      <p className="text-muted-foreground">
        Use this when a public price looks wrong, abusive, or from the wrong store. Flags go to the
        moderator queue. Reporting takes the price off the board until someone reviews it.
      </p>
      {observationId ? (
        <div className="rounded-[1.75rem] bg-card px-5 py-6 ring-1 ring-white/8">
          <p className="text-sm text-muted-foreground">Report this listing</p>
          <p className="mt-1 font-[family-name:var(--font-numeric)] text-sm">{observationId}</p>
          <div className="mt-4">
            <ReportPriceButton observationId={observationId} />
          </div>
        </div>
      ) : (
        <EmptyState
          title="Open a product page to flag"
          body="Each public price has a Report button. That keeps the store and product attached."
          actionHref="/m/saipan"
          actionLabel="Browse Saipan"
        />
      )}
    </div>
  );
}
