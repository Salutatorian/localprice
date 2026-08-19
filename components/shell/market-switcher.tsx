"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Market = { slug: string; name: string };

export function MarketSwitcher({ markets }: { markets: Market[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const current = pathname.split("/")[2];
  const value = markets.some((market) => market.slug === current)
    ? current
    : markets[0]?.slug;

  if (markets.length === 0 || !value) {
    return null;
  }

  return (
    <Select value={value} onValueChange={(slug) => router.push(`/m/${slug}`)}>
      <SelectTrigger
        aria-label="Market"
        className="h-9 gap-1 rounded-full border-white/12 bg-white/6 py-0 pr-2.5 pl-3.5 text-sm shadow-none dark:bg-white/6 dark:hover:bg-white/10 [&_svg]:size-3.5 [&_svg]:text-foreground/75"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent
        position="popper"
        align="end"
        className="rounded-2xl border-0 bg-paper p-1 text-paper-foreground shadow-[0_18px_40px_-18px_oklch(0_0_0_/_0.55)] ring-1 ring-black/8"
      >
        {markets.map((market) => (
          <SelectItem
            key={market.slug}
            value={market.slug}
            className="rounded-xl py-2 pr-8 pl-3 text-paper-foreground focus:bg-till focus:text-foreground data-[state=checked]:bg-till data-[state=checked]:text-foreground"
          >
            {market.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
