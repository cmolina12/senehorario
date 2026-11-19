"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CardSkeletons, EmptyState } from "@/components/ui";
import { plural } from "@/lib/format";
import { filterCourses, hasActiveFilters, NO_FILTERS, type SearchFilters } from "@/lib/search-filters";
import { loadSearchFilters, saveSearchFilters } from "@/lib/storage";
import { formatTerm } from "@/lib/terms";
import type { Course, ScheduledSection, Section } from "@/lib/types";
import { CourseCard } from "./CourseCard";
import { FilterChip, FilterMenu } from "./filters";
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
  /** The schedule option on screen, for "Cabe en mi horario"; null when there is none. */
  schedule: ScheduledSection[] | null;
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
  schedule,
  selectedCount,
  colorFor,
  isSectionSelected,
  onToggleSection,
  onAddSections,
  onRemoveCourse,
}: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [filters, setFilters] = useState<SearchFilters>(NO_FILTERS);
  const filtersLoaded = useRef(false);

  // Remembered per browser; read after mount so the server render matches.
  useEffect(() => {
    if (filtersLoaded.current) return;
    filtersLoaded.current = true;
    setFilters(loadSearchFilters());
  }, []);

  const updateFilters = (patch: Partial<SearchFilters>) => {
    const next = { ...filters, ...patch };
    setFilters(next);
    saveSearchFilters(next);
  };

  const filtering = hasActiveFilters(filters);
  const filtered = useMemo(() => filterCourses(courses, filters, schedule), [courses, filters, schedule]);
  const shownSections = filtered.reduce((n, c) => n + c.sections.length, 0);
  const totalSections = courses.reduce((n, c) => n + c.sections.length, 0);

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-extrabold tracking-tight">Buscar cursos</h2>
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
        <div className="space-y-2">
          <div className="space-y-1.5" role="group" aria-label="Filtros">
            <div className="flex flex-wrap gap-1.5">
              <FilterChip active={filters.withSeats} onClick={() => updateFilters({ withSeats: !filters.withSeats })}>
                Con cupos
              </FilterChip>
              <FilterChip
                active={filters.fitsSchedule && !!schedule}
                disabled={!schedule}
                title={schedule ? undefined : "Agrega cursos para generar un horario primero"}
                onClick={() => updateFilters({ fitsSchedule: !filters.fitsSchedule })}
              >
                Cabe en mi horario
              </FilterChip>
              <FilterChip active={filters.english} onClick={() => updateFilters({ english: !filters.english })}>
                En inglés
              </FilterChip>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <FilterMenu
                label="Nivel"
                anyLabel="Cualquier nivel"
                value={filters.level}
                options={[
                  { value: "PRE", label: "Pregrado" },
                  { value: "POS", label: "Posgrado" },
                ]}
                onChange={(level) => updateFilters({ level })}
              />
              <FilterMenu
                label="Modalidad"
                anyLabel="Cualquier modalidad"
                value={filters.delivery}
                options={[
                  { value: "presencial", label: "Presencial" },
                  { value: "virtual", label: "Virtual" },
                  { value: "hibrida", label: "Híbrida" },
                ]}
                onChange={(delivery) => updateFilters({ delivery })}
              />
              <FilterMenu
                label="Ciclo"
                anyLabel="Cualquier ciclo"
                value={filters.cycle}
                options={[
                  { value: "16", label: "16 semanas" },
                  { value: "8A", label: "Ciclo 8A" },
                  { value: "8B", label: "Ciclo 8B" },
                ]}
                onChange={(cycle) => updateFilters({ cycle })}
              />
              {filtering && (
                <button
                  type="button"
                  onClick={() => updateFilters(NO_FILTERS)}
                  className="ml-auto px-1 text-xs font-semibold text-fg-muted underline-offset-2 hover:text-fg hover:underline"
                >
                  Quitar filtros
                </button>
              )}
            </div>
          </div>
          {filtering && (
            <p className="text-xs text-fg-muted">
              {filtered.length} {plural(filtered.length, "curso", "cursos")} · {shownSections} de {totalSections}{" "}
              {plural(totalSections, "sección", "secciones")}
            </p>
          )}
        </div>
      )}

      {!search.loading && filtered.length > 0 && (
        <div className="space-y-2.5">
          {filtered.map((course) => {
            const count = selectedCount(course.code);
            const narrowed = course.sections.length < course.totalSections;
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
                meta={
                  narrowed
                    ? `${course.sections.length} de ${course.totalSections} ${plural(course.totalSections, "sección", "secciones")}`
                    : `${course.sections.length} ${plural(course.sections.length, "sección", "secciones")}`
                }
              >
                <div className="flex flex-wrap gap-1.5 py-3">
                  <ActionButton icon="bi-plus-circle" onClick={() => onAddSections(course, false)}>
                    {narrowed ? `Agregar ${plural(course.sections.length, "esta", `estas ${course.sections.length}`)}` : "Agregar todas"}
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

      {!search.loading && courses.length > 0 && filtered.length === 0 && (
        <EmptyState icon="bi-funnel" title="Ningún curso coincide con los filtros">
          <button
            type="button"
            onClick={() => updateFilters(NO_FILTERS)}
            className="mt-1 text-sm font-semibold text-fg underline underline-offset-2"
          >
            Quitar filtros
          </button>
        </EmptyState>
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
          ? "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-danger transition hover:bg-danger/10"
          : "inline-flex items-center gap-1.5 rounded-lg bg-surface-inset px-2.5 py-1.5 text-xs font-semibold text-fg-secondary transition hover:bg-border hover:text-fg"
      }
    >
      <i className={`bi ${icon}`} aria-hidden="true"></i>
      {children}
    </button>
  );
}
