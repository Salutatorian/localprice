import { flags } from "@/lib/flags";
import { getPublicEnv } from "@/lib/env";
import { getMarketBySlug } from "@/lib/data/catalog";
import { ScanForm } from "@/components/scan-form";
import { requireSignedIn } from "@/server/access";

export default async function ScanPage() {
  await requireSignedIn("/scan");
  const enabled = flags();
  const market = await getMarketBySlug(getPublicEnv().defaultMarket).catch(() => null);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <header className="text-center">
        <p className="text-sm text-primary">Private photo, public prices</p>
        <h1 className="mt-1 text-4xl">Feed the till</h1>
        <p className="mt-2 text-muted-foreground">
          Take a photo of a grocery receipt. Random photos, selfies, and junk get rejected and
          deleted. Other people never see the picture. Your first ticket waits for a moderator.
        </p>
      </header>
      {enabled.receiptUpload ? (
        <ScanForm marketId={market?.id ?? ""} usingMock={enabled.usingMockExtractor} />
      ) : (
        <p className="rounded-2xl bg-card p-4 ring-1 ring-white/8">
          Receipt upload is disabled by feature flag in this environment.
        </p>
      )}
    </div>
  );
}
