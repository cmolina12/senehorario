"use client";

import { useMemo, useState } from "react";
import { CardSkeletons, EmptyState } from "@/components/ui";
import { CBU_AREA_FILTERS, CBU_ATTR_FILTERS, cn, plural } from "@/lib/format";
import { fitsInSchedule } from "@/lib/scheduler";
import { coursesInTerm } from "@/lib/terms";
import type { Course, Section } from "@/lib/types";
import { CourseCard } from "./CourseCard";
import { SectionRow } from "./SectionRow";
import type { CbuState } from "./useCbus";

interface Props {
  cbuState: CbuState;
  term: string | null;
  optionNumber: number;
  /** The schedule option being viewed; null when nothing has been generated. */
  schedule: Section[] | null;
  selectedCount: (courseCode: string) => number;
  /** Color of a selected course; undefined when it isn't selected. */
  colorFor: (courseCode: string) => string | undefined;
  isSectionSelected: (courseCode: string, section: Section) => boolean;
  onToggleSection: (course: Course, section: Section) => void;
}

export function CbuTab({
  cbuState,
  term,
  optionNumber,
  schedule,
  selectedCount,
  colorFor,
  isSectionSelected,
  onToggleSection,
}: Props) {
  const { cbus, loading, error } = cbuState;
  const [attrFilters, setAttrFilters] = useState<string[]>([]);
  const [areaFilter, setAreaFilter] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const fitting = useMemo(() => {
    if (!schedule) return [];
    return coursesInTerm(cbus, term)
      .filter((course) => !areaFilter || course.code.startsWith(`CBU${areaFilter}`))
      .map((course) => ({
        ...course,
        sections: course.sections.filter(
          (s) =>
            fitsInSchedule(s, schedule) &&
            (attrFilters.length === 0 || attrFilters.some((f) => s.attrs?.includes(f))),
        ),
      }))
      .filter((course) => course.sections.length > 0);
  }, [cbus, term, schedule, areaFilter, attrFilters]);

  if (!schedule) {
    return (
      <div className="p-4">
        <EmptyState icon="bi-stars" title="CBUs que encajan en tu horario">
          Cuando tengas un horario generado, aquí verás los CBUs que caben en sus espacios libres.
        </EmptyState>
      </div>
    );
  }

  const toggleAttr = (code: string) =>
    setAttrFilters((f) => (f.includes(code) ? f.filter((x) => x !== code) : [...f, code]));
  const hasFilters = attrFilters.length > 0 || !!areaFilter;

  return (
    <div className="space-y-4 p-4">
      <div>
        <h2 className="text-base font-semibold">CBUs para la opción {optionNumber}</h2>
        <p className="text-sm text-fg-secondary">
          {loading
            ? "Cargando CBUs…"
            : `${fitting.length} ${plural(fitting.length, "curso encaja", "cursos encajan")} sin choques`}
        </p>
      </div>

      <div className="space-y-2">
        <FilterRow label="Tipo">
          {CBU_ATTR_FILTERS.map((f) => (
            <FilterChip key={f.code} active={attrFilters.includes(f.code)} onClick={() => toggleAttr(f.code)}>
              {f.label}
            </FilterChip>
          ))}
        </FilterRow>
        <FilterRow label="Área">
          {CBU_AREA_FILTERS.map((f) => (
            <FilterChip
              key={f.value}
              active={areaFilter === f.value}
              onClick={() => setAreaFilter((a) => (a === f.value ? "" : f.value))}
            >
              {f.label}
            </FilterChip>
          ))}
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setAttrFilters([]);
                setAreaFilter("");
              }}
              className="px-1.5 text-xs font-medium text-fg-muted underline-offset-2 hover:text-fg hover:underline"
            >
              Limpiar
            </button>
          )}
        </FilterRow>
      </div>

      {loading && <CardSkeletons count={4} label="Cargando CBUs…" />}
      {error && (
        <EmptyState icon="bi-exclamation-triangle" tone="danger" title="No pudimos cargar los CBUs">
          {error}
        </EmptyState>
      )}
      {!loading && !error && fitting.length === 0 && (
        <EmptyState icon="bi-calendar-x" title="Ningún CBU encaja">
          {hasFilters ? "Prueba quitando algunos filtros." : "No hay CBUs que quepan en esta opción."}
        </EmptyState>
      )}
      {!loading && !error && fitting.length > 0 && (
        <div className="space-y-2.5">
          {fitting.map((course) => (
            <CourseCard
              key={course.code}
              code={course.code}
              title={course.title}
              credits={course.credits}
              color={colorFor(course.code)}
              expanded={!!expanded[course.code]}
              onToggleExpanded={() => setExpanded((x) => ({ ...x, [course.code]: !x[course.code] }))}
              selectedCount={selectedCount(course.code)}
              meta={`${course.sections.length} ${plural(course.sections.length, "sección", "secciones")}`}
            >
              <div className="divide-y divide-border">
                {course.sections.map((section) => (
                  <SectionRow
                    key={`${section.term}-${section.nrc}`}
                    section={section}
                    showAttrs
                    selected={isSectionSelected(course.code, section)}
                    onToggle={() => onToggleSection(course, section)}
                  />
                ))}
              </div>
            </CourseCard>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="w-10 text-xs font-medium text-fg-muted">{label}</span>
      {children}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-2.5 py-1 text-xs font-medium transition",
        active
          ? "border-accent bg-accent text-on-accent"
          : "border-border bg-surface text-fg-secondary hover:border-border-strong hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}
