"use client";

import { cn } from "@/lib/format";

/**
 * Header control for Mis planes: opens the dialog, shows which saved plan is
 * open (✓ saved, • changed since saving) and offers Guardar next to it. The
 * selection itself is always kept in the browser; this is about Mis planes.
 */
export function PlanControl({
  name,
  dirty,
  hasCourses,
  onOpen,
  onSave,
}: {
  /** Saved plan being edited; null when the selection isn't a saved plan. */
  name: string | null;
  dirty: boolean;
  hasCourses: boolean;
  onOpen: () => void;
  /** Overwrites the open plan, or asks for a name when there is none. */
  onSave: () => void;
}) {
  const status = !name ? "" : dirty ? ", cambios sin guardar" : ", guardado";
  const showSave = name ? dirty : hasCourses;

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <button
        type="button"
        onClick={onOpen}
        aria-haspopup="dialog"
        aria-label={name ? `Mis planes: ${name}${status}` : "Mis planes"}
        title={name ? `${name}${dirty ? " · cambios sin guardar" : " · guardado en Mis planes"}` : "Mis planes"}
        className="inline-flex h-8 min-w-0 items-center gap-1.5 rounded-full border border-border px-3 text-xs leading-none font-semibold text-fg-secondary transition hover:border-border-strong hover:text-fg"
      >
        <i className="bi bi-bookmark-star" aria-hidden="true"></i>
        {/* truncate clips to the line box, so it needs normal leading or "p" loses its tail. */}
        <span className={cn("hidden max-w-48 truncate leading-normal sm:block", name && "text-fg")}>
          {name ?? "Mis planes"}
        </span>
        {name &&
          (dirty ? (
            <span className="size-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true"></span>
          ) : (
            <i className="bi bi-check2 shrink-0 text-fg-muted" aria-hidden="true"></i>
          ))}
      </button>
      {showSave && (
        <button
          type="button"
          onClick={onSave}
          aria-label={name ? `Guardar cambios en ${name}` : "Guardar como plan"}
          title={name ? `Guardar cambios en ${name}` : "Guardar como plan en Mis planes"}
          className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-accent px-3 text-xs leading-none font-semibold text-on-accent transition hover:bg-accent-hover"
        >
          <i className="bi bi-floppy" aria-hidden="true"></i>
          <span className="hidden sm:inline">Guardar</span>
        </button>
      )}
    </div>
  );
}
