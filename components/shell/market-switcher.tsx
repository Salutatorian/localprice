"use client";

import { usePathname, useRouter } from "next/navigation";

type Market = { slug: string; name: string };

export function MarketSwitcher({ markets }: { markets: Market[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const current = pathname.split("/")[2];

  if (markets.length === 0) {
    return null;
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="sr-only">Market</span>
      <select
        className="h-8 max-w-40 rounded-full border border-border bg-card px-3 text-sm"
        value={markets.some((market) => market.slug === current) ? current : markets[0]?.slug}
        onChange={(event) => {
          router.push(`/m/${event.target.value}`);
        }}
      >
        {markets.map((market) => (
          <option key={market.slug} value={market.slug}>
            {market.name}
          </option>
        ))}
      </select>
    </label>
  );
}
