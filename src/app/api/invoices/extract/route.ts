import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractInvoice, type ExtractedInvoice, type MimeType } from "@/lib/anthropic/extract-invoice";

export const runtime = "nodejs";

const ALLOWED_TYPES: Record<string, MimeType> = {
  "application/pdf": "application/pdf",
  "image/jpeg": "image/jpeg",
  "image/jpg": "image/jpeg",
  "image/png": "image/png",
};

const MAX_SIZE_BYTES = 15 * 1024 * 1024;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "Missing file" }, { status: 400 });
  }

  const mimeType = ALLOWED_TYPES[file.type];
  if (!mimeType) {
    return NextResponse.json({ ok: false, error: "Unsupported file type" }, { status: 400 });
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ ok: false, error: "File too large" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let extracted: ExtractedInvoice | null = null;
  try {
    extracted = await extractInvoice({ buffer, mimeType, filename: file.name });
  } catch {
    extracted = null;
  }

  const needsReview = !extracted || extracted.invoice_date === null;

  const { data: invoiceRow, error: insertError } = await supabase
    .from("invoices")
    .insert({
      user_id: user.id,
      vendor: extracted?.vendor_name ?? null,
      abn: extracted?.abn ?? null,
      vendor_email: extracted?.vendor_email ?? null,
      vendor_phone: extracted?.vendor_phone ?? null,
      invoice_number: extracted?.invoice_number ?? null,
      invoice_date: extracted?.invoice_date ?? null,
      due_date: extracted?.due_date ?? null,
      subtotal: extracted?.subtotal ?? null,
      gst: extracted?.gst ?? null,
      total_amount: extracted?.total_amount_due ?? null,
      currency: extracted?.currency ?? null,
      source_filename: file.name,
      needs_review: needsReview,
    })
    .select("id")
    .single();

  if (insertError || !invoiceRow) {
    return NextResponse.json({ ok: false, error: "Failed to save invoice" }, { status: 500 });
  }

  if (extracted && extracted.line_items.length > 0) {
    const lineItems = extracted.line_items.map((item) => ({
      invoice_id: invoiceRow.id,
      user_id: user.id,
      product_code: item.product_code,
      product_name: item.product_name,
      service_date: item.service_date,
      quantity: item.quantity,
      list_price: item.list_price,
      discount_pct: item.discount_pct,
      net_total: item.net_total,
    }));

    await supabase.from("invoice_line_items").insert(lineItems);
  }

  return NextResponse.json({
    ok: true,
    invoiceId: invoiceRow.id as string,
    status: needsReview ? "review" : "done",
    vendor: extracted?.vendor_name ?? null,
  });
}
