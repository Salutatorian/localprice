import { flags } from "@/lib/flags";
import { getPublicEnv } from "@/lib/env";
import { getMarketBySlug } from "@/lib/data/catalog";
import { ScanForm } from "@/components/scan-form";

export default async function ScanPage() {
  const enabled = flags();
  const market = await getMarketBySlug(getPublicEnv().defaultMarket).catch(() => null);

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <h1 className="text-4xl">Scan a receipt</h1>
      <p className="text-muted-foreground">
        One photo. LocalPrice reads the store and prices, then asks you only about uncertain yellow
        fields. Choosing a city to browse never assigns the receipt there.
      </p>
      {enabled.receiptUpload ? (
        <ScanForm marketId={market?.id ?? ""} usingMock={enabled.usingMockExtractor} />
      ) : (
        <p className="rounded-2xl border border-border bg-card p-4">
          Receipt upload is disabled by feature flag in this environment.
        </p>
      )}
    </div>
  );
}
