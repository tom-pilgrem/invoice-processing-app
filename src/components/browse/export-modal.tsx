"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { plural } from "@/lib/format";

export function ExportModal({
  open,
  onClose,
  invoiceCount,
  lineItemCount,
  activeFilterLabel,
}: {
  open: boolean;
  onClose: () => void;
  invoiceCount: number;
  lineItemCount: number;
  activeFilterLabel: string;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

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

  function handleDownload() {
    // TODO(task 6): generate and download the .xlsx export for the current filters.
    onClose();
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
          Exporting {plural(invoiceCount, "Invoice")}, {plural(lineItemCount, "Line Item")},{" "}
          {activeFilterLabel}.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleDownload}>
            Download .Xlsx
          </Button>
        </div>
      </div>
    </div>
  );
}
