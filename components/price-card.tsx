import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import { formatUnitBasis } from "@/lib/units";
import { freshnessFor, freshnessLabel } from "@/lib/freshness";

export function StatusBadge({ state }: { state: string }) {
  const label =
    state === "verified"
      ? "Verified"
      : state === "provisional"
        ? "Provisional"
        : state === "disputed"
          ? "Disputed"
          : state === "expired"
            ? "Expired"
            : state;
  return <Badge variant={state === "verified" ? "default" : "secondary"}>{label}</Badge>;
}

export function PriceCard({
  href,
  title,
  subtitle,
  priceCents,
  currency,
  unitBasis,
  unitPriceCents,
  observedOn,
  freshnessHours,
  state,
  evidenceCount,
  stale,
}: {
  href: string;
  title: string;
  subtitle: string;
  priceCents: number;
  currency: string;
  unitBasis: string | null;
  unitPriceCents: number | null;
  observedOn: string;
  freshnessHours: number;
  state: string;
  evidenceCount: number;
  stale: boolean;
}) {
  const freshness = stale ? "stale" : freshnessFor(observedOn, freshnessHours);

  return (
    <Link
      href={href}
      className="block rounded-2xl border border-border bg-card p-4 shadow-[0_1px_0_oklch(0.82_0.03_85)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <p className="font-[family-name:var(--font-numeric)] text-xl text-[var(--papaya)]">
          {formatMoney(priceCents, currency)}
        </p>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <StatusBadge state={state} />
        <span>{freshnessLabel(freshness)}</span>
        <span>{observedOn}</span>
        <span>{evidenceCount} evidence</span>
        {unitPriceCents && unitBasis ? (
          <span>
            {formatMoney(unitPriceCents, currency)}
            {formatUnitBasis(unitBasis)}
          </span>
        ) : null}
      </div>
    </Link>
  );
}
