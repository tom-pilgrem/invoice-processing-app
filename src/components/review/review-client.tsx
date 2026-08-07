"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input, CheckboxDot } from "@/components/ui/field";

type ReviewRow = {
  id: string;
  vendor: string | null;
  source_filename: string | null;
  invoice_date: string | null;
};

type RowState = {
  date: string;
  skipped: boolean;
};

export function ReviewClient({
  rows,
  total,
  done,
}: {
  rows: ReviewRow[];
  total?: number;
  done?: number;
}) {
  const router = useRouter();
  const [state, setState] = useState<Record<string, RowState>>(() =>
    Object.fromEntries(rows.map((r) => [r.id, { date: r.invoice_date ?? "", skipped: false }])),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateRow(id: string, patch: Partial<RowState>) {
    setState((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  const z = rows.length;
  const summary =
    total !== undefined && done !== undefined
      ? `${done} of ${total} processed automatically. ${z} need your input.`
      : `${z} invoice${z === 1 ? "" : "s"} need your input.`;

  async function handleConfirm() {
    setSaving(true);
    setError(null);

    const items = rows.map((r) => ({
      id: r.id,
      skipped: state[r.id].skipped,
      date: state[r.id].date || null,
    }));

    try {
      const res = await fetch("/api/invoices/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError("Couldn't save — try again.");
        setSaving(false);
        return;
      }

      router.push("/browse");
    } catch {
      setError("Couldn't save — try again.");
      setSaving(false);
    }
  }

  return (
    <div className="max-w-[880px] p-8 pl-12">
      <h1 className="text-2xl font-extrabold">Review Needed</h1>
      <p className="mt-2 mb-6 text-sm text-foreground/65">{summary}</p>

      <div>
        {rows.map((row) => {
          const rowState = state[row.id];
          return (
            <div
              key={row.id}
              className="grid grid-cols-[1.4fr_1fr_1fr] items-end gap-4 border-b border-divider py-4"
            >
              <div>
                <div className="text-sm">{row.source_filename ?? "Untitled file"}</div>
                <div className="text-xs text-foreground/60">
                  {row.vendor ? `Vendor found: ${row.vendor}` : "Vendor not detected"}
                </div>
              </div>

              <Field label="Invoice Date" htmlFor={`date-${row.id}`}>
                <Input
                  id={`date-${row.id}`}
                  type="date"
                  value={rowState.date}
                  disabled={rowState.skipped}
                  onChange={(e) => updateRow(row.id, { date: e.target.value })}
                />
              </Field>

              <CheckboxDot
                label="Skip"
                checked={rowState.skipped}
                onChange={(e) => updateRow(row.id, { skipped: e.target.checked })}
              />
            </div>
          );
        })}
      </div>

      {error && <p className="mt-3 text-sm text-accent-700">{error}</p>}

      <div className="mt-6 flex justify-end">
        <Button type="button" disabled={saving} onClick={handleConfirm}>
          {saving ? "Saving…" : "Confirm And Save"}
        </Button>
      </div>
    </div>
  );
}
