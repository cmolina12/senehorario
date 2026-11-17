"use client";

import { useState } from "react";
import { CardSkeletons, EmptyState } from "@/components/ui";
import { formatTerm } from "@/lib/terms";
import type { Course, Section } from "@/lib/types";
import { CourseCard } from "./CourseCard";
import { SectionRow } from "./SectionRow";
import type { CourseSearch } from "./useCourseSearch";

export interface TermPicker {
  terms: string[];
  active: string | null;
  onChange: (term: string) => void;
  /** Locked while courses are selected, since a schedule can't mix terms. */
  locked: boolean;
}

interface Props {
  search: CourseSearch;
  /** Search results narrowed to the active term. */
  courses: Course[];
  term: TermPicker;
  selectedCount: (courseCode: string) => number;
  /** Color of a selected course; undefined when it isn't selected. */
  colorFor: (courseCode: string) => string | undefined;
  isSectionSelected: (courseCode: string, section: Section) => boolean;
  onToggleSection: (course: Course, section: Section) => void;
  onAddSections: (course: Course, onlyAvailable: boolean) => void;
  onRemoveCourse: (courseCode: string) => void;
}

const inputClass =
  "h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-fg placeholder:text-fg-muted transition focus:border-accent focus:ring-3 focus:ring-accent/25 focus:outline-none";

export function SearchTab({
  search,
  courses,
  term,
  selectedCount,
  colorFor,
  isSectionSelected,
  onToggleSection,
  onAddSections,
  onRemoveCourse,
}: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Buscar cursos</h2>
        {term.active && (
          <label
            className="flex items-center gap-2 text-xs text-fg-secondary"
            title={term.locked ? "Elimina tus cursos seleccionados para cambiar de periodo" : undefined}
          >
            Periodo
            <span className="relative inline-flex items-center">
              <select
                value={term.active}
                onChange={(e) => term.onChange(e.target.value)}
                disabled={term.locked || term.terms.length < 2}
                className="h-8 appearance-none rounded-lg border border-border bg-surface pr-7 pl-2.5 text-xs font-semibold text-fg disabled:cursor-not-allowed disabled:opacity-70"
              >
                {term.terms.map((t) => (
                  <option key={t} value={t}>
                    {formatTerm(t)}
                  </option>
                ))}
              </select>
              <i className="bi bi-chevron-down pointer-events-none absolute right-2.5 text-2xs text-fg-muted" aria-hidden="true"></i>
            </span>
          </label>
        )}
      </div>

      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          search.submit();
        }}
      >
        <div className="relative">
          <i className="bi bi-search pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-fg-muted" aria-hidden="true"></i>
          <input
            type="text"
            enterKeyHint="search"
            className={`${inputClass} pl-9`}
            placeholder="NRC, código o nombre del curso"
            aria-label="NRC, código o nombre del curso"
            value={search.query}
            onChange={(e) => search.setQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            enterKeyHint="search"
            className={inputClass}
            placeholder="Profesor (opcional)"
            aria-label="Profesor"
            value={search.professor}
            onChange={(e) => search.setProfessor(e.target.value)}
          />
          <button
            type="submit"
            disabled={search.loading}
            className="h-10 shrink-0 rounded-lg bg-accent px-4 text-sm font-semibold text-on-accent transition hover:bg-accent-hover disabled:opacity-60"
          >
            Buscar
          </button>
        </div>
      </form>

      {search.loading && <CardSkeletons label="Buscando cursos…" />}

      {!search.loading && courses.length > 0 && (
        <div className="space-y-2.5">
          {courses.map((course) => {
            const count = selectedCount(course.code);
            return (
              <CourseCard
                key={course.code}
                code={course.code}
                title={course.title}
                credits={course.credits}
                color={colorFor(course.code)}
                expanded={!!expanded[course.code]}
                onToggleExpanded={() => setExpanded((x) => ({ ...x, [course.code]: !x[course.code] }))}
                selectedCount={count}
                meta={`${course.sections.length} ${course.sections.length === 1 ? "sección" : "secciones"}`}
              >
                <div className="flex flex-wrap gap-1.5 py-3">
                  <ActionButton icon="bi-plus-circle" onClick={() => onAddSections(course, false)}>
                    Agregar todas
                  </ActionButton>
                  <ActionButton icon="bi-plus-circle-dotted" onClick={() => onAddSections(course, true)}>
                    Con cupos
                  </ActionButton>
                  {count > 0 && (
                    <ActionButton icon="bi-dash-circle" danger onClick={() => onRemoveCourse(course.code)}>
                      Quitar
                    </ActionButton>
                  )}
                </div>
                <div className="divide-y divide-border border-t border-border">
                  {course.sections.map((section) => (
                    <SectionRow
                      key={`${section.term}-${section.nrc}`}
                      section={section}
                      selected={isSectionSelected(course.code, section)}
                      onToggle={() => onToggleSection(course, section)}
                    />
                  ))}
                </div>
              </CourseCard>
            );
          })}
        </div>
      )}

      {!search.loading && search.truncated && courses.length > 0 && (
        <p className="flex gap-2 rounded-xl bg-surface-alt px-3 py-2.5 text-xs text-fg-secondary">
          <i className="bi bi-info-circle mt-px" aria-hidden="true"></i>
          Hay demasiados resultados y solo se muestran algunos. Escribe un código o un nombre más específico.
        </p>
      )}

      {!search.loading && search.empty && (
        <EmptyState icon="bi-search" title="No se encontraron cursos">
          Prueba con el código (p. ej. MATE1203), el NRC o parte del nombre.
        </EmptyState>
      )}
      {!search.loading && search.courses.length > 0 && courses.length === 0 && term.active && (
        <EmptyState icon="bi-calendar-x" title="Sin secciones en este periodo">
          Estos cursos no tienen secciones en {formatTerm(term.active)}.
        </EmptyState>
      )}
      {search.error && (
        <EmptyState icon="bi-exclamation-triangle" tone="danger" title="No pudimos buscar">
          {search.error}
        </EmptyState>
      )}
      {!search.loading && !search.error && !search.empty && search.courses.length === 0 && (
        <EmptyState icon="bi-journal-text" title="Empieza buscando un curso">
          Agrega las secciones que te sirvan y el generador arma todas las combinaciones sin choques.
        </EmptyState>
      )}
    </div>
  );
}

function ActionButton({
  icon,
  danger,
  children,
  onClick,
}: {
  icon: string;
  danger?: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        danger
          ? "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-danger transition hover:bg-danger/10"
          : "inline-flex items-center gap-1.5 rounded-lg bg-surface-alt px-2.5 py-1.5 text-xs font-medium text-fg-secondary transition hover:bg-surface-hover hover:text-fg"
      }
    >
      <i className={`bi ${icon}`} aria-hidden="true"></i>
      {children}
    </button>
  );
}
