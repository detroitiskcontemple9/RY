export function formatUSD(cents: number, opts: { cents?: boolean } = {}): string {
  const showCents = opts.cents ?? cents % 100 !== 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  }).format(cents / 100);
}

/**
 * Extra amount so that after card fees the temple receives the full gift.
 * total = (gift + fixed) / (1 - pct)
 */
export function feeToCover(giftCents: number, feePercent: number, feeFixedCents: number): number {
  const total = Math.ceil((giftCents + feeFixedCents) / (1 - feePercent / 100));
  return Math.max(0, total - giftCents);
}

/** Parses "101", "$1,001.50" into cents. Returns NaN for invalid input. */
export function parseDollarsToCents(input: string): number {
  const cleaned = input.replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return NaN;
  return Math.round(parseFloat(cleaned) * 100);
}
