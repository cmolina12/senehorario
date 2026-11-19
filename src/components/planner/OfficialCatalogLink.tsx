"use client";

import { useState } from "react";
import { copyText } from "@/lib/clipboard";

export const OFFICIAL_CATALOG_URL = "https://ofertadecursos.uniandes.edu.co/";

/**
 * Small link to the university's course catalog, so students can check what
 * we show. The catalog has no links to a course, so the same click copies the
 * NRC to paste into its search box.
 */
export function OfficialCatalogLink({ nrc }: { nrc: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <p className="text-center text-xs text-fg-muted">
      <a
        href={OFFICIAL_CATALOG_URL}
        target="_blank"
        rel="noopener"
        // Start the copy before the new tab takes focus.
        onClick={() => {
          void copyText(nrc).then((ok) => setCopied(ok));
        }}
        title={`Abre la oferta oficial y copia el NRC ${nrc} para pegarlo en su buscador`}
        className="inline-flex items-center gap-1 font-semibold text-fg-secondary underline-offset-2 hover:text-fg hover:underline"
      >
        Verificar en la oferta oficial
        <i className="bi bi-box-arrow-up-right text-2xs" aria-hidden="true"></i>
      </a>
      <span role="status">{copied && ` · NRC ${nrc} copiado, pégalo en su buscador`}</span>
    </p>
  );
}
