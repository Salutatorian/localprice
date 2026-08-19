export function normalizeMerchant(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\b(INC|LLC|LTD|CORP|SUPERMARKET|MARKET|STORE)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeProductName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9.%x]+/g, " ")
    .replace(/\b(the|a|an)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72);
}
