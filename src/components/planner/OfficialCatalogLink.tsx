"use client";

import { useState } from "react";
import { copyText } from "@/lib/clipboard";
import { cn } from "@/lib/format";

export const OFFICIAL_CATALOG_URL = "https://ofertadecursos.uniandes.edu.co/";

/**
 * Opens the university's course catalog so students can check what we show.
 * The catalog has no links to a course, so the same click copies the code or
 * NRC to paste into its search box.
 */
export function OfficialCatalogLink({
  query,
  what,
  className,
}: {
  /** Code or NRC to look up. */
  query: string;
  /** "el código" / "el NRC", for the hint. */
  what: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <a
      href={OFFICIAL_CATALOG_URL}
      target="_blank"
      rel="noopener"
      // Start the copy before the new tab takes focus.
      onClick={() => {
        void copyText(query).then((ok) => setCopied(ok));
      }}
      title={`Abre la oferta oficial y copia ${what} ${query} para pegarlo en su buscador`}
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-semibold text-fg-secondary underline-offset-2 transition hover:text-fg hover:underline",
        className,
      )}
    >
      <i className="bi bi-patch-check" aria-hidden="true"></i>
      Ver en la oferta oficial
      <i className="bi bi-box-arrow-up-right text-2xs" aria-hidden="true"></i>
      {copied && (
        <span className="font-normal text-fg-muted" role="status">
          · {query} copiado, pégalo en el buscador
        </span>
      )}
    </a>
  );
}
