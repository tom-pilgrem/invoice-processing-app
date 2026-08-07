"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { plural } from "@/lib/format";

export function ExportModal({
  open,
  onClose,
  selectedIds,
  activeFilterLabel,
}: {
  open: boolean;
  onClose: () => void;
  selectedIds: string[];
  activeFilterLabel: string;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  async function handleDownload() {
    setDownloading(true);
    setError(null);

    try {
      const res = await fetch("/api/invoices/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });

      if (!res.ok) {
        setError("Couldn't export — try again.");
        setDownloading(false);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const today = new Date().toISOString().slice(0, 10);
      const link = document.createElement("a");
      link.href = url;
      link.download = `invoices-export-${today}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);

      setDownloading(false);
      onClose();
    } catch {
      setError("Couldn't export — try again.");
      setDownloading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-dialog-title"
        tabIndex={-1}
        className="w-[420px] bg-background p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="export-dialog-title" className="text-lg font-extrabold">
          Export To Excel
        </h3>
        <p className="mt-3 text-sm text-foreground/80">
          Exporting {plural(selectedIds.length, "Invoice")} and their line items, within{" "}
          {activeFilterLabel}.
        </p>
        {error && <p className="mt-3 text-sm text-accent-700">{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose} disabled={downloading}>
            Cancel
          </Button>
          <Button type="button" onClick={handleDownload} disabled={downloading}>
            {downloading ? (
              <span className="flex items-center gap-2">
                <Spinner className="border-background/40 border-t-background" /> Downloading…
              </span>
            ) : (
              "Download .Xlsx"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
