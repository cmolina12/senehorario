"use client";

import { useDismissable } from "@/components/ui";
import { cn } from "@/lib/format";
import { formatTerm } from "@/lib/terms";

const LOCKED_HINT = "Quita tus cursos para cambiar de periodo: un horario no puede mezclar periodos.";

/** The period the whole planner works on (search, CBUs, calendar). */
export function PeriodMenu({
  terms,
  active,
  locked,
  onChange,
}: {
  terms: string[];
  active: string;
  /** A non-empty selection pins the period. */
  locked: boolean;
  onChange: (term: string) => void;
}) {
  const { open, setOpen, ref, rendered, closing } = useDismissable();
  const canChange = !locked && terms.length > 1;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup={canChange ? "listbox" : undefined}
        aria-expanded={canChange ? open : undefined}
        aria-disabled={!canChange}
        aria-label={`Periodo ${formatTerm(active)}${locked ? ", fijo mientras tengas cursos" : ""}`}
        title={locked && terms.length > 1 ? LOCKED_HINT : undefined}
        onClick={() => canChange && setOpen((o) => !o)}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-xs leading-none font-semibold whitespace-nowrap text-fg-secondary transition",
          canChange ? "hover:border-border-strong hover:text-fg" : "cursor-default",
        )}
      >
        <i className="bi bi-calendar3" aria-hidden="true"></i>
        {formatTerm(active)}
        {canChange && (
          <i className={cn("bi bi-chevron-down text-2xs transition-transform", open && "rotate-180")} aria-hidden="true"></i>
        )}
        {locked && terms.length > 1 && <i className="bi bi-lock-fill text-2xs text-fg-muted" aria-hidden="true"></i>}
      </button>
      {rendered && (
        <div
          role="listbox"
          aria-label="Periodo"
          className={cn(
            "absolute top-full left-0 z-30 mt-1 min-w-40 origin-top-left rounded-xl border border-border bg-surface py-1 shadow-lg shadow-black/10",
            closing ? "pointer-events-none animate-pop-out" : "animate-pop-in",
          )}
        >
          {terms.map((t) => (
            <button
              key={t}
              type="button"
              role="option"
              aria-selected={t === active}
              onClick={() => {
                setOpen(false);
                onChange(t);
              }}
              className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm whitespace-nowrap text-fg transition hover:bg-surface-hover"
            >
              {formatTerm(t)}
              {t === active && <i className="bi bi-check-lg text-fg-secondary" aria-hidden="true"></i>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
