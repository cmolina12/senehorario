"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as api from "@/lib/api";
import { CBU_AREA_FILTERS, CBU_ATTR_FILTERS } from "@/lib/format";
import { fitsInSchedule } from "@/lib/scheduler";
import { coursesInTerm } from "@/lib/terms";
import { sectionKey, type Course, type Section } from "@/lib/types";
import { SectionItem } from "./SectionItem";

/** Loads the CBU catalog once `enabled` becomes true and keeps it for the session. */
export function useCbus(enabled: boolean) {
  const [cbus, setCbus] = useState<Course[] | null>(null);
  const [error, setError] = useState("");
  const requested = useRef(false);

  useEffect(() => {
    if (!enabled || requested.current) return;
    requested.current = true;
    api
      .getCBUs()
      .then(setCbus)
      .catch(() => setError("No se pudieron cargar los CBUs. Por favor, intenta de nuevo."));
  }, [enabled]);

  return { cbus: cbus ?? [], loading: enabled && cbus === null && !error, error };
}

interface Props {
  cbuState: ReturnType<typeof useCbus>;
  term: string | null;
  optionNumber: number;
  schedule: Section[];
  isSectionSelected: (courseCode: string, section: Section) => boolean;
  onToggleSection: (course: Course, section: Section) => void;
}

export function CbuPanel({ cbuState, term, optionNumber, schedule, isSectionSelected, onToggleSection }: Props) {
  const { cbus, loading, error } = cbuState;
  const [attrFilters, setAttrFilters] = useState<string[]>([]);
  const [areaFilter, setAreaFilter] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const fitting = useMemo(
    () =>
      coursesInTerm(cbus, term)
        .filter((course) => !areaFilter || course.code.startsWith(`CBU${areaFilter}`))
        .map((course) => ({
          ...course,
          sections: course.sections.filter(
            (s) =>
              fitsInSchedule(s, schedule) &&
              (attrFilters.length === 0 || attrFilters.some((f) => s.attrs?.includes(f))),
          ),
        }))
        .filter((course) => course.sections.length > 0),
    [cbus, term, schedule, areaFilter, attrFilters],
  );

  const toggleAttr = (code: string) =>
    setAttrFilters((f) => (f.includes(code) ? f.filter((x) => x !== code) : [...f, code]));

  return (
    <section className="cbu-section">
      <div className="panel cbu-panel">
        <div className="panel-header">
          <div className="d-flex align-items-center gap-2">
            <span className="panel-title">CBUs que encajan en Opción {optionNumber}</span>
            {!loading && cbus.length > 0 && (
              <span className="count-badge">
                {fitting.length} {fitting.length === 1 ? "curso" : "cursos"}
              </span>
            )}
          </div>
          {loading && (
            <div className="d-flex align-items-center gap-2">
              <div className="spinner-border spinner-border-sm text-secondary" role="status"></div>
              <span className="panel-title" style={{ textTransform: "none", fontWeight: 400 }}>
                Cargando CBUs...
              </span>
            </div>
          )}
        </div>
        <div className="panel-body cbu-body">
          {/* Filters */}
          <div className="cbu-filters">
            <div className="filter-row">
              <span className="filter-label">Tipo</span>
              <div className="filter-chips">
                {CBU_ATTR_FILTERS.map((f) => (
                  <button
                    key={f.code}
                    className={`filter-chip${attrFilters.includes(f.code) ? " active" : ""}`}
                    onClick={() => toggleAttr(f.code)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="filter-row">
              <span className="filter-label">Área</span>
              <div className="filter-chips">
                {CBU_AREA_FILTERS.map((f) => (
                  <button
                    key={f.value}
                    className={`filter-chip${areaFilter === f.value ? " active" : ""}`}
                    onClick={() => setAreaFilter((a) => (a === f.value ? "" : f.value))}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            {(attrFilters.length > 0 || areaFilter) && (
              <button
                className="btn-clear-filters"
                onClick={() => {
                  setAttrFilters([]);
                  setAreaFilter("");
                }}
              >
                <i className="bi bi-x-circle"></i> Limpiar filtros
              </button>
            )}
          </div>

          {error && (
            <div className="status-message error">
              <i className="bi bi-exclamation-circle"></i>
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && cbus.length === 0 && (
            <div className="status-message muted">
              <i className="bi bi-journal-x"></i>
              <span>No se encontraron CBUs disponibles</span>
            </div>
          )}

          {!loading && !error && cbus.length > 0 && fitting.length === 0 && (
            <div className="status-message muted">
              <i className="bi bi-calendar-x"></i>
              <span>No hay CBUs que encajen en este horario con los filtros seleccionados</span>
            </div>
          )}

          {!loading && !error && fitting.length > 0 && (
            <div className="cbu-courses-grid">
              {fitting.map((course) => (
                <div key={course.code} className="course-item">
                  <div
                    className="course-header"
                    onClick={() => setExpanded((x) => ({ ...x, [course.code]: !x[course.code] }))}
                  >
                    <div className="course-info">
                      <span className="course-code">{course.code}</span>
                      <span className="course-credits">{course.credits} créditos</span>
                      <span className="cbu-section-count">
                        {course.sections.length} {course.sections.length === 1 ? "sección" : "secciones"}
                      </span>
                    </div>
                    <i className={`bi ${expanded[course.code] ? "bi-chevron-up" : "bi-chevron-down"}`}></i>
                  </div>
                  <div className="course-title">{course.title}</div>

                  {expanded[course.code] && (
                    <div className="sections-list">
                      {course.sections.map((section) => (
                        <SectionItem
                          key={sectionKey(section)}
                          variant="cbu"
                          section={section}
                          selected={isSectionSelected(course.code, section)}
                          onToggle={() => onToggleSection(course, section)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
