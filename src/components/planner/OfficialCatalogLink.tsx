"use client";

import { useState } from "react";
import { copyText } from "@/lib/clipboard";
import { cn } from "@/lib/format";

export const OFFICIAL_CATALOG_URL = "https://ofertadecursos.uniandes.edu.co/";

/**
 * Opens the university's course catalog so students can check what we show.
 * The catalog has no links to a course, so the same click copies the NRC to
 * paste into its search box; the hint says so before and after clicking.
 */
export function OfficialCatalogLink({ nrc, className }: { nrc: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className={cn("space-y-1.5", className)}>
      <a
        href={OFFICIAL_CATALOG_URL}
        target="_blank"
        rel="noopener"
        // Start the copy before the new tab takes focus.
        onClick={() => {
          void copyText(nrc).then((ok) => setCopied(ok));
        }}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-fg-secondary transition hover:border-border-strong hover:text-fg"
      >
        <i className="bi bi-patch-check" aria-hidden="true"></i>
        Verificar en la oferta oficial
        <i className="bi bi-box-arrow-up-right text-xs" aria-hidden="true"></i>
      </a>
      <p className="text-center text-xs text-fg-muted" role="status">
        {copied ? (
          <>
            <i className="bi bi-check2 text-success" aria-hidden="true"></i> NRC {nrc} copiado. Pégalo en el
            buscador de la oferta.
          </>
        ) : (
          <>Copiamos el NRC {nrc} al abrirla: pégalo en su buscador.</>
        )}
      </p>
    </div>
  );
}
