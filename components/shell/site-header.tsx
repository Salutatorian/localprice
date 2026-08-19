import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { AccountAvatar } from "@/components/shell/account-avatar";
import { MarketSwitcher } from "@/components/shell/market-switcher";

type Market = { slug: string; name: string };

export function SiteHeader({
  userEmail,
  avatarUrl,
  displayName,
  markets,
}: {
  userEmail: string | null;
  avatarUrl: string | null;
  displayName: string;
  markets: Market[];
}) {
  return (
    <header className="sticky top-0 z-40 bg-background/75 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="inline-flex h-8 items-center gap-2">
          <BrandMark className="size-4 shrink-0" />
          <span className="font-[family-name:var(--font-display)] text-xl leading-none tracking-tight">
            [ocalprice
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <MarketSwitcher markets={markets} />
          {userEmail ? (
            <AccountAvatar href="/contributions" src={avatarUrl} name={displayName} />
          ) : (
            <Link
              href="/login"
              className="inline-flex h-9 items-center rounded-full bg-white/8 px-3.5 text-sm"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
