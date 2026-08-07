import { fmtCurrency, fmtDateShort } from "@/lib/format";
import type { BrowseFilters } from "@/lib/browse/filters";

export type CurrencyTotal = {
  currency: string | null;
  total: number;
};

export function formatTotalSummary(totals: CurrencyTotal[]): string {
  if (totals.length === 0) return "$0.00";

  const known = totals
    .filter((t) => t.currency !== null)
    .sort((a, b) => (a.currency as string).localeCompare(b.currency as string));
  const unknown = totals.filter((t) => t.currency === null);

  const parts = [
    ...known.map((t) => fmtCurrency(t.total, t.currency)),
    ...unknown.map((t) => `${fmtCurrency(t.total, null)} (unknown currency)`),
  ];

  return parts.join(" + ");
}

export function buildActiveFilterLabel(filters: BrowseFilters): string {
  const parts: string[] = [];

  parts.push(filters.dateMode === "invoice" ? "Invoice date" : "Upload date");

  if (filters.from || filters.to) {
    const from = filters.from ? fmtDateShort(filters.from) : "…";
    const to = filters.to ? fmtDateShort(filters.to) : "…";
    parts.push(`${from} - ${to}`);
  } else {
    parts.push("all dates");
  }

  if (filters.vendor) parts.push(`vendor: "${filters.vendor}"`);
  if (filters.invoiceNumber) parts.push(`invoice #: "${filters.invoiceNumber}"`);
  if (filters.needsReview) parts.push("needs review only");

  return parts.join(" · ");
}
