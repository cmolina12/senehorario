"use client";

import { useEffect } from "react";
import { cn } from "@/lib/format";
import { usePresence } from "@/lib/use-presence";
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
import type { Pins } from "@/lib/pins";
import { formatTerm } from "@/lib/terms";
import { ProfessorLinks, SeatMeter } from "./SectionRow";
import type { SelectedEventInfo } from "./usePlanner";

/** Class details: a side drawer on desktop, a bottom sheet on phones. */
export function DetailsDrawer({
  event: openEvent,
  onClose,
  pins,
  onTogglePin,
}: {
  event: SelectedEventInfo | null;
  onClose: () => void;
  pins: Pins;
  onTogglePin: (courseCode: string, nrc: string) => void;
}) {
  // Keep the last event on screen while the drawer slides out.
  const { rendered: event, closing } = usePresence(openEvent);
  useEffect(() => {
    if (!event) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [event, onClose]);

  if (!event) return null;
  const { section } = event;
  const term = termLabel(section);
  const courseCode = event.courseCode ?? section.courseCode;
  const pinned = pins[courseCode] === section.nrc;

  return (
    <div className={cn("fixed inset-0 z-50", closing && "pointer-events-none")} role="dialog" aria-modal="true" aria-label={`Detalles de ${event.courseCode}`}>
      <div
        className={cn("absolute inset-0 bg-black/30 backdrop-blur-[1px]", closing ? "animate-fade-out" : "animate-fade-in")}
        onClick={onClose}
      />
      <aside
        className={cn(
          "absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-2xl border border-border bg-surface shadow-2xl sm:inset-y-0 sm:right-0 sm:left-auto sm:max-h-none sm:w-[380px] sm:rounded-none sm:rounded-l-2xl",
          closing ? "animate-sheet-out sm:animate-drawer-out" : "animate-sheet-in sm:animate-drawer-in",
        )}
      >
        <div className="sticky top-0 flex items-start gap-3 border-b border-border bg-surface px-5 py-4">
          <span
            className="mt-1.5 size-3 shrink-0 rounded-full"
            style={{ backgroundColor: event.color }}
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-extrabold tracking-tight">{event.courseCode}</p>
            <p className="text-sm text-fg-secondary">
              {event.courseTitle ? titleCase(event.courseTitle) : "No disponible"}
            </p>
          </div>
          <IconButton icon="bi-x-lg" label="Cerrar" className="-mt-1 -mr-2" onClick={onClose} />
        </div>

        <div className="space-y-5 px-5 py-4">
          <div className="space-y-1.5">
            <button
              type="button"
              aria-pressed={pinned}
              onClick={() => onTogglePin(courseCode, section.nrc)}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition",
                pinned
                  ? "bg-accent-soft text-fg ring-1 ring-accent hover:bg-accent-soft/70"
                  : "bg-accent text-on-accent hover:bg-accent-hover",
              )}
            >
              <i className={cn("bi", pinned ? "bi-pin-angle-fill" : "bi-pin-angle")} aria-hidden="true"></i>
              {pinned ? "Fijada · soltar" : "Fijar esta sección"}
            </button>
            <p className="text-center text-xs text-fg-muted">
              {pinned
                ? "Todas las opciones incluyen esta sección."
                : "Todas las opciones la incluirán; el resto de tus cursos sigue variando."}
            </p>
          </div>

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
                  <span className="w-20 shrink-0 font-semibold">{dayName(m.day)}</span>
                  <span className="shrink-0 text-fg-secondary">
                    {shortTime(m.start)}–{shortTime(m.end)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-right text-xs text-fg-muted" title={formatLocation(m.location)}>
                    {formatLocation(m.location)}
                  </span>
                </li>
              ))}
              {section.meetings.length === 0 && (
                <li className="px-3 py-2.5 text-sm text-fg-secondary">
                  Esta sección no tiene horario fijo en la oferta de cursos.
                </li>
              )}
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
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}
