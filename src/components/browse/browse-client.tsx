"use client";

import { Fragment, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tag, StatusDot } from "@/components/ui/tag";
import { Field, Input, CheckboxDot } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { Table, Thead, Th, Td } from "@/components/ui/table";
import { ExportModal } from "@/components/browse/export-modal";
import { LineItemsPanel, type LineItemCacheEntry } from "@/components/browse/line-items-panel";
import {
  applyBrowseFilters,
  browseFiltersToQueryString,
  DEFAULT_BROWSE_FILTERS,
  ROW_LIMIT,
  type BrowseFilters,
} from "@/lib/browse/filters";
import { buildActiveFilterLabel, formatTotalSummary, type CurrencyTotal } from "@/lib/browse/summary";
import { fmtCurrency, fmtDateShort, plural } from "@/lib/format";

export type InvoiceRow = {
  id: string;
  vendor: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  due_date: string | null;
  total_amount: number | null;
  currency: string | null;
  needs_review: boolean;
  abn: string | null;
  vendor_email: string | null;
};

const DEBOUNCE_MS = 350;

export function BrowseClient({
  rows,
  filters,
  totals,
  invoiceCount,
  lineItemCount,
  hasAnyInvoices,
}: {
  rows: InvoiceRow[];
  filters: BrowseFilters;
  totals: CurrencyTotal[];
  invoiceCount: number;
  lineItemCount: number;
  hasAnyInvoices: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [isPending, setIsPending] = useState(false);

  const [local, setLocal] = useState<BrowseFilters>(filters);
  const lastWrittenRef = useRef(browseFiltersToQueryString(filters));
  const mountedRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [lineItemCache, setLineItemCache] = useState<Record<string, LineItemCacheEntry>>({});
  const [exportOpen, setExportOpen] = useState(false);

  const pushFilters = useCallback(
    (next: BrowseFilters) => {
      const qs = browseFiltersToQueryString(next);
      lastWrittenRef.current = qs;
      setIsPending(true);
      startTransition(() => {
        router.replace(`/browse${qs}`, { scroll: false });
      });
    },
    [router],
  );

  // Resync local state when the incoming filters differ from what we last
  // wrote ourselves — covers back/forward navigation and external links
  // (e.g. Clear Filters landing via a fresh page load).
  useEffect(() => {
    const incoming = browseFiltersToQueryString(filters);
    if (incoming !== lastWrittenRef.current) {
      setLocal(filters);
      lastWrittenRef.current = incoming;
    }
    setIsPending(false);
  }, [filters]);

  useEffect(() => {
    setExpandedId(null);
  }, [rows]);

  // Debounced text filters — Enter flushes immediately via onKeyDown below.
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => pushFilters(local), DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local.vendor, local.invoiceNumber]);

  function flushDebounce() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    pushFilters(local);
  }

  function handleDiscreteChange(patch: Partial<BrowseFilters>) {
    const next = { ...local, ...patch };
    setLocal(next);
    pushFilters(next);
  }

  function handleClearFilters() {
    const next: BrowseFilters = { ...DEFAULT_BROWSE_FILTERS, dateMode: local.dateMode };
    setLocal(next);
    pushFilters(next);
  }

  const activeFilterLabel = buildActiveFilterLabel(filters);
  const totalSummary = formatTotalSummary(totals);
  const hasFiltersActive =
    filters.from !== null ||
    filters.to !== null ||
    filters.vendor !== null ||
    filters.invoiceNumber !== null ||
    filters.needsReview;

  function handleLineItemCacheUpdate(invoiceId: string, entry: LineItemCacheEntry) {
    setLineItemCache((prev) => ({ ...prev, [invoiceId]: entry }));
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="grid flex-1 grid-cols-[260px_1fr]">
      <aside className="flex flex-col gap-6 border-r-2 border-divider py-6 pr-5 pl-12">
        <div className="flex flex-col gap-2">
          <p className="text-[11px] tracking-[0.1em] text-foreground/55 uppercase">
            Filter By Date
          </p>
          <Segmented
            name="dateMode"
            label="Date field"
            value={local.dateMode}
            onChange={(value) => handleDiscreteChange({ dateMode: value })}
            options={[
              { value: "invoice", label: "Invoice Date" },
              { value: "upload", label: "Upload Date" },
            ]}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Field label="From" htmlFor="date-from">
            <Input
              id="date-from"
              type="date"
              value={local.from ?? ""}
              onChange={(e) => handleDiscreteChange({ from: e.target.value || null })}
            />
          </Field>
          <Field label="To" htmlFor="date-to">
            <Input
              id="date-to"
              type="date"
              value={local.to ?? ""}
              onChange={(e) => handleDiscreteChange({ to: e.target.value || null })}
            />
          </Field>
        </div>

        <div className="flex flex-col gap-2">
          <Field label="Vendor" htmlFor="vendor-search">
            <Input
              id="vendor-search"
              type="text"
              placeholder="Search vendor"
              value={local.vendor ?? ""}
              onChange={(e) => setLocal((l) => ({ ...l, vendor: e.target.value || null }))}
              onKeyDown={(e) => {
                if (e.key === "Enter") flushDebounce();
              }}
            />
          </Field>
          <Field label="Invoice #" htmlFor="invoice-number-search">
            <Input
              id="invoice-number-search"
              type="text"
              placeholder="Search invoice #"
              value={local.invoiceNumber ?? ""}
              onChange={(e) => setLocal((l) => ({ ...l, invoiceNumber: e.target.value || null }))}
              onKeyDown={(e) => {
                if (e.key === "Enter") flushDebounce();
              }}
            />
          </Field>
        </div>

        <div className="border-t border-divider py-2">
          <CheckboxDot
            label="Needs Review Only"
            checked={local.needsReview}
            onChange={(e) => handleDiscreteChange({ needsReview: e.target.checked })}
          />
        </div>

        <Button type="button" variant="ghost" block onClick={handleClearFilters}>
          Clear Filters
        </Button>
      </aside>

      <main className="p-6 pt-6 pb-8 pl-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-xl font-extrabold">
              {plural(invoiceCount, "Invoice")} · {totalSummary}
            </p>
            <Tag variant="outline" className="inline-flex items-center gap-1.5">
              {activeFilterLabel}
            </Tag>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Button type="button" onClick={() => setExportOpen(true)}>
              Export To Excel
            </Button>
          </div>
        </div>

        <div className={isPending ? "opacity-60 transition-opacity" : "transition-opacity"}>
          {rows.length === 0 ? (
            hasAnyInvoices ? (
              <div className="border-t-2 border-divider px-4 py-8 text-center">
                <h3 className="mt-3 mb-2 text-lg font-extrabold">No Invoices Match These Filters</h3>
                <p className="mb-4 text-foreground/65">
                  Try widening the date range or clearing the vendor and status filters.
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  className="mx-auto"
                  onClick={handleClearFilters}
                >
                  Clear Filters
                </Button>
              </div>
            ) : (
              <div className="border-t-2 border-divider px-4 py-8 text-center">
                <h3 className="mt-3 mb-2 text-lg font-extrabold">No Invoices Yet</h3>
                <p className="mb-4 text-foreground/65">
                  Upload your first invoice to start building your library.
                </p>
                <Link href="/upload">
                  <Button type="button" variant="secondary" className="mx-auto">
                    Upload Invoices
                  </Button>
                </Link>
              </div>
            )
          ) : (
            <>
              <Table>
                <Thead>
                  <tr>
                    <Th>Vendor</Th>
                    <Th>Invoice #</Th>
                    <Th>Invoice Date</Th>
                    <Th>Due Date</Th>
                    <Th num>Total</Th>
                    <Th>Status</Th>
                  </tr>
                </Thead>
                <tbody>
                  {rows.map((row) => {
                    const isExpanded = expandedId === row.id;
                    return (
                      <Fragment key={row.id}>
                        <tr
                          className="cursor-pointer border-b border-divider hover:bg-neutral-100"
                          onClick={() => toggleExpand(row.id)}
                          role="button"
                          tabIndex={0}
                          aria-expanded={isExpanded}
                          aria-controls={`line-items-${row.id}`}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              toggleExpand(row.id);
                            }
                          }}
                        >
                          <Td>{row.vendor ?? "–"}</Td>
                          <Td>{row.invoice_number ?? "–"}</Td>
                          <Td>{row.invoice_date ? fmtDateShort(row.invoice_date) : "–"}</Td>
                          <Td>{row.due_date ? fmtDateShort(row.due_date) : "–"}</Td>
                          <Td num>
                            {row.total_amount === null
                              ? "–"
                              : fmtCurrency(row.total_amount, row.currency)}
                          </Td>
                          <Td>
                            <span className="flex items-center gap-2">
                              {row.needs_review ? (
                                <>
                                  <StatusDot />
                                  <Tag variant="accent">Needs Review</Tag>
                                </>
                              ) : (
                                <Tag variant="neutral">Processed</Tag>
                              )}
                            </span>
                          </Td>
                        </tr>
                        {isExpanded && (
                          <tr id={`line-items-${row.id}`} className="border-b-2 border-divider">
                            <td colSpan={6} className="p-0">
                              <LineItemsPanel
                                invoiceId={row.id}
                                abn={row.abn}
                                vendorEmail={row.vendor_email}
                                currency={row.currency}
                                cache={lineItemCache[row.id]}
                                onCacheUpdate={handleLineItemCacheUpdate}
                              />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </Table>

              {invoiceCount > rows.length && (
                <p className="mt-4 text-sm text-foreground/60">
                  Showing the first {ROW_LIMIT} of {invoiceCount} matching invoices. Narrow the
                  filters to see the rest.
                </p>
              )}
            </>
          )}
        </div>
      </main>

      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        invoiceCount={invoiceCount}
        lineItemCount={lineItemCount}
        activeFilterLabel={activeFilterLabel}
      />
    </div>
  );
}
