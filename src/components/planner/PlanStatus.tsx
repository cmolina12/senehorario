"use client";

/**
 * Which saved plan is open and whether the selection differs from it. The
 * selection itself is always kept in the browser; this is about Mis planes.
 */
export function PlanStatus({
  name,
  dirty,
  onSave,
}: {
  /** Saved plan being edited; null for a selection that isn't saved as a plan. */
  name: string | null;
  dirty: boolean;
  onSave: () => void;
}) {
  const saveButton = (
    <button
      type="button"
      onClick={onSave}
      className="inline-flex h-7 items-center gap-1 rounded-full bg-accent px-2.5 text-xs leading-none font-semibold text-on-accent transition hover:bg-accent-hover"
    >
      <i className="bi bi-bookmark-plus" aria-hidden="true"></i>
      Guardar
    </button>
  );

  if (!name) {
    return (
      <div className="flex min-w-0 items-center gap-2 text-xs" title="Guárdala en Mis planes para volver a ella o comparar versiones.">
        <span className="text-fg-muted">Plan sin guardar</span>
        {saveButton}
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-2 text-xs">
      <span className="truncate font-semibold text-fg" title={name}>
        {name}
      </span>
      {dirty ? (
        <>
          <span className="shrink-0 text-fg-muted">· Cambios sin guardar</span>
          {saveButton}
        </>
      ) : (
        <span className="inline-flex shrink-0 items-center gap-1 text-fg-muted" title="Guardado en Mis planes">
          <i className="bi bi-check2" aria-hidden="true"></i>
          Guardado
        </span>
      )}
    </div>
  );
}
