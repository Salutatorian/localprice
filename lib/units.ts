export const UNITS = [
  "oz",
  "lb",
  "g",
  "kg",
  "ml",
  "l",
  "fl_oz",
  "count",
  "unknown",
] as const;

export type NormalizedUnit = (typeof UNITS)[number];
export type MeasureKind = "weight" | "volume" | "count" | "unknown";

const WEIGHT_TO_OZ: Partial<Record<NormalizedUnit, number>> = {
  oz: 1,
  lb: 16,
  g: 0.0352739619,
  kg: 35.2739619,
};

const VOLUME_TO_ML: Partial<Record<NormalizedUnit, number>> = {
  ml: 1,
  l: 1000,
  fl_oz: 29.5735,
};

export function measureKindFor(unit: NormalizedUnit): MeasureKind {
  if (unit in WEIGHT_TO_OZ) {
    return "weight";
  }
  if (unit in VOLUME_TO_ML) {
    return "volume";
  }
  if (unit === "count") {
    return "count";
  }
  return "unknown";
}

export function unitsAreCompatible(a: NormalizedUnit, b: NormalizedUnit): boolean {
  const kindA = measureKindFor(a);
  const kindB = measureKindFor(b);
  return kindA !== "unknown" && kindA === kindB;
}

export type UnitPrice = {
  cents: number;
  basis: "per_oz" | "per_lb" | "per_g" | "per_ml" | "per_l" | "per_fl_oz" | "per_item";
};

export function comparableUnitPrice(args: {
  lineTotalCents: number;
  packageSize: number;
  unit: NormalizedUnit;
  quantity?: number;
}): UnitPrice | null {
  const quantity = args.quantity ?? 1;
  if (args.lineTotalCents <= 0 || args.packageSize <= 0 || quantity <= 0) {
    return null;
  }

  const kind = measureKindFor(args.unit);
  const totalSize = args.packageSize * quantity;

  if (kind === "count") {
    return { cents: Math.round(args.lineTotalCents / totalSize), basis: "per_item" };
  }

  if (kind === "weight") {
    const factor = WEIGHT_TO_OZ[args.unit];
    if (!factor) {
      return null;
    }
    const ounces = totalSize * factor;
    return { cents: Math.round(args.lineTotalCents / ounces), basis: "per_oz" };
  }

  if (kind === "volume") {
    const factor = VOLUME_TO_ML[args.unit];
    if (!factor) {
      return null;
    }
    const milliliters = totalSize * factor;
    return { cents: Math.round(args.lineTotalCents / milliliters), basis: "per_ml" };
  }

  return null;
}

export function formatUnitBasis(basis: string | null): string {
  switch (basis) {
    case "per_oz":
      return "/ oz";
    case "per_lb":
      return "/ lb";
    case "per_g":
      return "/ g";
    case "per_ml":
      return "/ ml";
    case "per_l":
      return "/ L";
    case "per_fl_oz":
      return "/ fl oz";
    case "per_item":
      return "/ item";
    default:
      return "";
  }
}
