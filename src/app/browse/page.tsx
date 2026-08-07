import { createClient } from "@/lib/supabase/server";
import { applyBrowseFilters, escapeLike, parseBrowseFilters, ROW_LIMIT } from "@/lib/browse/filters";
import { BrowseClient, type InvoiceRow } from "@/components/browse/browse-client";
import type { CurrencyTotal } from "@/lib/browse/summary";

export default async function BrowsePage({ searchParams }: PageProps<"/browse">) {
  const params = await searchParams;
  const filters = parseBrowseFilters(params);

  const supabase = await createClient();

  const dateColumn = filters.dateMode === "upload" ? "created_at" : "invoice_date";

  let rowsQuery = supabase
    .from("invoices")
    .select(
      "id, vendor, invoice_number, invoice_date, due_date, total_amount, currency, needs_review, abn, vendor_email",
    )
    .order(dateColumn, { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .limit(ROW_LIMIT);
  rowsQuery = applyBrowseFilters(rowsQuery, filters);
  const { data: rows } = await rowsQuery;

  type BrowseSummaryRow = { currency: string | null; invoice_count: number; total: number };

  const { data: summaryRows } = (await supabase.rpc("browse_summary", {
    p_date_mode: filters.dateMode,
    p_from: filters.from,
    p_to: filters.to,
    p_vendor: filters.vendor ? escapeLike(filters.vendor) : null,
    p_invoice_number: filters.invoiceNumber ? escapeLike(filters.invoiceNumber) : null,
    p_needs_review: filters.needsReview ? true : null,
  })) as { data: BrowseSummaryRow[] | null };

  const totals: CurrencyTotal[] = (summaryRows ?? []).map((r) => ({
    currency: r.currency,
    total: Number(r.total),
  }));
  const invoiceCount = (summaryRows ?? []).reduce(
    (sum, r) => sum + Number(r.invoice_count),
    0,
  );

  let lineItemCountQuery = supabase
    .from("invoice_line_items")
    .select("id, invoices!inner(id)", { count: "exact", head: true });
  lineItemCountQuery = applyBrowseFilters(lineItemCountQuery, filters, "invoices.");
  const { count: lineItemCount } = await lineItemCountQuery;

  const { count: totalInvoiceCount } = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true });

  return (
    <BrowseClient
      rows={(rows ?? []) as InvoiceRow[]}
      filters={filters}
      totals={totals}
      invoiceCount={invoiceCount}
      lineItemCount={lineItemCount ?? 0}
      hasAnyInvoices={(totalInvoiceCount ?? 0) > 0}
    />
  );
}
