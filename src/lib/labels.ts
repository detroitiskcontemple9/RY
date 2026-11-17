export const METHOD_LABELS: Record<string, string> = {
  card: "Card",
  apple_pay: "Apple Pay",
  google_pay: "Google Pay",
  link: "Link",
  us_bank_account: "Bank (ACH)",
  cash: "Cash",
  check: "Check",
  zelle: "Zelle",
  other: "Other",
};

export function methodLabel(m: string | null | undefined): string {
  if (!m) return "—";
  return METHOD_LABELS[m] ?? m;
}
