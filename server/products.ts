import { slugify } from "@/domain/normalization";
import { measureKindFor, UNITS, type NormalizedUnit } from "@/lib/units";
import { createAdminSupabase } from "@/lib/supabase/admin";

function asUnit(value: string): NormalizedUnit {
  return UNITS.includes(value as NormalizedUnit) ? (value as NormalizedUnit) : "unknown";
}

export async function ensureProductForItem(
  admin: ReturnType<typeof createAdminSupabase>,
  item: {
    normalizedName: string;
    brand: string | null;
    packageSize: number | null;
    unit: string;
    rawDescription: string;
  },
): Promise<string> {
  const unit = asUnit(item.unit);
  const slug =
    slugify(
      [item.normalizedName, item.packageSize, unit !== "unknown" ? unit : ""]
        .filter((part) => part !== "" && part !== null)
        .join(" "),
    ) ||
    slugify(item.normalizedName) ||
    "item";

  const { data: existing } = await admin.from("products").select("id").eq("slug", slug).maybeSingle();
  if (existing) {
    return existing.id;
  }

  const { data: created, error } = await admin
    .from("products")
    .insert({
      slug,
      name: item.normalizedName,
      brand: item.brand,
      package_size: item.packageSize,
      package_size_text: item.packageSize ? `${item.packageSize} ${unit}` : item.rawDescription,
      unit,
      measure_kind: measureKindFor(unit),
      status: "approved",
    })
    .select("id")
    .single();
  if (created) {
    if (item.rawDescription) {
      await admin.from("product_aliases").insert({
        product_id: created.id,
        alias: item.rawDescription,
        source: "receipt",
      });
    }
    return created.id;
  }

  const { data: raced } = await admin.from("products").select("id").eq("slug", slug).maybeSingle();
  if (raced) {
    return raced.id;
  }
  throw new Error(error?.message ?? "Could not save the product.");
}
