export function navIndex(path: string): number {
  if (path.includes("/search")) {
    return 1;
  }
  if (path.startsWith("/scan") || path.startsWith("/receipts")) {
    return 2;
  }
  if (path.startsWith("/saved") || path.includes("/baskets")) {
    return 3;
  }
  if (path.startsWith("/m/")) {
    return 0;
  }
  return -1;
}
