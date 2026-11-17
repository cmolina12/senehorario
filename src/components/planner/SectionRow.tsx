import { Fragment } from "react";
import { Chip } from "@/components/ui";
import {
  cbuAttrLabel,
  cicloLabel,
  cn,
  dayLabel,
  professorUrl,
  seatLevel,
  shortTime,
  termLabel,
  titleCase,
} from "@/lib/format";
import type { Section } from "@/lib/types";

const SEAT_COLORS = {
  available: "bg-success",
  low: "bg-warning",
  full: "bg-danger",
} as const;

export function SeatMeter({ section }: { section: Section }) {
  const level = seatLevel(section);
  const ratio = section.totalSeats > 0 ? section.availableSeats / section.totalSeats : 0;
  return (
    <span className="inline-flex items-center gap-2 text-xs text-fg-secondary">
      <span className="h-1.5 w-14 overflow-hidden rounded-full bg-surface-inset">
        <span
          className={cn("block h-full rounded-full", SEAT_COLORS[level])}
          style={{ width: `${Math.max(ratio * 100, ratio > 0 ? 6 : 0)}%` }}
        />
      </span>
      <span>
        <span className="font-semibold text-fg">{section.availableSeats}</span>/{section.totalSeats} cupos
      </span>
    </span>
  );
}

/** Professor names linking to their Los Estudiantes profile. */
export function ProfessorLinks({ professors, size = "sm" }: { professors: string[]; size?: "sm" | "xs" }) {
  if (!professors?.length) return null;
  return (
    <p className={cn("truncate text-fg-secondary", size === "xs" ? "text-xs" : "text-sm")}>
      {professors.map((prof, i) => (
        <Fragment key={i}>
          <a
            href={professorUrl(prof)}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-border-strong underline-offset-2 transition hover:text-fg hover:decoration-fg-muted"
            title="Ver en Los Estudiantes (puede no estar disponible)"
          >
            {titleCase(prof)}
          </a>
          {i < professors.length - 1 && ", "}
        </Fragment>
      ))}
    </p>
  );
}

export function MeetingChips({ section }: { section: Section }) {
  if (section.meetings.length === 0) return <Chip>Sin horario</Chip>;
  return section.meetings.map((m, i) => (
    <Chip key={i}>
      {dayLabel(m.day)} {shortTime(m.start)}–{shortTime(m.end)}
    </Chip>
  ));
}

interface Props {
  section: Section;
  selected: boolean;
  onToggle: () => void;
  showAttrs?: boolean;
}

export function SectionRow({ section, selected, onToggle, showAttrs }: Props) {
  const isHalf = section.ptrm === "8A" || section.ptrm === "8B";
  const term = termLabel(section);
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="font-semibold">Sección {section.sectionId}</span>
          <span className="text-fg-muted">NRC {section.nrc}</span>
          {isHalf && (
            <Chip className="bg-accent-soft text-fg" >
              {cicloLabel(section)}
            </Chip>
          )}
          {term === "Intersemestral" && <Chip>Intersemestral</Chip>}
        </div>
        <ProfessorLinks professors={section.professors} />
        <div className="flex flex-wrap gap-1">
          <MeetingChips section={section} />
        </div>
        {showAttrs && section.attrs?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {section.attrs.map((attr) => (
              <Chip key={attr} className="bg-primary/10 text-fg dark:bg-primary-light/40">
                {cbuAttrLabel(attr)}
              </Chip>
            ))}
          </div>
        )}
        <SeatMeter section={section} />
      </div>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={selected}
        aria-label={selected ? `Quitar sección ${section.sectionId}` : `Agregar sección ${section.sectionId}`}
        title={selected ? "Quitar del horario" : "Agregar al horario"}
        className={cn(
          "mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border transition active:scale-90",
          selected
            ? "border-accent bg-accent text-on-accent hover:bg-accent-hover"
            : "border-border-strong text-fg-secondary hover:border-fg-muted hover:text-fg",
        )}
      >
        <i className={cn("bi", selected ? "bi-check-lg" : "bi-plus-lg")} aria-hidden="true"></i>
      </button>
    </div>
  );
}
