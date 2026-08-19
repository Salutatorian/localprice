import Link from "next/link";
import { getCurrentUser, getPublicMarkets } from "@/lib/data/catalog";
import { BottomNav } from "@/components/shell/bottom-nav";
import { SiteHeader } from "@/components/shell/site-header";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const [user, markets] = await Promise.all([
    getCurrentUser().catch(() => null),
    getPublicMarkets().catch(() => []),
  ]);

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader userEmail={user?.email ?? null} markets={markets} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-6 sm:px-6">{children}</main>
      <BottomNav signedIn={Boolean(user)} />
      <footer className="mx-auto hidden w-full max-w-5xl gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex sm:px-6">
        <Link href="/methodology">Methodology</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/install">Install</Link>
        <Link href="/apply">Start a market</Link>
      </footer>
    </div>
  );
}
