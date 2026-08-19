import { notFound } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { PriceCard } from "@/components/price-card";
import { getBranchBySlug, getBranchPrices, getMarketBySlug } from "@/lib/data/catalog";
import { createServerSupabase } from "@/lib/supabase/server";

export default async function StoreBranchPage({
  params,
}: {
  params: Promise<{ marketSlug: string; storeSlug: string; branchSlug: string }>;
}) {
  const { marketSlug, storeSlug, branchSlug } = await params;
  const market = await getMarketBySlug(marketSlug).catch(() => null);
  if (!market) {
    notFound();
  }
  const found = await getBranchBySlug(storeSlug, branchSlug, market.id).catch(() => null);
  if (!found) {
    notFound();
  }

  const prices = await getBranchPrices(found.branch.id).catch(() => []);
  const supabase = await createServerSupabase();
  const { data: products } = await supabase
    .from("products")
    .select("id, slug, name, brand, package_size_text")
    .eq("status", "approved");
  const productMap = new Map((products ?? []).map((product) => [product.id, product]));

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-muted-foreground">{found.store.name}</p>
        <h1 className="text-4xl">{found.branch.name}</h1>
        <p className="mt-2 text-muted-foreground">{found.branch.address}</p>
        <p className="mt-1 text-xs uppercase tracking-wide text-primary">{found.branch.verification_status}</p>
      </header>
      {prices.length === 0 ? (
        <EmptyState title="No prices for this branch" body="A receipt from this store will fill this page." />
      ) : (
        <div className="grid gap-3">
          {prices.map((price) => {
            const product = productMap.get(price.product_id);
            return (
              <PriceCard
                key={price.id}
                href={`/m/${market.slug}/products/${product?.slug ?? ""}`}
                title={product?.name ?? "Product"}
                subtitle={product?.package_size_text ?? ""}
                priceCents={price.price_cents}
                currency={price.currency_code}
                unitBasis={price.unit_price_basis}
                unitPriceCents={price.unit_price_cents}
                observedOn={price.observed_on}
                freshnessHours={market.freshness_hours}
                state={price.state}
                evidenceCount={price.evidence_count}
                stale={price.stale_labeled}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

