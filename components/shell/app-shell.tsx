import Link from "next/link";
import { getCurrentUser, getPublicMarkets } from "@/lib/data/catalog";
import { BottomNav } from "@/components/shell/bottom-nav";
import { SiteHeader } from "@/components/shell/site-header";

function profileFromUser(user: Awaited<ReturnType<typeof getCurrentUser>>) {
  const meta = user?.user_metadata ?? {};
  const avatarUrl =
    (typeof meta.avatar_url === "string" && meta.avatar_url) ||
    (typeof meta.picture === "string" && meta.picture) ||
    null;
  const displayName =
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    user?.email ||
    "Account";
  return { avatarUrl, displayName };
}

export async function AppShell({ children }: { children: React.ReactNode }) {
  const [user, markets] = await Promise.all([
    getCurrentUser().catch(() => null),
    getPublicMarkets().catch(() => []),
  ]);
  const profile = profileFromUser(user);

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader
        userEmail={user?.email ?? null}
        avatarUrl={profile.avatarUrl}
        displayName={profile.displayName}
        markets={markets}
      />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-32 pt-4 sm:px-6 sm:pt-8">
        {children}
      </main>
      <BottomNav signedIn={Boolean(user)} />
      <footer className="mx-auto hidden w-full max-w-5xl gap-5 px-4 pb-28 pt-4 text-sm text-muted-foreground sm:flex sm:px-6">
        <Link href="/methodology" className="hover:text-foreground">
          Methodology
        </Link>
        <Link href="/privacy" className="hover:text-foreground">
          Privacy
        </Link>
        <Link href="/install" className="hover:text-foreground">
          Install
        </Link>
        <Link href="/apply" className="hover:text-foreground">
          Start a market
        </Link>
      </footer>
    </div>
  );
}
