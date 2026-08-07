const CURRENCY_SYMBOLS: Record<string, string> = {
  AUD: "A$",
  USD: "US$",
  NZD: "NZ$",
};

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function withThousands(amount: number): string {
  const fixed = amount.toFixed(2);
  const [whole, decimals] = fixed.split(".");
  const negative = whole.startsWith("-");
  const digits = negative ? whole.slice(1) : whole;
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${negative ? "-" : ""}${grouped}.${decimals}`;
}

export function fmtCurrency(amount: number, currency: string | null): string {
  if (currency === null) return withThousands(amount);
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  return `${symbol}${withThousands(amount)}`;
}

export function fmtDateShort(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export function dashIfNull(value: string | number | null | undefined): string {
  return value === null || value === undefined || value === "" ? "–" : String(value);
}

export function fmtQty(n: number | null): string {
  return n === null ? "–" : String(n);
}

export function fmtDiscount(pct: number | null): string {
  if (pct === null || pct === 0) return "–";
  return `${(pct * 100).toFixed(0)}%`;
}
