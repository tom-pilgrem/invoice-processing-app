import { NextResponse } from "next/server";
import { utils, write } from "xlsx";
import { createClient } from "@/lib/supabase/server";
import { ROW_LIMIT } from "@/lib/browse/filters";

function parseIds(body: unknown): string[] | null {
  if (typeof body !== "object" || body === null) return null;
  const ids = (body as Record<string, unknown>).ids;
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > ROW_LIMIT) return null;
  if (!ids.every((id) => typeof id === "string" && id.length > 0)) return null;
  return ids as string[];
}

type InvoiceMetaRow = {
  vendor: string | null;
  abn: string | null;
  vendor_email: string | null;
  vendor_phone: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  due_date: string | null;
  subtotal: number | null;
  gst: number | null;
  total_amount: number | null;
  currency: string | null;
  source_filename: string | null;
  needs_review: boolean;
  created_at: string;
};

type LineItemRow = {
  product_code: string | null;
  product_name: string | null;
  service_date: string | null;
  quantity: number | null;
  list_price: number | null;
  discount_pct: number | null;
  net_total: number | null;
  invoices: { invoice_number: string | null; vendor: string | null } | null;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const ids = parseIds(body);
  if (!ids) {
    return NextResponse.json({ ok: false, error: "Invalid ids payload" }, { status: 400 });
  }

  const { data: invoices, error: invoicesError } = await supabase
    .from("invoices")
    .select(
      "vendor, abn, vendor_email, vendor_phone, invoice_number, invoice_date, due_date, subtotal, gst, total_amount, currency, source_filename, needs_review, created_at",
    )
    .in("id", ids)
    .returns<InvoiceMetaRow[]>();

  const { data: lineItems, error: lineItemsError } = await supabase
    .from("invoice_line_items")
    .select(
      "product_code, product_name, service_date, quantity, list_price, discount_pct, net_total, invoices!inner(invoice_number, vendor)",
    )
    .in("invoice_id", ids)
    .returns<LineItemRow[]>();

  if (invoicesError || lineItemsError) {
    return NextResponse.json({ ok: false, error: "Failed to load invoices" }, { status: 500 });
  }

  const invoiceSheet = utils.json_to_sheet(
    (invoices ?? []).map((inv) => ({
      "Invoice Number": inv.invoice_number,
      Vendor: inv.vendor,
      ABN: inv.abn,
      "Vendor Email": inv.vendor_email,
      "Vendor Phone": inv.vendor_phone,
      "Invoice Date": inv.invoice_date,
      "Due Date": inv.due_date,
      Subtotal: inv.subtotal,
      GST: inv.gst,
      Total: inv.total_amount,
      Currency: inv.currency,
      "Source Filename": inv.source_filename,
      "Needs Review": inv.needs_review,
      "Upload Date": inv.created_at,
    })),
  );

  const lineItemSheet = utils.json_to_sheet(
    (lineItems ?? []).map((li) => ({
      "Invoice Number": li.invoices?.invoice_number ?? null,
      Vendor: li.invoices?.vendor ?? null,
      "Product Code": li.product_code,
      "Product Name": li.product_name,
      "Service Date": li.service_date,
      Quantity: li.quantity,
      "List Price": li.list_price,
      "Discount %": li.discount_pct === null ? null : li.discount_pct * 100,
      "Net Total": li.net_total,
    })),
  );

  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, lineItemSheet, "Line Items");
  utils.book_append_sheet(workbook, invoiceSheet, "Invoices");

  const buffer = write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
  const today = new Date().toISOString().slice(0, 10);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="invoices-export-${today}.xlsx"`,
    },
  });
}
