"use client";

import { useState } from "react";
import { Chip, EmptyState, IconButton } from "@/components/ui";
import { courseColor } from "@/lib/calendar-events";
import { cn, plural, titleCase } from "@/lib/format";
import { formatTerm } from "@/lib/terms";
import { sectionKey, type Section } from "@/lib/types";
import { MeetingChips } from "./SectionRow";
import type { Selection } from "./usePlanner";

interface Props {
  selection: Selection;
  totalCredits: number;
  term: string | null;
  onSearchFor: (code: string) => void;
  onRemoveSection: (courseCode: string, section: Section) => void;
  onRemoveCourse: (courseCode: string) => void;
  onGoToSearch: () => void;
}

export function CoursesTab({
  selection,
  totalCredits,
  term,
  onSearchFor,
  onRemoveSection,
  onRemoveCourse,
  onGoToSearch,
}: Props) {
  const [openCode, setOpenCode] = useState<string | null>(null);
  const codes = Object.keys(selection.sections);

  if (codes.length === 0) {
    return (
      <div className="p-4">
        <EmptyState icon="bi-bookmark" title="Aún no has seleccionado cursos">
          <button
            type="button"
            onClick={onGoToSearch}
            className="mt-2 rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-on-accent hover:bg-accent-hover"
          >
            Buscar cursos
          </button>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div>
        <h2 className="text-base font-semibold">Mis cursos</h2>
        <p className="text-sm text-fg-secondary">
          {codes.length} {plural(codes.length, "curso", "cursos")} · {totalCredits}{" "}
          {plural(totalCredits, "crédito", "créditos")}
          {term && ` · ${formatTerm(term)}`}
        </p>
      </div>

      <div className="flex gap-2.5 rounded-xl bg-accent-soft px-3 py-2.5 text-xs leading-relaxed text-fg-secondary">
        <i className="bi bi-info-circle mt-px text-sm text-accent-hover" aria-hidden="true"></i>
        <span>
          Recuerda verificar si tus cursos requieren un laboratorio o curso complementario e
          inscribirlo también en Banner.
        </span>
      </div>

      <div className="space-y-2">
        {codes.map((code) => {
          const sections = selection.sections[code];
          const meta = selection.meta[code];
          const open = openCode === code;
          return (
            <div key={code} className="rounded-xl border border-border bg-surface">
              <div className="flex items-start gap-3 px-4 py-3">
                <span
                  className="mt-1.5 size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: courseColor(codes, code) }}
                  aria-hidden="true"
                />
                <button
                  type="button"
                  onClick={() => setOpenCode(open ? null : code)}
                  aria-expanded={open}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{code}</span>
                    <span className="text-xs text-fg-muted">
                      {meta?.credits ?? "—"} {plural(meta?.credits ?? 0, "crédito", "créditos")} ·{" "}
                      {sections.length} {plural(sections.length, "sección", "secciones")}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-fg-secondary">
                    {meta?.title ? titleCase(meta.title) : "No disponible"}
                  </p>
                </button>
                <div className="-mr-2 -mt-1 flex">
                  <IconButton icon="bi-search" label="Ver todas las secciones" onClick={() => onSearchFor(code)} />
                  <IconButton
                    icon="bi-trash3"
                    label="Quitar curso"
                    className="hover:text-danger"
                    onClick={() => onRemoveCourse(code)}
                  />
                  <IconButton
                    icon="bi-chevron-down"
                    label={open ? "Ocultar secciones" : "Ver secciones"}
                    className={cn("text-xs transition", open && "rotate-180")}
                    onClick={() => setOpenCode(open ? null : code)}
                  />
                </div>
              </div>
              {open && (
                <div className="divide-y divide-border border-t border-border px-4">
                  {sections.map((section) => (
                    <div key={sectionKey(section)} className="flex items-start gap-3 py-2.5">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium">Sección {section.sectionId}</span>
                          <span className="text-fg-muted">NRC {section.nrc}</span>
                          {(section.ptrm === "8A" || section.ptrm === "8B") && (
                            <Chip className="bg-accent-soft text-fg">{section.ptrm}</Chip>
                          )}
                        </div>
                        {section.professors?.length > 0 && (
                          <p className="truncate text-xs text-fg-secondary">
                            {titleCase(section.professors.join(", "))}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1">
                          <MeetingChips section={section} />
                        </div>
                      </div>
                      <IconButton
                        icon="bi-x-lg"
                        label={`Quitar sección ${section.sectionId}`}
                        className="size-8 text-xs hover:text-danger"
                        onClick={() => onRemoveSection(code, section)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
