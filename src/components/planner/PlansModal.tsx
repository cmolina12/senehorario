"use client";

import { useState } from "react";
import { persistSavedPlans, toSnapshot, type PlanSnapshot, type SavedPlans } from "@/lib/storage";

interface Props {
  plans: SavedPlans;
  onPlansChange: (plans: SavedPlans) => void;
  currentSnapshot: () => PlanSnapshot;
  onLoad: (snapshot: PlanSnapshot) => void;
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

export function PlansModal({ plans, onPlansChange, currentSnapshot, onLoad, onClose }: Props) {
  const [name, setName] = useState("");
  const [importError, setImportError] = useState("");

  const update = (next: SavedPlans) => {
    onPlansChange(next);
    persistSavedPlans(next);
  };

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    update({ ...plans, [trimmed]: { ...currentSnapshot(), savedAt: new Date().toISOString() } });
    setName("");
  };

  const remove = (planName: string) => {
    const next = { ...plans };
    delete next[planName];
    update(next);
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
        setImportError("Archivo inválido: no es un plan de Senehorario.");
        return;
      }
      const planName = data.name || file.name.replace(/\.json$/i, "");
      update({ ...plans, [planName]: { ...snapshot, savedAt: snapshot.savedAt || new Date().toISOString() } });
    } catch {
      setImportError("No se pudo leer el archivo. Verifica que sea un JSON válido.");
    }
  };

  const names = Object.keys(plans);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Mis Planes</span>
          <button className="modal-close" onClick={onClose}>
            <i className="bi bi-x-lg"></i>
          </button>
        </div>
        <div className="modal-body">
          {/* Save current plan */}
          <div className="plans-save-section">
            <div className="plans-save-row">
              <input
                type="text"
                className="form-control"
                placeholder="Nombre del plan..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyUp={(e) => e.key === "Enter" && save()}
              />
              <button className="btn-search" onClick={save} disabled={!name.trim()}>
                Guardar
              </button>
            </div>
          </div>

          <div className="plans-divider">
            <span>Planes guardados</span>
          </div>

          {/* Import */}
          <div className="plans-import-row">
            <label className="btn-import" htmlFor="plan-import-input">
              <i className="bi bi-upload"></i> Importar plan
            </label>
            <input
              type="file"
              id="plan-import-input"
              accept=".json"
              onChange={importPlan}
              style={{ display: "none" }}
            />
            {importError && <span className="plan-feedback plan-error">{importError}</span>}
          </div>

          {/* Saved plans list */}
          {names.length === 0 ? (
            <div className="status-message muted">
              <i className="bi bi-bookmark"></i>
              <span>No hay planes guardados aún</span>
            </div>
          ) : (
            <div className="plans-list">
              {names.map((planName) => (
                <div key={planName} className="plan-item">
                  <div className="plan-info">
                    <span className="plan-name">{planName}</span>
                    <span className="plan-meta">
                      {planCourses(plans[planName])} · {planDate(plans[planName])}
                    </span>
                  </div>
                  <div className="plan-actions">
                    <button className="btn-plan-action" onClick={() => onLoad(plans[planName])} title="Cargar plan">
                      <i className="bi bi-folder2-open"></i>
                    </button>
                    <button className="btn-plan-action" onClick={() => exportPlan(planName)} title="Descargar">
                      <i className="bi bi-download"></i>
                    </button>
                    <button className="btn-plan-action danger" onClick={() => remove(planName)} title="Eliminar">
                      <i className="bi bi-trash"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
