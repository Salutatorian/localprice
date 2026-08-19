import { notFound } from "next/navigation";
import { PriceCard } from "@/components/price-card";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/price-card";
import { ReportPriceButton } from "@/components/report-price";
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
      <section className="grain rounded-[2rem] bg-till px-5 py-7 ring-1 ring-white/8 sm:px-8">
        <p className="text-sm text-muted-foreground">
          {[product.brand, product.package_size_text].filter(Boolean).join(" · ") || "Product"}
        </p>
        <h1 className="mt-2 text-4xl">{product.name}</h1>
        {cheapest ? (
          <div className="mt-6">
            <p className="text-sm text-muted-foreground">Lowest listed</p>
            <p className="font-[family-name:var(--font-numeric)] text-5xl tracking-tight text-primary">
              {formatMoney(cheapest.price_cents, cheapest.currency_code)}
            </p>
          </div>
        ) : null}
        <p className="mt-4 max-w-xl text-sm text-muted-foreground">
          Sparse history is shown as history, not as a forecast. A single receipt stays provisional
          until another independent receipt or a moderator confirms it.
        </p>
      </section>

      {prices.length === 0 ? (
        <EmptyState title="No prices in this market yet" body="Scan a receipt that includes this product." />
      ) : (
        <div className="grid gap-2">
          {prices.map((price) => (
            <PriceCard
              key={price.id}
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
              action={<ReportPriceButton observationId={price.id} />}
            />
          ))}
        </div>
      )}

      <section>
        <h2 className="mb-3 text-2xl">History</h2>
        <ul className="space-y-2">
          {history.map((row) => (
            <li
              key={row.id}
              className="flex items-center justify-between rounded-2xl bg-card px-4 py-3 text-sm ring-1 ring-white/8"
            >
              <span className="font-[family-name:var(--font-numeric)]">
                {row.observed_on} · {formatMoney(row.price_cents, row.currency_code)}
              </span>
              <span className="flex items-center gap-2">
                <StatusBadge state={row.state} />
                <ReportPriceButton observationId={row.id} />
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
