import Link from "next/link";
import { Camera, Search, ShoppingBasket } from "lucide-react";
import { notFound } from "next/navigation";
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
  const freshCount = data.prices.filter((price) => !price.stale_labeled).length;

  return (
    <div className="space-y-8">
      <section className="grain overflow-hidden rounded-[2rem] bg-till px-5 py-7 ring-1 ring-white/8 sm:px-8 sm:py-9">
        <p className="text-sm text-muted-foreground">Tonight in {market.name}</p>
        <h1 className="mt-2 max-w-xl text-4xl sm:text-5xl">What food actually costs</h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Browse without an account. Contribute a photo, confirm the yellow fields, and the ledger
          keeps the prices — not your receipt.
        </p>

        <div className="mt-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Prices on the ledger</p>
            <p className="font-[family-name:var(--font-numeric)] text-5xl tracking-tight sm:text-6xl">
              {data.prices.length}
            </p>
          </div>
          <div className="flex gap-3">
            <QuickLink href="/scan" label="Scan" icon={Camera} primary />
            <QuickLink href={`/m/${market.slug}/search`} label="Find" icon={Search} />
            <QuickLink href={`/m/${market.slug}/baskets`} label="Basket" icon={ShoppingBasket} />
          </div>
        </div>

        <div className="mt-7 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/6 px-4 py-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Stores</p>
            <p className="mt-1 font-[family-name:var(--font-numeric)] text-2xl">{data.branches.length}</p>
          </div>
          <div className="rounded-2xl bg-white/6 px-4 py-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Fresh</p>
            <p className="mt-1 font-[family-name:var(--font-numeric)] text-2xl text-primary">{freshCount}</p>
          </div>
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
          <div className="grid gap-2">
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
                  className="rounded-2xl bg-card px-4 py-5 ring-1 ring-white/8 transition hover:bg-white/4"
                >
                  <p className="font-medium">{branch.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{store?.name ?? "Store"}</p>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function QuickLink({
  href,
  label,
  icon: Icon,
  primary = false,
}: {
  href: string;
  label: string;
  icon: typeof Camera;
  primary?: boolean;
}) {
  return (
    <Link href={href} className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
      <span
        className={
          primary
            ? "inline-flex size-14 items-center justify-center rounded-full bg-paper text-paper-foreground"
            : "inline-flex size-14 items-center justify-center rounded-full bg-white/8"
        }
      >
        <Icon className="size-5" strokeWidth={1.75} />
      </span>
      {label}
    </Link>
  );
}
