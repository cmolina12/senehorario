"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/format";
import { usePresence } from "@/lib/use-presence";
import { EmptyState, IconButton } from "@/components/ui";
import { persistSavedPlans, toSnapshot, type PlanSnapshot, type SavedPlans } from "@/lib/storage";

interface Props {
  open: boolean;
  plans: SavedPlans;
  onPlansChange: (plans: SavedPlans) => void;
  currentSnapshot: () => PlanSnapshot;
  canSave: boolean;
  onLoad: (name: string, snapshot: PlanSnapshot) => void;
  /** The saved plan currently open, marked in the list. */
  activePlan: string | null;
  /** The current selection was saved under this name. */
  onSaved: (name: string) => void;
  onRemoved: (name: string) => void;
  onClose: () => void;
}

function planCourses(snapshot: PlanSnapshot): string {
  const codes = Object.keys(snapshot.selectedCoursesMeta ?? {});
  return codes.length > 0 ? codes.join(", ") : "Sin cursos";
}

function planDate(snapshot: PlanSnapshot): string {
  if (!snapshot.savedAt) return "";
  const date = new Date(snapshot.savedAt);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

export function PlansModal({
  open,
  plans,
  onPlansChange,
  currentSnapshot,
  canSave,
  onLoad,
  activePlan,
  onSaved,
  onRemoved,
  onClose,
}: Props) {
  const { rendered, closing } = usePresence(open ? true : null);
  const [name, setName] = useState("");
  const [importError, setImportError] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const update = (next: SavedPlans) => {
    onPlansChange(next);
    persistSavedPlans(next);
  };

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    update({ ...plans, [trimmed]: { ...currentSnapshot(), savedAt: new Date().toISOString() } });
    onSaved(trimmed);
    setName("");
  };

  const remove = (planName: string) => {
    const next = { ...plans };
    delete next[planName];
    update(next);
    onRemoved(planName);
  };

  const exportPlan = (planName: string) => {
    const snapshot = plans[planName];
    if (!snapshot) return;
    const blob = new Blob([JSON.stringify({ name: planName, ...snapshot }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `senehorario-${planName.replace(/\s+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importPlan = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setImportError("");
    const input = event.target;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const snapshot = toSnapshot(data);
      if (!snapshot) {
        setImportError("Archivo inválido: no es un plan de Senéhorario.");
        return;
      }
      const planName = data.name || file.name.replace(/\.json$/i, "");
      update({ ...plans, [planName]: { ...snapshot, savedAt: snapshot.savedAt || new Date().toISOString() } });
    } catch {
      setImportError("No se pudo leer el archivo. Verifica que sea un JSON válido.");
    }
  };

  const names = Object.keys(plans);

  if (!rendered) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4",
        closing && "pointer-events-none",
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="plans-title"
    >
      <div
        className={cn("absolute inset-0 bg-black/40 backdrop-blur-[1px]", closing ? "animate-fade-out" : "animate-fade-in")}
        onClick={onClose}
      />
      <div
        className={cn(
          "relative flex max-h-[85dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-surface shadow-2xl sm:max-w-lg sm:rounded-2xl",
          closing ? "animate-sheet-out sm:animate-pop-out" : "animate-sheet-in sm:animate-pop-in",
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 id="plans-title" className="text-base font-extrabold tracking-tight">
              Mis planes
            </h2>
            <p className="text-xs text-fg-muted">Se guardan en este navegador. Descárgalos para llevarlos a otro.</p>
          </div>
          <IconButton icon="bi-x-lg" label="Cerrar" className="-mr-2" onClick={onClose} />
        </div>

        <div className="space-y-5 overflow-y-auto px-5 py-4">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <input
              type="text"
              autoFocus
              className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 text-sm placeholder:text-fg-muted focus:border-accent focus:ring-3 focus:ring-accent/25 focus:outline-none"
              placeholder={canSave ? "Nombre para el plan actual" : "Agrega cursos para guardar un plan"}
              aria-label="Nombre del plan"
              value={name}
              disabled={!canSave}
              onChange={(e) => setName(e.target.value)}
            />
            <button
              type="submit"
              disabled={!canSave || !name.trim()}
              className="h-10 shrink-0 rounded-lg bg-accent px-4 text-sm font-semibold text-on-accent transition hover:bg-accent-hover disabled:opacity-50"
            >
              Guardar
            </button>
          </form>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold tracking-wide text-fg-muted uppercase">Guardados</h3>
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-fg-secondary transition hover:bg-surface-hover hover:text-fg">
                <i className="bi bi-upload" aria-hidden="true"></i> Importar
                <input type="file" accept=".json,application/json" onChange={importPlan} className="sr-only" />
              </label>
            </div>
            {importError && <p className="mb-2 text-xs text-danger">{importError}</p>}

            {names.length === 0 ? (
              <EmptyState icon="bi-bookmark" title="No hay planes guardados aún" />
            ) : (
              <ul className="divide-y divide-border rounded-xl border border-border">
                {names.map((planName) => (
                  <li key={planName} className="flex items-center gap-2 py-2 pr-2 pl-3">
                    <button
                      type="button"
                      onClick={() => onLoad(planName, plans[planName])}
                      className="min-w-0 flex-1 rounded-lg py-1 text-left"
                      title="Cargar plan"
                    >
                      <p className="flex items-center gap-1.5 text-sm font-semibold">
                        <span className="truncate">{planName}</span>
                        {planName === activePlan && (
                          <span className="shrink-0 rounded-full bg-accent-soft px-1.5 text-2xs leading-4 font-semibold text-fg">
                            Abierto
                          </span>
                        )}
                      </p>
                      <p className="truncate text-xs text-fg-muted">
                        {planCourses(plans[planName])}
                        {planDate(plans[planName]) && ` · ${planDate(plans[planName])}`}
                      </p>
                    </button>
                    <IconButton icon="bi-folder2-open" label="Cargar" onClick={() => onLoad(planName, plans[planName])} />
                    <IconButton icon="bi-download" label="Descargar" onClick={() => exportPlan(planName)} />
                    <IconButton
                      icon="bi-trash3"
                      label="Eliminar"
                      className="hover:text-danger"
                      onClick={() => remove(planName)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
