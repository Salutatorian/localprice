import { createServerSupabase } from "@/lib/supabase/server";
import { withTimeout } from "@/lib/with-timeout";

export const SAIPAN_MARKET_ID = "33333333-3333-3333-3333-333333333333";

function demoMarket(slug: string) {
  return {
    id: SAIPAN_MARKET_ID,
    slug,
    name: slug === "saipan" ? "Saipan" : slug,
    currency_code: "USD",
    timezone: "Pacific/Guam",
    status: "public" as const,
    freshness_hours: 168,
  };
}

export async function getCurrentUser() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await withTimeout(supabase.auth.getUser());
  return user;
}

export async function getPublicMarkets() {
  try {
    const supabase = await createServerSupabase();
    const { data, error } = await withTimeout(
      supabase
        .from("markets")
        .select("id, slug, name, currency_code, timezone, status, freshness_hours")
        .eq("status", "public")
        .order("name"),
    );
    if (error) {
      throw error;
    }
    return data && data.length > 0 ? data : [demoMarket("saipan")];
  } catch {
    return [demoMarket("saipan")];
  }
}

export async function getMarketBySlug(slug: string) {
  try {
    const supabase = await createServerSupabase();
    const { data, error } = await withTimeout(
      supabase
        .from("markets")
        .select("id, slug, name, currency_code, timezone, status, freshness_hours")
        .eq("slug", slug)
        .maybeSingle(),
    );
    if (error) {
      throw error;
    }
    return data ?? demoMarket(slug);
  } catch {
    return demoMarket(slug);
  }
}

export async function getMarketHomepage(marketId: string) {
  try {
    const supabase = await createServerSupabase();
  const { data: prices, error: pricesError } = await withTimeout(
    supabase
    .from("current_prices")
    .select(
      "id, product_id, branch_id, price_cents, currency_code, unit_price_cents, unit_price_basis, observed_on, state, evidence_count, stale_labeled",
    )
    .eq("market_id", marketId)
    .order("observed_on", { ascending: false })
    .limit(80),
  );

  const priceRows = prices ?? [];
  const productIds = [...new Set(priceRows.map((row) => row.product_id))];
  const branchIds = [...new Set(priceRows.map((row) => row.branch_id))];

  const [branches, products] = await Promise.all([
    branchIds.length === 0
      ? Promise.resolve({ data: [], error: null })
      : supabase
          .from("store_branches")
          .select("id, slug, name, address, verification_status, stores(name, slug)")
          .in("id", branchIds)
          .order("name"),
    productIds.length === 0
      ? Promise.resolve({ data: [], error: null })
      : supabase
          .from("products")
          .select("id, slug, name, brand, package_size_text, unit")
          .in("id", productIds),
  ]);

  return {
    branches: branches.data ?? [],
    products: products.data ?? [],
    prices: priceRows,
    errors: [branches.error, products.error, pricesError].filter(Boolean),
  };
  } catch {
    return {
      branches: [],
      products: [],
      prices: [],
      errors: [{ message: "offline" }],
    };
  }
}

export async function searchProducts(query: string) {
  const supabase = await createServerSupabase();
  const safe = query.replace(/[%(),]/g, "").trim().slice(0, 80);
  if (!safe) {
    return [];
  }
  const { data, error } = await supabase
    .from("products")
    .select("id, slug, name, brand, package_size_text, unit")
    .eq("status", "approved")
    .or(`name.ilike.%${safe}%,brand.ilike.%${safe}%`)
    .limit(30);
  if (error) {
    throw error;
  }
  return data ?? [];
}

export async function getProductBySlug(slug: string) {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("products")
    .select("id, slug, name, brand, package_size, package_size_text, unit, measure_kind")
    .eq("slug", slug)
    .maybeSingle();
  if (error) {
    throw error;
  }
  return data;
}

export async function getProductPrices(productId: string, marketId: string) {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("current_prices")
    .select(
      "id, branch_id, price_cents, currency_code, unit_price_cents, unit_price_basis, observed_on, state, evidence_count, stale_labeled",
    )
    .eq("product_id", productId)
    .eq("market_id", marketId)
    .order("price_cents");
  if (error) {
    throw error;
  }
  return data ?? [];
}

export async function getPriceHistory(productId: string, marketId: string) {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("price_board")
    .select("id, branch_id, price_cents, currency_code, observed_on, state, evidence_count")
    .eq("product_id", productId)
    .eq("market_id", marketId)
    .order("observed_on", { ascending: false })
    .limit(40);
  if (error) {
    throw error;
  }
  return data ?? [];
}

export async function getBranchBySlug(storeSlug: string, branchSlug: string, marketId: string) {
  const supabase = await createServerSupabase();
  const { data: store } = await supabase
    .from("stores")
    .select("id, slug, name")
    .eq("slug", storeSlug)
    .maybeSingle();
  if (!store) {
    return null;
  }
  const { data: branch, error } = await supabase
    .from("store_branches")
    .select("id, slug, name, address, verification_status")
    .eq("store_id", store.id)
    .eq("slug", branchSlug)
    .eq("market_id", marketId)
    .maybeSingle();
  if (error) {
    throw error;
  }
  return branch ? { store, branch } : null;
}

export async function getBranchPrices(branchId: string) {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("current_prices")
    .select(
      "id, product_id, price_cents, currency_code, unit_price_cents, unit_price_basis, observed_on, state, evidence_count, stale_labeled",
    )
    .eq("branch_id", branchId)
    .order("observed_on", { ascending: false });
  if (error) {
    throw error;
  }
  return data ?? [];
}
