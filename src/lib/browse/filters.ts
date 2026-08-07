export type DateMode = "invoice" | "upload";

export type BrowseFilters = {
  dateMode: DateMode;
  from: string | null;
  to: string | null;
  vendor: string | null;
  invoiceNumber: string | null;
  needsReview: boolean;
};

export const DEFAULT_BROWSE_FILTERS: BrowseFilters = {
  dateMode: "invoice",
  from: null,
  to: null,
  vendor: null,
  invoiceNumber: null,
  needsReview: false,
};

export const ROW_LIMIT = 500;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function param(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function parseDateMode(value: string | string[] | undefined): DateMode {
  const raw = param(value);
  return raw === "upload" ? "upload" : "invoice";
}

function parseIsoDate(value: string | string[] | undefined): string | null {
  const raw = param(value);
  if (!raw || !DATE_RE.test(raw)) return null;
  return Number.isFinite(Date.parse(raw)) ? raw : null;
}

function parseText(value: string | string[] | undefined): string | null {
  const raw = param(value);
  if (!raw) return null;
  const trimmed = raw.trim().slice(0, 100);
  return trimmed.length > 0 ? trimmed : null;
}

function parseFlag(value: string | string[] | undefined): boolean {
  return param(value) === "1";
}

export function parseBrowseFilters(
  params: Record<string, string | string[] | undefined>,
): BrowseFilters {
  return {
    dateMode: parseDateMode(params.dateMode),
    from: parseIsoDate(params.from),
    to: parseIsoDate(params.to),
    vendor: parseText(params.vendor),
    invoiceNumber: parseText(params.invoiceNumber),
    needsReview: parseFlag(params.needsReview),
  };
}

export function browseFiltersToQueryString(filters: BrowseFilters): string {
  const params = new URLSearchParams();
  if (filters.dateMode !== DEFAULT_BROWSE_FILTERS.dateMode) {
    params.set("dateMode", filters.dateMode);
  }
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.vendor) params.set("vendor", filters.vendor);
  if (filters.invoiceNumber) params.set("invoiceNumber", filters.invoiceNumber);
  if (filters.needsReview) params.set("needsReview", "1");
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (m) => `\\${m}`);
}

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

interface FilterableQuery<Q> {
  gte(column: string, value: string): Q;
  lte(column: string, value: string): Q;
  lt(column: string, value: string): Q;
  ilike(column: string, pattern: string): Q;
  eq(column: string, value: boolean): Q;
}

/**
 * Chains the browse filters onto a Supabase query builder. `prefix` lets the
 * same function target either `invoices` columns directly or an embedded
 * `invoices.` relation (e.g. from `invoice_line_items!inner(...)`).
 */
export function applyBrowseFilters<Q extends FilterableQuery<Q>>(
  query: Q,
  filters: BrowseFilters,
  prefix = "",
): Q {
  let q = query;
  const dateColumn = filters.dateMode === "upload" ? "created_at" : "invoice_date";

  if (filters.from) {
    q = q.gte(prefix + dateColumn, filters.from);
  }
  if (filters.to) {
    if (filters.dateMode === "upload") {
      // created_at is a timestamp, not a date — an inclusive lte would compare
      // against midnight and silently drop everything uploaded that day.
      q = q.lt(prefix + "created_at", addDays(filters.to, 1));
    } else {
      q = q.lte(prefix + "invoice_date", filters.to);
    }
  }
  if (filters.vendor) {
    q = q.ilike(prefix + "vendor", `%${escapeLike(filters.vendor)}%`);
  }
  if (filters.invoiceNumber) {
    q = q.ilike(prefix + "invoice_number", `%${escapeLike(filters.invoiceNumber)}%`);
  }
  if (filters.needsReview) {
    q = q.eq(prefix + "needs_review", true);
  }

  return q;
}
