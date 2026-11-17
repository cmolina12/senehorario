"use client";

import type { EventInput } from "@fullcalendar/core";
import dynamic from "next/dynamic";
import { EmptyState, IconButton, Spinner } from "@/components/ui";
import type { VisibleRange } from "@/lib/calendar-events";
import { plural } from "@/lib/format";
import { describeChange, type PlanChange } from "@/lib/refresh";
import { MAX_SCHEDULES } from "@/lib/scheduler";
import { formatTerm } from "@/lib/terms";
import type { ScheduledSection } from "@/lib/types";
import { AgendaView } from "./AgendaView";
import { NrcList } from "./NrcList";
import type { SelectedEventInfo } from "./usePlanner";

// FullCalendar measures the DOM, so render it only in the browser.
const ScheduleCalendar = dynamic(() => import("./ScheduleCalendar"), { ssr: false });

interface Props {
  courseCount: number;
  totalCredits: number;
  term: string | null;
  optionCount: number;
  optionIndex: number;
  truncated: boolean;
  onOptionChange: (index: number) => void;
  schedule: ScheduledSection[] | null;
  events: EventInput[];
  range: VisibleRange;
  error: string;
  onEventClick: (info: SelectedEventInfo) => void;
  onGoToSearch: () => void;
  refreshing: boolean;
  planChanges: PlanChange[];
  onDismissChanges: () => void;
}

export function CalendarView({
  courseCount,
  totalCredits,
  term,
  optionCount,
  optionIndex,
  truncated,
  onOptionChange,
  schedule,
  events,
  range,
  error,
  onEventClick,
  onGoToSearch,
  refreshing,
  planChanges,
  onDismissChanges,
}: Props) {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 p-4 lg:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Tu horario</h1>
          <p className="text-sm text-fg-secondary">
            {courseCount === 0
              ? "Aún no has agregado cursos"
              : `${courseCount} ${plural(courseCount, "curso", "cursos")} · ${totalCredits} ${plural(totalCredits, "crédito", "créditos")}${term ? ` · ${formatTerm(term)}` : ""}`}
          </p>
          {refreshing && (
            <p className="mt-1 inline-flex items-center gap-2 text-xs text-fg-muted">
              <Spinner className="size-3" /> Verificando cupos con la oferta actual…
            </p>
          )}
        </div>

        {optionCount > 0 && (
          <div className="flex items-center gap-2">
            {schedule && <NrcList schedule={schedule} optionNumber={optionIndex + 1} />}
            <div className="flex items-center gap-1 rounded-xl border border-border bg-surface p-1">
              <IconButton
                icon="bi-chevron-left"
                label="Opción anterior"
                className="size-8"
                disabled={optionIndex === 0}
                onClick={() => onOptionChange(optionIndex - 1)}
              />
              <span
                className="min-w-28 px-1 text-center text-sm"
                title={truncated ? `Se muestran las primeras ${MAX_SCHEDULES} combinaciones` : undefined}
              >
                Opción <span className="font-semibold">{optionIndex + 1}</span> de {optionCount}
                {truncated && "+"}
              </span>
              <IconButton
                icon="bi-chevron-right"
                label="Opción siguiente"
                className="size-8"
                disabled={optionIndex >= optionCount - 1}
                onClick={() => onOptionChange(optionIndex + 1)}
              />
            </div>
          </div>
        )}
      </header>

      {planChanges.length > 0 && (
        <div
          role="status"
          className="flex gap-3 rounded-2xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm"
        >
          <i className="bi bi-arrow-repeat mt-0.5 text-warning" aria-hidden="true"></i>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Actualizamos tu plan con la oferta actual</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-fg-secondary">
              {planChanges.map((change, i) => (
                <li key={i}>{describeChange(change)}</li>
              ))}
            </ul>
          </div>
          <IconButton icon="bi-x-lg" label="Cerrar aviso" className="-mt-1.5 -mr-2 size-8 text-xs" onClick={onDismissChanges} />
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_1px_2px_hsl(var(--shadow-color)/0.04)]">
        {error ? (
          <EmptyState icon="bi-exclamation-triangle" tone="danger" title="No hay horarios compatibles">
            Todas las combinaciones de las secciones seleccionadas tienen choques. Agrega más secciones o
            quita alguna que esté causando conflicto.
          </EmptyState>
        ) : courseCount === 0 || !schedule ? (
          <EmptyState icon="bi-calendar-week" title="Tu semana aparecerá aquí">
            <p>Busca tus cursos y agrega las secciones que te sirvan; generamos todas las combinaciones sin choques.</p>
            <button
              type="button"
              onClick={onGoToSearch}
              className="mt-3 rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-on-accent hover:bg-accent-hover lg:hidden"
            >
              Buscar cursos
            </button>
          </EmptyState>
        ) : (
          <>
            <div className="hidden p-2 sm:block sm:p-3">
              <ScheduleCalendar events={events} range={range} onEventClick={onEventClick} />
            </div>
            <div className="sm:hidden">
              <AgendaView schedule={schedule} onSelect={onEventClick} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
