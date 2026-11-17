"use client";

import { COURSE_COLORS } from "@/lib/calendar-events";
import { titleCase } from "@/lib/format";
import { sectionKey, type Section } from "@/lib/types";
import { MeetingBadges } from "./MeetingBadges";
import type { Selection } from "./usePlanner";

interface Props {
  selection: Selection;
  totalCredits: number;
  activeCode: string | null;
  onActiveChange: (code: string | null) => void;
  onSearchFor: (code: string) => void;
  onRemoveSection: (courseCode: string, section: Section) => void;
}

export function SelectedCoursesPanel({
  selection,
  totalCredits,
  activeCode,
  onActiveChange,
  onSearchFor,
  onRemoveSection,
}: Props) {
  const codes = Object.keys(selection.sections);

  return (
    <div className="panel selected-panel">
      <div className="panel-header">
        <span className="panel-title">Cursos seleccionados</span>
        {codes.length > 0 && (
          <div className="d-flex align-items-center gap-2">
            <span className="count-badge">
              {codes.length} {codes.length > 1 ? "cursos" : "curso"}
            </span>
            <span className="credits-badge">
              {totalCredits} {totalCredits > 1 ? "créditos" : "crédito"}
            </span>
          </div>
        )}
      </div>
      <div className="panel-body">
        {codes.length === 0 ? (
          <div className="status-message muted">
            <i className="bi bi-bookmark"></i>
            <span>No hay cursos seleccionados aun</span>
          </div>
        ) : (
          <>
          <div className="lab-reminder">
            <i className="bi bi-info-circle"></i>
            <span>
              Recuerda verificar si tus cursos requieren un laboratorio o curso complementario e
              inscribirlo también en Banner.
            </span>
          </div>
          <div className="selected-courses-grid">
            {codes.map((code, idx) => {
              const sections = selection.sections[code];
              const meta = selection.meta[code];
              return (
                <div
                  key={code}
                  className={`selected-course-card${activeCode === code ? " active" : ""}`}
                  onClick={() => onActiveChange(activeCode === code ? null : code)}
                >
                  <div className="selected-card-header">
                    <div className="selected-code-wrapper">
                      <span
                        className="course-color-indicator"
                        style={{ backgroundColor: COURSE_COLORS[idx % COURSE_COLORS.length] }}
                      ></span>
                      <span className="selected-code">{code}</span>
                    </div>
                    <div className="selected-card-meta">
                      <span className="selected-count">
                        {sections.length} {sections.length === 1 ? "sección" : "secciones"}
                      </span>
                      <i
                        className="bi bi-search search-icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSearchFor(code);
                        }}
                        title="Buscar este curso"
                      ></i>
                    </div>
                  </div>
                  <div className="selected-title">{meta?.title || "No disponible"}</div>
                  <div className="selected-credits">{meta?.credits ?? "N/A"} creditos</div>

                  {activeCode === code && (
                    <div className="selected-sections">
                      {sections.map((section) => (
                        <div key={sectionKey(section)} className="selected-section-item">
                          <div className="selected-section-header">
                            <div className="selected-section-meta">
                              <span className="selected-section-id">Sección {section.sectionId}</span>
                              <span className="selected-section-nrc">NRC {section.nrc}</span>
                            </div>
                            <button
                              type="button"
                              className="remove-section-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemoveSection(code, section);
                              }}
                              aria-label="Eliminar sección"
                            >
                              <i className="bi bi-x"></i>
                            </button>
                          </div>
                          {section.professors?.length > 0 && (
                            <div className="selected-section-prof">
                              {titleCase(section.professors.join(", "))}
                            </div>
                          )}
                          <div className="selected-section-meetings">
                            <MeetingBadges meetings={section.meetings} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          </>
        )}
      </div>
    </div>
  );
}
