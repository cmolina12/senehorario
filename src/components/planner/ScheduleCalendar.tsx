"use client";

import type { CalendarOptions, EventClickArg, EventInput } from "@fullcalendar/core";
import esLocale from "@fullcalendar/core/locales/es";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { useEffect, useMemo, useState } from "react";
import { CALENDAR_BASE_DATE, type EventProps } from "@/lib/calendar-events";
import type { SelectedEventInfo } from "./usePlanner";

const DAY_ABBREVIATIONS: Record<string, string> = {
  Lunes: "L",
  Martes: "M",
  Miércoles: "I",
  Jueves: "J",
  Viernes: "V",
  Sábado: "S",
  Domingo: "D",
};

const SMALL_SCREEN = "(max-width: 768px)";

function useIsSmallScreen() {
  const [small, setSmall] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(SMALL_SCREEN);
    const update = () => setSmall(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return small;
}

function eventInfoFromClick(arg: EventClickArg): SelectedEventInfo {
  const ext = arg.event.extendedProps as EventProps;
  // Split events show two courses; pick the half that was clicked.
  if (ext.splitSectionB) {
    const rect = arg.el.getBoundingClientRect();
    if (arg.jsEvent.clientX > rect.left + rect.width / 2) {
      const b = ext.splitSectionB;
      return {
        section: b,
        courseCode: ext.splitCourseCodeB ?? b.courseCode,
        courseTitle: b.courseTitle,
        courseCredits: b.courseCredits,
      };
    }
  }
  return {
    section: ext.section,
    courseCode: ext.courseCode || ext.section.courseCode,
    courseTitle: ext.courseTitle || ext.section.courseTitle,
    courseCredits: ext.courseCredits ?? ext.section.courseCredits,
  };
}

interface Props {
  events: EventInput[];
  onEventClick: (info: SelectedEventInfo) => void;
}

export default function ScheduleCalendar({ events, onEventClick }: Props) {
  const isSmall = useIsSmallScreen();

  const options = useMemo<CalendarOptions>(
    () => ({
      plugins: [timeGridPlugin, dayGridPlugin, interactionPlugin],
      locales: [esLocale],
      locale: "es",
      dayHeaderContent: (arg) => {
        const name = arg.date.toLocaleDateString("es-ES", { weekday: "long" });
        const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
        return isSmall ? (DAY_ABBREVIATIONS[capitalized] ?? capitalized.charAt(0)) : capitalized;
      },
      initialDate: CALENDAR_BASE_DATE,
      height: 600,
      contentHeight: 600,
      initialView: "timeGridWeek",
      headerToolbar: false,
      slotMinTime: "06:00:00",
      slotMaxTime: "21:00:00",
      allDaySlot: false,
      dayHeaderFormat: { weekday: "long" },
      hiddenDays: [0], // Sunday
      slotDuration: "01:00:00",
      slotLabelInterval: "01:00",
      slotLabelFormat: { hour: "2-digit", minute: "2-digit", hour12: true },
      // Titles are pre-escaped HTML built in lib/calendar-events.ts
      eventContent: (arg) => ({ html: arg.event.title }),
      eventDidMount: (info) => {
        const { splitColorA, splitColorB } = info.event.extendedProps as EventProps;
        if (splitColorA && splitColorB) {
          info.el.style.background = `linear-gradient(to right, ${splitColorA} 50%, ${splitColorB} 50%)`;
          info.el.style.borderColor = splitColorA;
        }
      },
      eventClick: (arg) => onEventClick(eventInfoFromClick(arg)),
    }),
    [isSmall, onEventClick],
  );

  return <FullCalendar {...options} events={events} />;
}
