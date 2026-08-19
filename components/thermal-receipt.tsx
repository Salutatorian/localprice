import type { ReactNode } from "react";
import { BrandMark } from "@/components/brand-mark";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export type ThermalLine = {
  description: string;
  totalCents: number | null;
  uncertain?: boolean;
};

export function ThermalReceipt({
  storeName,
  dateLabel,
  items,
  currency = "USD",
  printing = false,
  status,
}: {
  storeName: string;
  dateLabel?: string;
  items: ThermalLine[];
  currency?: string;
  printing?: boolean;
  status?: string;
}) {
  const total = items.reduce((sum, item) => sum + (item.totalCents ?? 0), 0);
  const lines = printing && items.length === 0 ? skeletonLines : items;

  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-sm text-paper-foreground shadow-[0_18px_50px_-24px_oklch(0_0_0_/_0.7)]",
        printing ? "receipt-print-loop" : "receipt-print",
      )}
    >
      <div className="bg-paper px-6 pt-7">
        <div className="text-center">
          <BrandMark className="mx-auto size-6" />
          <p className="mt-3 font-[family-name:var(--font-display)] text-sm tracking-tight">
            [ocalprice
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl leading-tight tracking-tight">
            {storeName || (printing ? "Reading…" : "Receipt")}
          </h2>
          {dateLabel ? (
            <p className="mt-1 font-[family-name:var(--font-numeric)] text-[11px] text-paper-foreground/60">
              {dateLabel}
            </p>
          ) : null}
        </div>

        <div className="mt-4 border-t border-dashed border-paper-foreground/25" />

        <ul className="space-y-2 py-3 font-[family-name:var(--font-numeric)] text-[13px]">
          {lines.map((item, index) => (
            <li
              key={`${item.description}-${index}`}
              className={cn(
                "flex items-start justify-between gap-3",
                item.uncertain && "rounded-sm bg-[var(--uncertain)] px-1.5 py-1",
              )}
            >
              <span className={cn("text-left leading-snug", printing && "bg-paper-foreground/10 text-transparent")}>
                {item.description}
              </span>
              <span className={cn("shrink-0 tabular-nums", printing && "bg-paper-foreground/10 text-transparent")}>
                {item.totalCents == null ? "—" : formatMoney(item.totalCents, currency)}
              </span>
            </li>
          ))}
        </ul>

        <div className="border-t border-dashed border-paper-foreground/25" />

        <div className="flex items-end justify-between py-3">
          <span className="font-[family-name:var(--font-numeric)] text-[11px] tracking-[0.2em] uppercase text-paper-foreground/55">
            Total
          </span>
          <span className="font-[family-name:var(--font-numeric)] text-2xl tracking-tight">
            {printing ? "—" : formatMoney(total, currency)}
          </span>
        </div>

        {status ? (
          <p className="pb-2 text-center font-[family-name:var(--font-numeric)] text-[11px] tracking-wide text-paper-foreground/55">
            {status}
          </p>
        ) : null}
      </div>

      <svg
        viewBox="0 0 360 14"
        preserveAspectRatio="none"
        className="block h-3.5 w-full text-paper"
        aria-hidden="true"
      >
        <path
          fill="currentColor"
          d="M0 0h360v2L350 14 340 2 330 14 320 2 310 14 300 2 290 14 280 2 270 14 260 2 250 14 240 2 230 14 220 2 210 14 200 2 190 14 180 2 170 14 160 2 150 14 140 2 130 14 120 2 110 14 100 2 90 14 80 2 70 14 60 2 50 14 40 2 30 14 20 2 10 14 0 2V0Z"
        />
      </svg>
    </div>
  );
}

const skeletonLines: ThermalLine[] = [
  { description: "████ ████████", totalCents: 0 },
  { description: "██████ ██", totalCents: 0 },
  { description: "█████████", totalCents: 0 },
  { description: "████ ███ ████", totalCents: 0 },
];

export function PrinterHousing({
  eyebrow,
  title,
  amount,
  status,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  amount?: string;
  status?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-md", className)}>
      <div className="grain relative rounded-t-[2rem] bg-till px-5 pb-4 pt-5 text-foreground ring-1 ring-white/8">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex size-9 items-center justify-center rounded-lg bg-white/8">
            <BrandMark className="size-4" />
          </span>
          {eyebrow ? (
            <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-muted-foreground">
              {eyebrow}
            </span>
          ) : null}
        </div>
        <div className="mt-6 flex items-end justify-between gap-4">
          <div>
            {status ? (
              <p className="text-sm font-medium text-primary">{status}</p>
            ) : null}
            <h2 className="mt-1 text-3xl leading-none">{title}</h2>
          </div>
          {amount ? (
            <p className="font-[family-name:var(--font-numeric)] text-2xl tracking-tight">
              {amount}
            </p>
          ) : null}
        </div>
        <div className="receipt-slot mt-8 h-3" />
      </div>
      <div className="relative z-10 -mt-1 px-4">{children}</div>
    </div>
  );
}
