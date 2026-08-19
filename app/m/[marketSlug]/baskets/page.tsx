import { getMarketBySlug } from "@/lib/data/catalog";
import { createServerSupabase } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/money";
import { EmptyState } from "@/components/empty-state";
import { notFound } from "next/navigation";

export default async function BasketComparePage({
  params,
}: {
  params: Promise<{ marketSlug: string }>;
}) {
  const { marketSlug } = await params;
  const market = await getMarketBySlug(marketSlug).catch(() => null);
  if (!market) {
    notFound();
  }

  const supabase = await createServerSupabase();
  const { data: prices } = await supabase
    .from("current_prices")
    .select("product_id, branch_id, price_cents, currency_code, stale_labeled, state")
    .eq("market_id", market.id);
  const productIds = [...new Set((prices ?? []).map((row) => row.product_id))];
  const branchIds = [...new Set((prices ?? []).map((row) => row.branch_id))];
  const { data: branches } =
    branchIds.length === 0
      ? { data: [] }
      : await supabase.from("store_branches").select("id, name").in("id", branchIds);
  const { data: products } =
    productIds.length === 0
      ? { data: [] }
      : await supabase.from("products").select("id, name").in("id", productIds);

  const byBranch = new Map<string, { total: number; missing: number; stale: number }>();
  for (const branch of branches ?? []) {
    byBranch.set(branch.id, { total: 0, missing: productIds.length, stale: 0 });
  }
  for (const price of prices ?? []) {
    const entry = byBranch.get(price.branch_id);
    if (!entry) {
      continue;
    }
    entry.total += price.price_cents;
    entry.missing -= 1;
    if (price.stale_labeled) {
      entry.stale += 1;
    }
  }

  if (!prices || prices.length === 0) {
    return (
      <EmptyState
        title="Basket comparison needs prices"
        body="This fills in as confirmed receipts arrive."
      />
    );
  }

  return (
    <div className="space-y-5">
      <h1 className="text-3xl">Prices in {market.name}</h1>
      <p className="text-muted-foreground">
        Totals use products that already have a public price. Missing items are marked, not invented.
      </p>
      <ul className="grid gap-3">
        {(branches ?? []).map((branch) => {
          const entry = byBranch.get(branch.id);
          if (!entry) {
            return null;
          }
          return (
            <li key={branch.id} className="rounded-2xl border border-border bg-card p-4">
              <p className="font-medium">{branch.name}</p>
              <p className="font-[family-name:var(--font-numeric)] text-2xl text-[var(--papaya)]">
                {entry.missing === productIds.length ? "—" : formatMoney(entry.total, market.currency_code)}
              </p>
              <p className="text-sm text-muted-foreground">
                {entry.missing > 0 ? `${entry.missing} unavailable` : "Complete basket"}
                {entry.stale > 0 ? ` · ${entry.stale} stale` : ""}
              </p>
            </li>
          );
        })}
      </ul>
      <ul className="text-sm text-muted-foreground">
        {(products ?? []).map((product) => (
          <li key={product.id}>{product.name}</li>
        ))}
      </ul>
    </div>
  );
}
