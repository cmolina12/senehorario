"use client";

import type { EventInput } from "@fullcalendar/core";
import dynamic from "next/dynamic";
import type { SelectedEventInfo } from "./usePlanner";

// FullCalendar measures the DOM, so render it only in the browser.
const ScheduleCalendar = dynamic(() => import("./ScheduleCalendar"), { ssr: false });

interface Props {
  events: EventInput[];
  error: string;
  hasSelection: boolean;
  onEventClick: (info: SelectedEventInfo) => void;
}

export function CalendarPanel({ events, error, hasSelection, onEventClick }: Props) {
  return (
    <div className="panel calendar-panel">
      <div className="panel-header">
        <span className="panel-title">Calendario Semanal</span>
      </div>
      <div className="calendar-body">
        {!error && <ScheduleCalendar events={events} onEventClick={onEventClick} />}
        {error && (
          <div className="calendar-overlay error">
            <i className="bi bi-exclamation-triangle"></i>
            <span>{error}</span>
          </div>
        )}
        {!hasSelection && !error && (
          <div className="calendar-overlay">
            <i className="bi bi-calendar-plus"></i>
            <span>Seleccione secciones de cursos para generar un horario</span>
          </div>
        )}
      </div>
    </div>
  );
}
