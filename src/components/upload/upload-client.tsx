"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tag, StatusDot } from "@/components/ui/tag";
import { Spinner } from "@/components/ui/spinner";

type QueueStatus = "queued" | "processing" | "done" | "review";

type QueueItem = {
  id: string;
  file: File;
  status: QueueStatus;
  vendor?: string | null;
  invoiceId?: string;
};

const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const ACCEPTED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];
const MAX_FILES = 20;
const MAX_SIZE_BYTES = 15 * 1024 * 1024;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadClient() {
  const router = useRouter();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [rejectionMessage, setRejectionMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const updateItem = useCallback((id: string, patch: Partial<QueueItem>) => {
    setQueue((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  const processFile = useCallback(
    async (item: QueueItem) => {
      updateItem(item.id, { status: "processing" });

      const formData = new FormData();
      formData.append("file", item.file);

      try {
        const res = await fetch("/api/invoices/extract", { method: "POST", body: formData });
        const data = await res.json();

        if (!res.ok || !data.ok) {
          updateItem(item.id, { status: "review" });
          return;
        }

        updateItem(item.id, {
          status: data.status,
          vendor: data.vendor,
          invoiceId: data.invoiceId,
        });
      } catch {
        updateItem(item.id, { status: "review" });
      }
    },
    [updateItem],
  );

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const incoming = Array.from(files);
      const accepted: File[] = [];
      let rejected = false;

      for (const file of incoming) {
        const isAcceptedType =
          ACCEPTED_TYPES.includes(file.type) ||
          ACCEPTED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext));
        if (!isAcceptedType || file.size > MAX_SIZE_BYTES) {
          rejected = true;
          continue;
        }
        accepted.push(file);
      }

      setRejectionMessage(
        rejected ? "Some files were skipped — only PDF/JPG/PNG under 15MB are supported." : null,
      );

      if (accepted.length === 0) return;

      setQueue((prev) => {
        const room = Math.max(0, MAX_FILES - prev.length);
        const toAdd: QueueItem[] = accepted.slice(0, room).map((file) => ({
          id: crypto.randomUUID(),
          file,
          status: "queued",
        }));
        toAdd.forEach((item) => processFile(item));
        return [...prev, ...toAdd];
      });
    },
    [processFile],
  );

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) addFiles(e.target.files);
    e.target.value = "";
  }

  const isSettled = (status: QueueStatus) => status === "done" || status === "review";
  const allSettled = queue.length > 0 && queue.every((item) => isSettled(item.status));

  function handleContinue() {
    const reviewIds = queue
      .filter((item) => item.status === "review" && item.invoiceId)
      .map((item) => item.invoiceId as string);

    if (reviewIds.length > 0) {
      router.push(`/review?ids=${reviewIds.join(",")}`);
    } else {
      router.push("/browse");
    }
  }

  return (
    <div className="max-w-[880px] p-8 pl-12">
      <h1 className="text-2xl font-extrabold">Upload Invoices</h1>
      <p className="mt-2 mb-6 text-sm text-foreground/65">
        Drop PDFs or images, or browse to select files. Multiple files at once.
      </p>

      <div
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={[
          "flex cursor-pointer flex-col items-center gap-3 border-2 border-dashed p-8 text-center transition-colors",
          dragActive ? "border-accent-500 bg-accent-100" : "border-divider",
        ].join(" ")}
      >
        <h3 className="text-lg font-extrabold">Drag And Drop Files Here</h3>
        <p className="text-[13px] text-foreground/60">PDF or image · multiple files at once</p>
        <Button
          type="button"
          variant="secondary"
          onClick={(e) => {
            e.stopPropagation();
            inputRef.current?.click();
          }}
        >
          Browse Files
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
          onChange={handleInputChange}
          className="hidden"
        />
      </div>

      {rejectionMessage && <p className="mt-3 text-sm text-accent-700">{rejectionMessage}</p>}

      {queue.length > 0 && (
        <div className="mt-6">
          <p className="mb-3 text-[11px] tracking-[0.08em] text-foreground/55 uppercase">Queue</p>
          {queue.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between border-b border-divider py-3"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-sm">{item.file.name}</span>
                <span className="text-xs text-foreground/55">{formatSize(item.file.size)}</span>
              </div>
              <div className="flex items-center gap-2 text-[13px]">
                {item.status === "queued" && <Tag variant="neutral">Queued</Tag>}
                {item.status === "processing" && (
                  <>
                    <Spinner />
                    <span>Processing</span>
                  </>
                )}
                {item.status === "done" && <Tag variant="neutral">Done</Tag>}
                {item.status === "review" && (
                  <>
                    <StatusDot />
                    <Tag variant="accent">Needs Review</Tag>
                  </>
                )}
              </div>
            </div>
          ))}

          <div className="mt-6 flex justify-end">
            <Button type="button" disabled={!allSettled} onClick={handleContinue}>
              Continue
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
