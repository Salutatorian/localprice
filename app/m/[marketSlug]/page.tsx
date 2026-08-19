import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { PriceCard } from "@/components/price-card";
import { getMarketBySlug, getMarketHomepage } from "@/lib/data/catalog";

export default async function MarketHomePage({
  params,
}: {
  params: Promise<{ marketSlug: string }>;
}) {
  const { marketSlug } = await params;
  const market = await getMarketBySlug(marketSlug).catch(() => null);
  if (!market) {
    notFound();
  }

  const data = await getMarketHomepage(market.id).catch(() => ({
    branches: [],
    products: [],
    prices: [],
    errors: [{ message: "offline" }],
  }));

  const productName = new Map(data.products.map((product) => [product.id, product]));
  const branchName = new Map(data.branches.map((branch) => [branch.id, branch]));

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-border bg-card px-5 py-8 sm:px-8">
        <p className="text-sm font-medium text-primary">Starting in Saipan, built for more towns</p>
        <h1 className="mt-2 max-w-xl text-4xl sm:text-5xl">{market.name} grocery prices</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          LocalPrice is a public ledger of what food actually costs. Browse without an account.
          Contributing is a photo, a short review of yellow fields, and confirm.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/scan">Scan a receipt</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/m/${market.slug}/search`}>Search products</Link>
          </Button>
        </div>
      </section>

      {data.errors.length > 0 && data.prices.length === 0 ? (
        <EmptyState
          title="Catalog is not connected yet"
          body="Start local Supabase and sign in to scan a receipt."
        />
      ) : null}

      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl">Recently updated</h2>
          <Link className="text-sm text-primary" href={`/m/${market.slug}/baskets`}>
            Compare a basket
          </Link>
        </div>
        {data.prices.length === 0 ? (
          <EmptyState
            title="No public prices yet"
            body="Scan a receipt. Confirmed prices show up here."
            actionHref="/scan"
            actionLabel="Scan a receipt"
          />
        ) : (
          <div className="grid gap-3">
            {data.prices.slice(0, 12).map((price) => {
              const product = productName.get(price.product_id);
              const branch = branchName.get(price.branch_id);
              return (
                <PriceCard
                  key={price.id}
                  href={`/m/${market.slug}/products/${product?.slug ?? ""}`}
                  title={product?.name ?? "Product"}
                  subtitle={branch?.name ?? "Store"}
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
      </section>

      <section>
        <h2 className="mb-3 text-2xl">Stores</h2>
        {data.branches.length === 0 ? (
          <EmptyState title="No stores with prices yet" body="A confirmed receipt adds its store here." />
        ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {data.branches.map((branch) => {
            const store = Array.isArray(branch.stores) ? branch.stores[0] : branch.stores;
            return (
              <Link
                key={branch.id}
                href={`/m/${market.slug}/stores/${store?.slug ?? "store"}/${branch.slug}`}
                className="rounded-2xl border border-border bg-card p-4"
              >
                <p className="font-medium">{branch.name}</p>
                <p className="text-sm text-muted-foreground">{branch.address}</p>
              </Link>
            );
          })}
        </div>
        )}
      </section>
    </div>
  );
}
