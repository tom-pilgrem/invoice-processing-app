import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReviewClient } from "@/components/review/review-client";

function parseIds(raw: string | string[] | undefined): string[] {
  if (typeof raw !== "string") return [];
  const seen = new Set<string>();
  for (const part of raw.split(",")) {
    const trimmed = part.trim();
    if (trimmed) seen.add(trimmed);
  }
  return Array.from(seen);
}

function parseCount(raw: string | string[] | undefined): number | undefined {
  if (typeof raw !== "string") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export default async function ReviewPage({ searchParams }: PageProps<"/review">) {
  const params = await searchParams;
  const ids = parseIds(params.ids);

  if (ids.length === 0) {
    redirect("/browse");
  }

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("invoices")
    .select("id, vendor, source_filename, invoice_date")
    .in("id", ids);

  if (!rows || rows.length === 0) {
    redirect("/browse");
  }

  const order = new Map(ids.map((id, i) => [id, i]));
  const sortedRows = [...rows].sort(
    (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0),
  );

  const total = parseCount(params.total);
  const done = parseCount(params.done);

  return <ReviewClient rows={sortedRows} total={total} done={done} />;
}
