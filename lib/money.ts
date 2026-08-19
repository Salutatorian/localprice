const currencySymbols: Record<string, string> = {
  USD: "$",
  AUD: "A$",
  NZD: "NZ$",
  PHP: "₱",
  JPY: "¥",
  EUR: "€",
};

export function formatMoney(cents: number, currencyCode: string): string {
  const symbol = currencySymbols[currencyCode] ?? `${currencyCode} `;
  const negative = cents < 0;
  const absolute = Math.abs(cents);
  const major = Math.floor(absolute / 100);
  const minor = absolute % 100;
  const formatted = `${symbol}${major.toLocaleString("en-US")}.${minor.toString().padStart(2, "0")}`;
  return negative ? `-${formatted}` : formatted;
}

export function dollarsToCents(value: number): number {
  return Math.round(value * 100);
}

export function centsToDollars(cents: number): number {
  return cents / 100;
}
