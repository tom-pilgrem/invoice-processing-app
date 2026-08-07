import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_ITEMS = 50;

type ReviewItem = {
  id: string;
  skipped: boolean;
  date: string | null;
};

function parseItems(body: unknown): ReviewItem[] | null {
  if (typeof body !== "object" || body === null) return null;
  const items = (body as Record<string, unknown>).items;
  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_ITEMS) return null;

  const seen = new Set<string>();
  const parsed: ReviewItem[] = [];

  for (const raw of items) {
    if (typeof raw !== "object" || raw === null) return null;
    const r = raw as Record<string, unknown>;

    if (typeof r.id !== "string" || r.id.length === 0) return null;
    if (seen.has(r.id)) return null;
    seen.add(r.id);

    if (typeof r.skipped !== "boolean") return null;

    if (r.date !== null && (typeof r.date !== "string" || !DATE_RE.test(r.date))) return null;

    parsed.push({ id: r.id, skipped: r.skipped, date: r.date });
  }

  return parsed;
}

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

  const items = parseItems(body);
  if (!items) {
    return NextResponse.json({ ok: false, error: "Invalid items payload" }, { status: 400 });
  }

  const results = await Promise.all(
    items.map((item) => {
      const invoice_date = item.skipped ? null : item.date;
      const needs_review = item.skipped || invoice_date === null;

      return supabase
        .from("invoices")
        .update({ invoice_date, needs_review })
        .eq("id", item.id)
        .eq("user_id", user.id)
        .select("id")
        .single();
    }),
  );

  const failures = results.filter((r) => r.error);
  if (failures.length > 0) {
    return NextResponse.json(
      { ok: false, error: `Failed to save ${failures.length} of ${items.length} invoices` },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, updated: items.length });
}
