import { notFound } from "next/navigation";
import { PriceCard } from "@/components/price-card";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/price-card";
import {
  getMarketBySlug,
  getPriceHistory,
  getProductBySlug,
  getProductPrices,
} from "@/lib/data/catalog";
import { formatMoney } from "@/lib/money";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ marketSlug: string; productSlug: string }>;
}) {
  const { marketSlug, productSlug } = await params;
  const market = await getMarketBySlug(marketSlug).catch(() => null);
  const product = await getProductBySlug(productSlug).catch(() => null);
  if (!market || !product) {
    notFound();
  }

  const [prices, history] = await Promise.all([
    getProductPrices(product.id, market.id).catch(() => []),
    getPriceHistory(product.id, market.id).catch(() => []),
  ]);

  const cheapest = prices[0];

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-muted-foreground">
          {[product.brand, product.package_size_text].filter(Boolean).join(" · ")}
        </p>
        <h1 className="text-4xl">{product.name}</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Sparse history is shown as history, not as a forecast. A single receipt stays provisional
          until another independent receipt or a moderator confirms it.
        </p>
      </header>

      {prices.length === 0 ? (
        <EmptyState title="No prices in this market yet" body="Scan a receipt that includes this product." />
      ) : (
        <div className="grid gap-3">
          {prices.map((price) => (
            <PriceCard
              key={price.id}
              href={`/m/${market.slug}/products/${product.slug}`}
              title={product.name}
              subtitle={`${price.evidence_count} independent evidence`}
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
          ))}
        </div>
      )}

      {cheapest ? (
        <p className="text-sm text-muted-foreground">
          Lowest listed price is {formatMoney(cheapest.price_cents, cheapest.currency_code)}.
        </p>
      ) : null}

      <section>
        <h2 className="mb-3 text-2xl">History</h2>
        <ul className="space-y-2">
          {history.map((row) => (
            <li key={row.id} className="flex items-center justify-between rounded-xl bg-card px-3 py-2 text-sm">
              <span>
                {row.observed_on} · {formatMoney(row.price_cents, row.currency_code)}
              </span>
              <StatusBadge state={row.state} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
