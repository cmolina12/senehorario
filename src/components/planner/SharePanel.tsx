"use client";

import { useState } from "react";
import { Popover } from "@/components/ui";
import { copyText } from "@/lib/clipboard";
import { cn } from "@/lib/format";
import { buildIcs } from "@/lib/ics";
import { formatTerm } from "@/lib/terms";
import type { ScheduledSection } from "@/lib/types";

interface Props {
  shareQuery: string;
  schedule: ScheduledSection[];
  term: string;
  optionNumber: number;
}

/** Share link for the plan and a calendar (.ics) download of the option on screen. */
export function SharePanel({ shareQuery, schedule, term, optionNumber }: Props) {
  const [copied, setCopied] = useState(false);
  const [icsNote, setIcsNote] = useState("");
  const url = typeof window === "undefined" ? "" : `${window.location.origin}/planning?${shareQuery}`;
  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const copyLink = async () => {
    if (await copyText(url)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ title: "Mi horario en Senéhorario", url });
    } catch {
      // Cancelled by the user; nothing to do.
    }
  };

  const downloadIcs = () => {
    const { content, skipped } = buildIcs(schedule, `Senéhorario ${formatTerm(term)}`);
    const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = `senehorario-${term}-opcion-${optionNumber}.ics`;
    a.click();
    URL.revokeObjectURL(href);
    setIcsNote(
      skipped > 0
        ? `${skipped} ${skipped === 1 ? "clase no tiene" : "clases no tienen"} fechas en la oferta y no se incluyeron.`
        : "",
    );
  };

  return (
    <Popover icon="bi-share" label="Compartir" panelClassName="w-[22rem]">
      <div className="space-y-5">
        <section>
          <p className="text-sm font-semibold">Enlace al plan</p>
          <p className="mt-0.5 text-xs text-fg-muted">
            Abre el mismo plan en otro dispositivo o envíaselo a alguien. Se carga con los cupos y horarios del
            momento.
          </p>
          <div className="mt-2 flex gap-1.5">
            <input
              type="text"
              readOnly
              value={url}
              aria-label="Enlace al plan"
              onFocus={(e) => e.target.select()}
              className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-surface-alt px-2.5 text-xs text-fg-secondary focus:border-accent focus:outline-none"
            />
            <button
              type="button"
              onClick={copyLink}
              className={cn(
                "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition",
                copied ? "bg-success/15 text-success" : "bg-accent text-on-accent hover:bg-accent-hover",
              )}
            >
              <i className={cn("bi", copied ? "bi-check-lg" : "bi-link-45deg")} aria-hidden="true"></i>
              {copied ? "Copiado" : "Copiar"}
            </button>
          </div>
          {canNativeShare && (
            <button
              type="button"
              onClick={nativeShare}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-fg-secondary hover:text-fg"
            >
              <i className="bi bi-box-arrow-up" aria-hidden="true"></i> Compartir con otra app…
            </button>
          )}
        </section>

        <section>
          <p className="text-sm font-semibold">Agregar a mi calendario</p>
          <p className="mt-0.5 text-xs text-fg-muted">
            Descarga la opción {optionNumber} como clases semanales para Google Calendar, Calendario de Apple u
            Outlook. No descuenta festivos.
          </p>
          <button
            type="button"
            onClick={downloadIcs}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-semibold transition hover:border-border-strong"
          >
            <i className="bi bi-calendar-plus" aria-hidden="true"></i> Descargar archivo .ics
          </button>
          {icsNote && <p className="mt-2 text-xs text-warning">{icsNote}</p>}
        </section>
      </div>
    </Popover>
  );
}
