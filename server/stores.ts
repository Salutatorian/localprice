import { slugify } from "@/domain/normalization";
import { createAdminSupabase } from "@/lib/supabase/admin";
import type { PlaceMatch } from "@/server/places";

export async function upsertStoreFromPlace(
  admin: ReturnType<typeof createAdminSupabase>,
  marketId: string,
  merchantName: string,
  place: PlaceMatch,
): Promise<{ storeId: string; branchId: string; marketId: string }> {
  if (place.placeId) {
    const { data: byPlace } = await admin
      .from("store_branches")
      .select("id, store_id, market_id")
      .eq("google_place_id", place.placeId)
      .maybeSingle();
    if (byPlace) {
      await ensureAlias(admin, byPlace.store_id, byPlace.id, merchantName);
      return { storeId: byPlace.store_id, branchId: byPlace.id, marketId: byPlace.market_id };
    }
  }

  const { data: existingAlias } = await admin
    .from("store_aliases")
    .select("store_id, branch_id")
    .eq("alias", merchantName.trim())
    .maybeSingle();
  if (existingAlias?.branch_id) {
    const { data: branch } = await admin
      .from("store_branches")
      .select("id, store_id, market_id")
      .eq("id", existingAlias.branch_id)
      .maybeSingle();
    if (branch) {
      return { storeId: branch.store_id, branchId: branch.id, marketId: branch.market_id };
    }
  }

  const storeSlug = slugify(place.name) || slugify(merchantName) || "store";
  const storeId = await ensureStore(admin, storeSlug, place.name);
  const branchSlug = slugify(place.name) || "main";

  const { data: existingBranch } = await admin
    .from("store_branches")
    .select("id, store_id, market_id")
    .eq("store_id", storeId)
    .eq("market_id", marketId)
    .eq("slug", branchSlug)
    .maybeSingle();
  if (existingBranch) {
    await ensureAlias(admin, storeId, existingBranch.id, merchantName);
    return {
      storeId,
      branchId: existingBranch.id,
      marketId: existingBranch.market_id,
    };
  }

  const { data: branch, error: branchError } = await admin
    .from("store_branches")
    .insert({
      store_id: storeId,
      market_id: marketId,
      slug: branchSlug,
      name: place.name,
      address: place.address,
      google_place_id: place.placeId,
      google_business_status: place.businessStatus,
      phone: place.phone,
      verification_status: "places_matched",
      is_public: true,
    })
    .select("id")
    .single();
  if (branchError || !branch) {
    throw new Error(branchError?.message ?? "Could not save the matched store.");
  }

  await ensureAlias(admin, storeId, branch.id, merchantName);
  return { storeId, branchId: branch.id, marketId };
}

async function ensureStore(
  admin: ReturnType<typeof createAdminSupabase>,
  slug: string,
  name: string,
): Promise<string> {
  const { data: existing } = await admin.from("stores").select("id").eq("slug", slug).maybeSingle();
  if (existing) {
    return existing.id;
  }
  const { data: created, error } = await admin
    .from("stores")
    .insert({ slug, name, status: "approved" })
    .select("id")
    .single();
  if (error || !created) {
    const { data: raced } = await admin.from("stores").select("id").eq("slug", slug).maybeSingle();
    if (raced) {
      return raced.id;
    }
    throw new Error(error?.message ?? "Could not save the store.");
  }
  return created.id;
}

async function ensureAlias(
  admin: ReturnType<typeof createAdminSupabase>,
  storeId: string,
  branchId: string,
  merchantName: string,
) {
  const alias = merchantName.trim();
  if (!alias) {
    return;
  }
  const { data: existing } = await admin.from("store_aliases").select("id").eq("alias", alias).maybeSingle();
  if (existing) {
    return;
  }
  await admin.from("store_aliases").insert({
    store_id: storeId,
    branch_id: branchId,
    alias,
  });
}
