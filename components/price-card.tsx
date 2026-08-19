import Link from "next/link";
import type { ReactNode } from "react";
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
  return (
    <Badge variant={state === "verified" ? "default" : "secondary"} className="capitalize">
      {label}
    </Badge>
  );
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
  action,
}: {
  href?: string;
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
  action?: ReactNode;
}) {
  const freshness = stale ? "stale" : freshnessFor(observedOn, freshnessHours);
  const initial = (subtitle || title).slice(0, 1).toUpperCase();

  const body = (
    <>
      <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-white/8 font-[family-name:var(--font-display)] text-lg">
        {initial}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{title}</p>
        <p className="truncate text-sm text-muted-foreground">
          {subtitle}
          <span className="mx-1.5 text-white/20">·</span>
          {freshnessLabel(freshness)}
        </p>
      </div>
      <div className="text-right">
        <p className="font-[family-name:var(--font-numeric)] text-lg tracking-tight">
          {formatMoney(priceCents, currency)}
        </p>
        <div className="mt-0.5 flex justify-end gap-1.5">
          <StatusBadge state={state} />
        </div>
      </div>
      {action}
      <span className="sr-only">
        {observedOn}, {evidenceCount} evidence
        {unitPriceCents && unitBasis
          ? `, ${formatMoney(unitPriceCents, currency)}${formatUnitBasis(unitBasis)}`
          : ""}
      </span>
    </>
  );

  const className =
    "flex items-center gap-3 rounded-2xl bg-card px-3.5 py-3 ring-1 ring-white/8";

  if (!href) {
    return <div className={className}>{body}</div>;
  }

  return (
    <Link href={href} className={`${className} transition hover:bg-white/4`}>
      {body}
    </Link>
  );
}
