import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = "claude-haiku-4-5-20251001";
const TOOL_NAME = "record_invoice";

export type MimeType = "application/pdf" | "image/jpeg" | "image/png";

export type ExtractedLineItem = {
  product_code: string | null;
  product_name: string | null;
  service_date: string | null;
  quantity: number | null;
  list_price: number | null;
  discount_pct: number | null;
  net_total: number | null;
};

export type ExtractedInvoice = {
  vendor_name: string | null;
  abn: string | null;
  vendor_email: string | null;
  vendor_phone: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  due_date: string | null;
  subtotal: number | null;
  gst: number | null;
  total_amount_due: number | null;
  currency: string | null;
  line_items: ExtractedLineItem[];
};

export class ExtractionError extends Error {}

const SYSTEM_PROMPT = `You are an invoice data extraction assistant. Extract invoice data using the record_invoice tool. No explanation, no markdown — just the tool call.

Format rules:
- invoice_date: the invoice's issue/date-issued field, as YYYY-MM-DD. If the invoice only states a relative term (e.g. "net 30 from receipt") or no date is present at all, use null.
- due_date: as YYYY-MM-DD. Null if not present.
- service_date (per line item): as YYYY-MM-DD. Null if not present.
- currency: the 3-letter ISO code (AUD, USD, NZD, etc.) inferred from currency symbols/text on the invoice ($, A$, US$, etc). Null if genuinely ambiguous.
- discount_pct: as a decimal fraction, not a percentage (e.g. a 10% discount is 0.1, not 10).
- Numbers only for all monetary values, no currency symbols.
- Null for any missing fields.
- product_code: reconstruct codes split across lines by OCR. If a prefix (e.g. "CAT") appears on one line and a number (e.g. "001") on the next, combine them as "CAT001". Use surrounding context to identify the prefix.`;

const inputSchema: Anthropic.Tool.InputSchema = {
  type: "object",
  properties: {
    vendor_name: { type: ["string", "null"] },
    abn: { type: ["string", "null"] },
    vendor_email: { type: ["string", "null"] },
    vendor_phone: { type: ["string", "null"] },
    invoice_number: { type: ["string", "null"] },
    invoice_date: {
      type: ["string", "null"],
      description: "YYYY-MM-DD. Null if no absolute date is present.",
    },
    due_date: { type: ["string", "null"] },
    subtotal: { type: ["number", "null"] },
    gst: { type: ["number", "null"] },
    total_amount_due: { type: ["number", "null"] },
    currency: { type: ["string", "null"] },
    line_items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          product_code: { type: ["string", "null"] },
          product_name: { type: ["string", "null"] },
          service_date: { type: ["string", "null"] },
          quantity: { type: ["number", "null"] },
          list_price: { type: ["number", "null"] },
          discount_pct: { type: ["number", "null"] },
          net_total: { type: ["number", "null"] },
        },
        required: [
          "product_code",
          "product_name",
          "service_date",
          "quantity",
          "list_price",
          "discount_pct",
          "net_total",
        ],
      },
    },
  },
  required: [
    "vendor_name",
    "abn",
    "vendor_email",
    "vendor_phone",
    "invoice_number",
    "invoice_date",
    "due_date",
    "subtotal",
    "gst",
    "total_amount_due",
    "currency",
    "line_items",
  ],
};

export async function extractInvoice(input: {
  buffer: Buffer;
  mimeType: MimeType;
  filename: string;
}): Promise<ExtractedInvoice> {
  const data = input.buffer.toString("base64");

  const contentBlock =
    input.mimeType === "application/pdf"
      ? ({
          type: "document",
          source: { type: "base64", media_type: input.mimeType, data },
        } as const)
      : ({
          type: "image",
          source: { type: "base64", media_type: input.mimeType, data },
        } as const);

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    tools: [
      {
        name: TOOL_NAME,
        description: "Record structured invoice data extracted from the attached document.",
        input_schema: inputSchema,
      },
    ],
    tool_choice: { type: "tool", name: TOOL_NAME },
    messages: [
      {
        role: "user",
        content: [
          contentBlock,
          {
            type: "text",
            text: `Extract invoice data from this file (${input.filename}) using the record_invoice tool.`,
          },
        ],
      },
    ],
  });

  const toolUse = message.content.find(
    (block): block is Extract<(typeof message.content)[number], { type: "tool_use" }> =>
      block.type === "tool_use" && block.name === TOOL_NAME,
  );

  if (!toolUse) {
    throw new ExtractionError(
      `Claude did not return a ${TOOL_NAME} tool call (stop_reason: ${message.stop_reason})`,
    );
  }

  return parseExtractedInvoice(toolUse.input);
}

function parseExtractedInvoice(raw: unknown): ExtractedInvoice {
  if (typeof raw !== "object" || raw === null) {
    throw new ExtractionError("Tool call input was not an object");
  }
  const r = raw as Record<string, unknown>;

  const str = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null);
  const num = (v: unknown): number | null => {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
    return null;
  };

  const lineItemsRaw = Array.isArray(r.line_items) ? r.line_items : [];

  return {
    vendor_name: str(r.vendor_name),
    abn: str(r.abn),
    vendor_email: str(r.vendor_email),
    vendor_phone: str(r.vendor_phone),
    invoice_number: str(r.invoice_number),
    invoice_date: str(r.invoice_date),
    due_date: str(r.due_date),
    subtotal: num(r.subtotal),
    gst: num(r.gst),
    total_amount_due: num(r.total_amount_due),
    currency: str(r.currency),
    line_items: lineItemsRaw.map((item) => {
      const li = (typeof item === "object" && item !== null ? item : {}) as Record<
        string,
        unknown
      >;
      return {
        product_code: str(li.product_code),
        product_name: str(li.product_name),
        service_date: str(li.service_date),
        quantity: num(li.quantity),
        list_price: num(li.list_price),
        discount_pct: num(li.discount_pct),
        net_total: num(li.net_total),
      };
    }),
  };
}
