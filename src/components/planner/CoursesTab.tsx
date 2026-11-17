"use client";

import { useState } from "react";
import { Chip, EmptyState, IconButton } from "@/components/ui";
import { courseColor } from "@/lib/calendar-events";
import { cn, plural } from "@/lib/format";
import { buildSlots, type CourseGroups } from "@/lib/groups";
import type { Pins } from "@/lib/pins";
import { formatTerm } from "@/lib/terms";
import { sectionKey, type Section } from "@/lib/types";
import { CourseCard } from "./CourseCard";
import { MeetingChips, ProfessorLinks } from "./SectionRow";
import type { Selection } from "./usePlanner";

interface Props {
  selection: Selection;
  totalCredits: number;
  term: string | null;
  onSearchFor: (code: string) => void;
  onRemoveSection: (courseCode: string, section: Section) => void;
  onRemoveCourse: (courseCode: string) => void;
  onGoToSearch: () => void;
  groups: CourseGroups;
  onGroupsChange: (groups: CourseGroups) => void;
  pins: Pins;
  onTogglePin: (courseCode: string, nrc: string) => void;
}

export function CoursesTab({
  selection,
  totalCredits,
  term,
  onSearchFor,
  onRemoveSection,
  onRemoveCourse,
  onGoToSearch,
  groups,
  onGroupsChange,
  pins,
  onTogglePin,
}: Props) {
  const [openCode, setOpenCode] = useState<string | null>(null);
  // Picking courses for a new "elige uno" group; null when not grouping.
  const [picking, setPicking] = useState<string[] | null>(null);
  const codes = Object.keys(selection.sections);
  const grouped = new Set(groups.flat());
  const ungroupedCount = codes.filter((c) => !grouped.has(c)).length;

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

  const removeFromGroup = (code: string) =>
    onGroupsChange(groups.map((g) => g.filter((c) => c !== code)).filter((g) => g.length >= 2));

  const togglePick = (code: string) =>
    setPicking((p) => (p && (p.includes(code) ? p.filter((c) => c !== code) : [...p, code])));

  const renderCourse = (code: string, inGroup: boolean) => {
    const sections = selection.sections[code];
    const meta = selection.meta[code];
    const open = openCode === code;
    const toggle = () => setOpenCode(open ? null : code);
    const pickable = picking !== null && !grouped.has(code);
    const pinned = sections.find((s) => s.nrc === pins[code]);
    const card = (
      <CourseCard
        key={code}
        code={code}
        title={meta?.title ?? ""}
        credits={meta?.credits ?? 0}
        meta={`${sections.length} ${plural(sections.length, "sección", "secciones")}`}
        color={courseColor(codes, code)}
        pinnedSection={pinned?.sectionId}
        expanded={open}
        onToggleExpanded={pickable ? () => togglePick(code) : toggle}
        menu={
          picking
            ? undefined
            : [
                { label: open ? "Ocultar secciones" : "Ver secciones", icon: "bi-list-ul", onSelect: toggle },
                { label: "Buscar más secciones", icon: "bi-search", onSelect: () => onSearchFor(code) },
                ...(inGroup
                  ? [{ label: "Sacar del grupo", icon: "bi-box-arrow-right", onSelect: () => removeFromGroup(code) }]
                  : []),
                { label: "Quitar curso", icon: "bi-trash3", danger: true, onSelect: () => onRemoveCourse(code) },
              ]
        }
      >
        {pinned && sections.length > 1 && (
          <p className="mt-2.5 flex gap-2 rounded-lg bg-accent-soft px-2.5 py-2 text-xs text-fg-secondary">
            <i className="bi bi-pin-angle-fill text-accent-hover" aria-hidden="true"></i>
            <span>
              Los horarios solo usan la sección {pinned.sectionId}. Las demás quedan guardadas por si la sueltas.
            </span>
          </p>
        )}
        <div className="divide-y divide-border">
          {/* The pinned section first; the rest keep their order. */}
          {(pinned ? [pinned, ...sections.filter((s) => s !== pinned)] : sections).map((section) => {
            const isPinned = section === pinned;
            return (
              <div key={sectionKey(section)} className="flex items-start gap-1 py-2.5">
                <div className={cn("min-w-0 flex-1 space-y-1 transition-opacity", pinned && !isPinned && "opacity-50")}>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">Sección {section.sectionId}</span>
                    <span className="text-fg-muted">NRC {section.nrc}</span>
                    {(section.ptrm === "8A" || section.ptrm === "8B") && (
                      <Chip className="bg-accent-soft text-fg">{section.ptrm}</Chip>
                    )}
                  </div>
                  <ProfessorLinks professors={section.professors} size="xs" />
                  <div className="flex flex-wrap gap-1">
                    <MeetingChips section={section} />
                  </div>
                </div>
                {(isPinned || sections.length > 1 || inGroup) && (
                  <IconButton
                    icon={isPinned ? "bi-pin-angle-fill text-accent-hover" : "bi-pin-angle"}
                    label={isPinned ? `Soltar sección ${section.sectionId}` : `Fijar sección ${section.sectionId}`}
                    aria-pressed={isPinned}
                    className="size-8 text-sm"
                    onClick={() => onTogglePin(code, section.nrc)}
                  />
                )}
                <IconButton
                  icon="bi-x-lg"
                  label={`Quitar sección ${section.sectionId}`}
                  className="size-8 text-xs hover:text-danger"
                  onClick={() => onRemoveSection(code, section)}
                />
              </div>
            );
          })}
        </div>
      </CourseCard>
    );
    if (!pickable) return card;
    const checked = picking.includes(code);
    return (
      <div key={code} className="flex items-center gap-2.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={() => togglePick(code)}
          aria-label={`Agrupar ${code}`}
          className="size-4 shrink-0 accent-[var(--accent)]"
        />
        <div className="min-w-0 flex-1">{card}</div>
      </div>
    );
  };

  return (
    <div className="space-y-4 p-4">
      <div>
        <h2 className="text-base font-semibold">Mis cursos</h2>
        <p className="text-sm text-fg-secondary">
          {codes.length} {plural(codes.length, "curso", "cursos")}
          {groups.length > 0 && ` · ${groups.length} ${plural(groups.length, "grupo", "grupos")}`} · {totalCredits}{" "}
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

      {picking ? (
        <div className="space-y-2 rounded-xl border border-accent bg-surface px-3 py-2.5">
          <p className="text-sm font-semibold">Crear grupo «elige uno»</p>
          <p className="text-xs text-fg-secondary">
            Marca los cursos entre los que quieres escoger. Cada horario incluirá exactamente uno de ellos (útil para
            electivas o CBUs).
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={picking.length < 2}
              onClick={() => {
                onGroupsChange([...groups, picking]);
                setPicking(null);
              }}
              className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-on-accent transition hover:bg-accent-hover disabled:opacity-50"
            >
              Crear grupo ({picking.length})
            </button>
            <button
              type="button"
              onClick={() => setPicking(null)}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-fg-secondary hover:bg-surface-hover hover:text-fg"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        ungroupedCount >= 2 && (
          <button
            type="button"
            onClick={() => setPicking([])}
            className="inline-flex items-center gap-2 text-sm font-medium text-fg-secondary transition hover:text-fg"
          >
            <i className="bi bi-collection" aria-hidden="true"></i> Agrupar cursos («elige uno»)
          </button>
        )
      )}

      <div className="space-y-2.5">
        {buildSlots(codes, groups).map((slot) =>
          slot.length === 1 && !grouped.has(slot[0]) ? (
            renderCourse(slot[0], false)
          ) : (
            <div
              key={slot.join("~")}
              className={cn(
                "space-y-2 rounded-2xl border-2 border-dashed border-accent/70 bg-accent-soft/40 p-2",
                picking && "opacity-60",
              )}
            >
              <div className="flex items-center justify-between px-1.5 pt-0.5">
                <p className="text-xs font-semibold text-fg">
                  <i className="bi bi-collection mr-1.5" aria-hidden="true"></i>
                  Elige uno · {slot.length} cursos
                  {slot.some((c) => pins[c]) && (
                    <span className="font-normal text-fg-secondary"> · fijaste {slot.find((c) => pins[c])}</span>
                  )}
                </p>
                {!picking && (
                  <button
                    type="button"
                    onClick={() => onGroupsChange(groups.filter((g) => !slot.every((c) => g.includes(c))))}
                    className="text-xs font-medium text-fg-muted underline-offset-2 hover:text-fg hover:underline"
                  >
                    Desagrupar
                  </button>
                )}
              </div>
              {slot.map((code) => renderCourse(code, true))}
            </div>
          ),
        )}

        <button
          type="button"
          onClick={onGoToSearch}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-4 text-sm font-medium text-fg-muted transition hover:border-border-strong hover:text-fg"
        >
          <i className="bi bi-plus-lg" aria-hidden="true"></i> Agregar curso
        </button>
      </div>
    </div>
  );
}
