import Link from "next/link";
import { notFound } from "next/navigation";
import { getMarketBySlug, searchProducts } from "@/lib/data/catalog";
import { EmptyState } from "@/components/empty-state";
import { Input } from "@/components/ui/input";

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ marketSlug: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { marketSlug } = await params;
  const { q } = await searchParams;
  const market = await getMarketBySlug(marketSlug).catch(() => null);
  if (!market) {
    notFound();
  }
  const results = q ? await searchProducts(q).catch(() => []) : [];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl">Search {market.name}</h1>
      <form>
        <label className="sr-only" htmlFor="q">
          Product
        </label>
        <Input id="q" name="q" defaultValue={q} placeholder="Rice, milk, SPAM, diapers…" />
      </form>
      {q && results.length === 0 ? (
        <EmptyState title="No matches" body="Try a brand, a package size, or a shorter name." />
      ) : (
        <ul className="grid gap-2">
          {results.map((product) => (
            <li key={product.id}>
              <Link
                href={`/m/${market.slug}/products/${product.slug}`}
                className="block rounded-xl border border-border bg-card px-4 py-3"
              >
                <span className="font-medium">{product.name}</span>
                <span className="ml-2 text-sm text-muted-foreground">
                  {[product.brand, product.package_size_text].filter(Boolean).join(" · ")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
