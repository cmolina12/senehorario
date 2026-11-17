"use client";

import { useCallback, useRef, useState } from "react";
import * as api from "@/lib/api";
import { formatTerm } from "@/lib/terms";
import { sectionKey, type Course, type Section } from "@/lib/types";
import { SectionItem } from "./SectionItem";

const SEARCH_ERROR =
  "La base de datos de la Universidad de los Andes tiene errores en los valores de los cursos. Por favor, inténtalo de nuevo más tarde cuando la universidad corrija este problema.";

export function useCourseSearch() {
  const [query, setQuery] = useState("");
  const [professor, setProfessor] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [empty, setEmpty] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  const search = useCallback(async (q: string, prof: string) => {
    const id = ++requestId.current;
    if (!q.trim() && !prof.trim()) {
      setCourses([]);
      setEmpty(false);
      setError("");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await api.searchCourses(q, prof);
      if (id !== requestId.current) return;
      setCourses(result);
      setEmpty(result.length === 0);
      setError("");
    } catch (e) {
      if (id !== requestId.current) return;
      console.error("Error fetching courses:", e);
      setCourses([]);
      setEmpty(false);
      setError(SEARCH_ERROR);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  /** Search for an exact course code (used from the selected-courses panel). */
  const searchFor = useCallback(
    (code: string) => {
      setQuery(code);
      void search(code, professor);
    },
    [search, professor],
  );

  return {
    query,
    setQuery,
    professor,
    setProfessor,
    courses,
    loading,
    empty,
    error,
    submit: () => void search(query, professor),
    searchFor,
  };
}

interface TermPicker {
  terms: string[];
  active: string | null;
  onChange: (term: string) => void;
  /** Locked while courses are selected, since a schedule can't mix terms. */
  locked: boolean;
}

interface Props {
  search: ReturnType<typeof useCourseSearch>;
  /** Search results narrowed to the active term. */
  courses: Course[];
  term: TermPicker;
  isSectionSelected: (courseCode: string, section: Section) => boolean;
  onToggleSection: (course: Course, section: Section) => void;
  onAddSections: (course: Course, onlyAvailable: boolean) => void;
  onRemoveCourse: (courseCode: string) => void;
}

export function SearchPanel({
  search,
  courses,
  term,
  isSectionSelected,
  onToggleSection,
  onAddSections,
  onRemoveCourse,
}: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const onEnter = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") search.submit();
  };

  return (
    <div className="panel search-panel">
      <div className="panel-header">
        <span className="panel-title">Búsqueda de cursos</span>
        {term.terms.length > 0 && term.active && (
          <label
            className="term-picker"
            title={term.locked ? "Elimina tus cursos seleccionados para cambiar de periodo" : undefined}
          >
            <span>Periodo</span>
            <span className="term-select">
              <select
                value={term.active}
                onChange={(e) => term.onChange(e.target.value)}
                disabled={term.locked || term.terms.length < 2}
              >
                {term.terms.map((t) => (
                  <option key={t} value={t}>
                    {formatTerm(t)}
                  </option>
                ))}
              </select>
              <i className="bi bi-chevron-down" aria-hidden="true"></i>
            </span>
          </label>
        )}
      </div>
      <div className="panel-body">
        <div className="search-input-wrapper">
          <input
            type="text"
            className="form-control"
            placeholder="NRC, código o nombre..."
            value={search.query}
            onChange={(e) => search.setQuery(e.target.value)}
            onKeyUp={onEnter}
          />
          <input
            type="text"
            className="form-control"
            placeholder="Profesor (opcional)..."
            value={search.professor}
            onChange={(e) => search.setProfessor(e.target.value)}
            onKeyUp={onEnter}
          />
          <button className="btn-search" onClick={search.submit} disabled={search.loading}>
            Buscar
          </button>
        </div>

        {search.loading && (
          <div className="status-message">
            <div className="spinner-border spinner-border-sm text-secondary" role="status"></div>
            <span>Cargando cursos...</span>
          </div>
        )}

        {!search.loading && courses.length > 0 && (
          <div className="course-list">
            {courses.map((course) => (
              <div key={course.code} className="course-item">
                <div
                  className="course-header"
                  onClick={() => setExpanded((x) => ({ ...x, [course.code]: !x[course.code] }))}
                >
                  <div className="course-info">
                    <span className="course-code">{course.code}</span>
                    <span className="course-credits">{course.credits} creditos</span>
                  </div>
                  <i className={`bi ${expanded[course.code] ? "bi-chevron-up" : "bi-chevron-down"}`}></i>
                </div>
                <div className="course-title">{course.title}</div>

                {expanded[course.code] && course.sections && (
                  <div className="sections-list">
                    <div className="course-actions-menu">
                      <button className="btn-action-menu" onClick={() => onAddSections(course, false)}>
                        <i className="bi bi-plus-circle"></i>
                        Agregar todas las secciones
                      </button>
                      <button className="btn-action-menu" onClick={() => onAddSections(course, true)}>
                        <i className="bi bi-plus-circle-dotted"></i>
                        Agregar secciones con cupos
                      </button>
                      <button
                        className="btn-action-menu btn-action-danger"
                        onClick={() => onRemoveCourse(course.code)}
                      >
                        <i className="bi bi-dash-circle"></i>
                        Eliminar todas las secciones
                      </button>
                    </div>
                    {course.sections.map((section) => (
                      <SectionItem
                        key={sectionKey(section)}
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

        {!search.loading && search.empty && (
          <div className="status-message muted">
            <i className="bi bi-search"></i>
            <span>No se encontraron cursos</span>
          </div>
        )}
        {!search.loading && search.courses.length > 0 && courses.length === 0 && term.active && (
          <div className="status-message muted">
            <i className="bi bi-calendar-x"></i>
            <span>No hay secciones de estos cursos en el periodo {formatTerm(term.active)}</span>
          </div>
        )}
        {search.error && (
          <div className="status-message error">
            <i className="bi bi-exclamation-circle"></i>
            <span>{search.error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
