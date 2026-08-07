"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Table, Thead, Th, Td } from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import { dashIfNull, fmtCurrency, fmtDateShort, fmtDiscount, fmtQty } from "@/lib/format";

export type LineItem = {
  id: string;
  product_code: string | null;
  product_name: string | null;
  service_date: string | null;
  quantity: number | null;
  list_price: number | null;
  discount_pct: number | null;
  net_total: number | null;
};

export type LineItemCacheEntry = LineItem[] | "loading" | "error";

export function LineItemsPanel({
  invoiceId,
  abn,
  vendorEmail,
  currency,
  cache,
  onCacheUpdate,
}: {
  invoiceId: string;
  abn: string | null;
  vendorEmail: string | null;
  currency: string | null;
  cache: LineItemCacheEntry | undefined;
  onCacheUpdate: (invoiceId: string, entry: LineItemCacheEntry) => void;
}) {
  useEffect(() => {
    if (cache !== undefined) return;
    onCacheUpdate(invoiceId, "loading");
    const supabase = createClient();
    supabase
      .from("invoice_line_items")
      .select(
        "id, product_code, product_name, service_date, quantity, list_price, discount_pct, net_total",
      )
      .eq("invoice_id", invoiceId)
      .order("created_at")
      .then(({ data, error }) => {
        onCacheUpdate(invoiceId, error || !data ? "error" : data);
      });
  }, [invoiceId, cache, onCacheUpdate]);

  return (
    <div className="bg-neutral-100 px-6 py-5">
      <p className="mb-3 text-[11px] tracking-[0.1em] text-foreground/55 uppercase">
        Line Items — ABN {dashIfNull(abn)} · {dashIfNull(vendorEmail)}
      </p>
      {cache === "loading" || cache === undefined ? (
        <div className="flex items-center gap-2 py-4 text-sm text-foreground/60">
          <Spinner /> Loading line items…
        </div>
      ) : cache === "error" ? (
        <p className="py-4 text-sm text-accent-700">Couldn&apos;t load line items.</p>
      ) : cache.length === 0 ? (
        <p className="py-4 text-sm text-foreground/60">No line items recorded.</p>
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>Product</Th>
              <Th>Service Date</Th>
              <Th num>Qty</Th>
              <Th num>List Price</Th>
              <Th num>Discount</Th>
              <Th num>Net Total</Th>
            </tr>
          </Thead>
          <tbody>
            {cache.map((li) => (
              <tr key={li.id} className="border-b border-divider last:border-b-0">
                <Td>{dashIfNull(li.product_name)}</Td>
                <Td>{li.service_date ? fmtDateShort(li.service_date) : "–"}</Td>
                <Td num>{fmtQty(li.quantity)}</Td>
                <Td num>{li.list_price === null ? "–" : fmtCurrency(li.list_price, currency)}</Td>
                <Td num>{fmtDiscount(li.discount_pct)}</Td>
                <Td num>{li.net_total === null ? "–" : fmtCurrency(li.net_total, currency)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
