"use client";

import { useEffect } from "react";
import { IconButton } from "@/components/ui";
import {
  cicloLabel,
  dayName,
  formatLocation,
  plural,
  shortTime,
  termLabel,
  titleCase,
} from "@/lib/format";
import { formatTerm } from "@/lib/terms";
import { ProfessorLinks, SeatMeter } from "./SectionRow";
import type { SelectedEventInfo } from "./usePlanner";

/** Class details: a side drawer on desktop, a bottom sheet on phones. */
export function DetailsDrawer({ event, onClose }: { event: SelectedEventInfo | null; onClose: () => void }) {
  useEffect(() => {
    if (!event) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [event, onClose]);

  if (!event) return null;
  const { section } = event;
  const term = termLabel(section);

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={`Detalles de ${event.courseCode}`}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" onClick={onClose} />
      <aside className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-2xl border border-border bg-surface shadow-2xl sm:inset-y-0 sm:right-0 sm:left-auto sm:max-h-none sm:w-[380px] sm:rounded-none sm:rounded-l-2xl">
        <div className="sticky top-0 flex items-start gap-3 border-b border-border bg-surface px-5 py-4">
          <span
            className="mt-1.5 size-3 shrink-0 rounded-full"
            style={{ backgroundColor: event.color }}
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold">{event.courseCode}</p>
            <p className="text-sm text-fg-secondary">
              {event.courseTitle ? titleCase(event.courseTitle) : "No disponible"}
            </p>
          </div>
          <IconButton icon="bi-x-lg" label="Cerrar" className="-mt-1 -mr-2" onClick={onClose} />
        </div>

        <div className="space-y-5 px-5 py-4">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <Info label="Sección" value={section.sectionId} />
            <Info label="NRC" value={section.nrc} />
            <Info label="Periodo" value={term === "Intersemestral" ? term : formatTerm(section.term)} />
            <Info label="Duración" value={cicloLabel(section)} />
            <Info
              label="Créditos"
              value={event.courseCredits != null ? `${event.courseCredits} ${plural(event.courseCredits, "crédito", "créditos")}` : "—"}
            />
            <Info label="Campus" value={section.campus ? titleCase(section.campus) : "—"} />
          </dl>

          <div className="space-y-1.5">
            <h3 className="text-xs text-fg-muted">Cupos</h3>
            <SeatMeter section={section} />
          </div>

          {section.professors?.length > 0 && (
            <div className="space-y-1.5">
              <h3 className="text-xs text-fg-muted">
                {plural(section.professors.length, "Profesor", "Profesores")}
              </h3>
              <ProfessorLinks professors={section.professors} />
            </div>
          )}

          <div className="space-y-2">
            <h3 className="text-xs text-fg-muted">Horario</h3>
            <ul className="divide-y divide-border rounded-xl border border-border">
              {section.meetings.map((m, i) => (
                <li key={i} className="flex items-baseline gap-3 px-3 py-2.5 text-sm">
                  <span className="w-20 shrink-0 font-medium">{dayName(m.day)}</span>
                  <span className="shrink-0 text-fg-secondary">
                    {shortTime(m.start)}–{shortTime(m.end)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-right text-xs text-fg-muted" title={formatLocation(m.location)}>
                    {formatLocation(m.location)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </aside>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-fg-muted">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
