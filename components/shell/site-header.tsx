import Link from "next/link";
import { MarketSwitcher } from "@/components/shell/market-switcher";

type Market = { slug: string; name: string };

export function SiteHeader({
  userEmail,
  markets,
}: {
  userEmail: string | null;
  markets: Market[];
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="font-[family-name:var(--font-display)] text-xl tracking-tight text-primary">
            LocalPrice
          </span>
          <span className="hidden text-xs text-muted-foreground sm:inline">community grocery ledger</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/install" className="text-sm text-muted-foreground">
            Install
          </Link>
          <MarketSwitcher markets={markets} />
          <Link
            href={userEmail ? "/contributions" : "/login"}
            className="rounded-full border border-border bg-card px-3 py-1.5 text-sm"
          >
            {userEmail ? "Account" : "Sign in"}
          </Link>
        </div>
      </div>
    </header>
  );
}
