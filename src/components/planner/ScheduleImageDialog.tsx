"use client";

import { useEffect, useState } from "react";
import { IconButton } from "@/components/ui";
import { cn } from "@/lib/format";
import { buildImageModel } from "@/lib/schedule-image";
import { renderScheduleImage, type ImageFormat } from "@/lib/schedule-image-draw";
import { formatTerm } from "@/lib/terms";
import type { ScheduledSection } from "@/lib/types";
import { usePresence } from "@/lib/use-presence";

interface Props {
  open: boolean;
  onClose: () => void;
  schedule: ScheduledSection[];
  courseOrder: string[];
  term: string;
  optionNumber: number;
  credits: number;
}

const FORMATS: { value: ImageFormat; label: string; hint: string }[] = [
  { value: "story", label: "Historia", hint: "9:16" },
  { value: "wide", label: "Horizontal", hint: "16:10" },
];

/** Preview and share/copy/download a PNG of the option on screen. */
export function ScheduleImageDialog({ open, onClose, schedule, courseOrder, term, optionNumber, credits }: Props) {
  const { rendered, closing } = usePresence(open ? true : null);
  const [format, setFormat] = useState<ImageFormat>("story");
  const [includeNrcs, setIncludeNrcs] = useState(false);
  const [image, setImage] = useState<{ blob: Blob; url: string } | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Re-render whenever the inputs change; drop results that arrive late.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const model = buildImageModel(schedule, courseOrder, { includeNrcs });
    const header = { term: formatTerm(term), option: optionNumber, courses: model.legend.length, credits };
    renderScheduleImage(model, header, format)
      .then((canvas) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png")))
      .then((blob) => {
        if (cancelled || !blob) return;
        const url = URL.createObjectURL(blob);
        // Keep showing the previous preview until this one is ready.
        setImage((previous) => {
          if (previous) URL.revokeObjectURL(previous.url);
          return { blob, url };
        });
      });
    return () => {
      cancelled = true;
    };
  }, [open, schedule, courseOrder, term, optionNumber, credits, format, includeNrcs]);

  const fileName = `senehorario-${term}-opcion-${optionNumber}.png`;
  const file = image ? new File([image.blob], fileName, { type: "image/png" }) : null;
  const canShare = !!file && typeof navigator !== "undefined" && !!navigator.canShare?.({ files: [file] });
  const canCopy = typeof window !== "undefined" && "ClipboardItem" in window && !!navigator.clipboard?.write;

  const flash = (message: string) => {
    setStatus(message);
    setTimeout(() => setStatus((s) => (s === message ? "" : s)), 2000);
  };

  const share = async () => {
    if (!file) return;
    try {
      await navigator.share({ files: [file], title: "Mi horario en Senéhorario" });
    } catch {
      // Cancelled by the user.
    }
  };

  const copy = async () => {
    if (!image) return;
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": image.blob })]);
      flash("Imagen copiada");
    } catch {
      flash("No se pudo copiar. Usa Descargar.");
    }
  };

  const download = () => {
    if (!image) return;
    const a = document.createElement("a");
    a.href = image.url;
    a.download = fileName;
    a.click();
  };

  if (!rendered) return null;

  const action =
    "inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition disabled:opacity-50";

  return (
    <div
      className={cn("fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4", closing && "pointer-events-none")}
      role="dialog"
      aria-modal="true"
      aria-labelledby="image-title"
    >
      <div
        className={cn("absolute inset-0 bg-black/40 backdrop-blur-[1px]", closing ? "animate-fade-out" : "animate-fade-in")}
        onClick={onClose}
      />
      <div
        className={cn(
          "relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-surface shadow-2xl sm:max-w-md sm:rounded-2xl",
          closing ? "animate-sheet-out sm:animate-pop-out" : "animate-sheet-in sm:animate-pop-in",
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 id="image-title" className="text-base font-extrabold tracking-tight">
              Imagen de tu horario
            </h2>
            <p className="text-xs text-fg-muted">Opción {optionNumber} · {formatTerm(term)}</p>
          </div>
          <IconButton icon="bi-x-lg" label="Cerrar" className="-mr-2" onClick={onClose} />
        </div>

        <div className="space-y-4 overflow-y-auto px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex rounded-xl bg-surface-inset p-1" role="radiogroup" aria-label="Formato">
              {FORMATS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  role="radio"
                  aria-checked={format === f.value}
                  onClick={() => setFormat(f.value)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                    format === f.value ? "bg-surface text-fg shadow-sm" : "text-fg-secondary hover:text-fg",
                  )}
                >
                  {f.label} <span className="font-normal text-fg-muted">{f.hint}</span>
                </button>
              ))}
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-fg-secondary">
              <input
                type="checkbox"
                checked={includeNrcs}
                onChange={(e) => setIncludeNrcs(e.target.checked)}
                className="size-4 accent-[var(--accent)]"
              />
              Incluir NRCs
            </label>
          </div>

          <div className="grid place-items-center rounded-xl border border-border bg-surface-alt p-3">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image.url}
                alt={`Vista previa del horario, opción ${optionNumber}`}
                className={cn("rounded-lg shadow-sm", format === "story" ? "max-h-[46dvh] w-auto" : "w-full")}
              />
            ) : (
              <div className={cn("animate-pulse rounded-lg bg-surface-inset", format === "story" ? "h-[46dvh] w-[26dvh]" : "aspect-[16/10] w-full")} />
            )}
          </div>

          <div className="flex gap-2">
            {canShare && (
              <button type="button" onClick={share} className={cn(action, "bg-accent text-on-accent hover:bg-accent-hover")}>
                <i className="bi bi-box-arrow-up" aria-hidden="true"></i> Compartir
              </button>
            )}
            {canCopy && (
              <button
                type="button"
                onClick={copy}
                disabled={!image}
                className={cn(
                  action,
                  canShare ? "border border-border hover:border-border-strong" : "bg-accent text-on-accent hover:bg-accent-hover",
                )}
              >
                <i className="bi bi-clipboard" aria-hidden="true"></i> Copiar
              </button>
            )}
            <button
              type="button"
              onClick={download}
              disabled={!image}
              className={cn(action, "border border-border hover:border-border-strong")}
            >
              <i className="bi bi-download" aria-hidden="true"></i> Descargar
            </button>
          </div>
          <p className="min-h-4 text-center text-xs text-fg-muted" role="status">
            {status}
          </p>
        </div>
      </div>
    </div>
  );
}
