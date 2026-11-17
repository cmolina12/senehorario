"use client";

import type { CalendarOptions, EventClickArg, EventInput } from "@fullcalendar/core";
import esLocale from "@fullcalendar/core/locales/es";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { useMemo, useState } from "react";
import { CALENDAR_BASE_DATE, type EventProps, type VisibleRange } from "@/lib/calendar-events";
import type { SelectedEventInfo } from "./usePlanner";

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
        color: ext.splitColorB,
      };
    }
  }
  return {
    section: ext.section,
    courseCode: ext.courseCode || ext.section.courseCode,
    courseTitle: ext.courseTitle || ext.section.courseTitle,
    courseCredits: ext.courseCredits ?? ext.section.courseCredits,
    color: ext.color,
  };
}

interface Props {
  events: EventInput[];
  range: VisibleRange;
  onEventClick: (info: SelectedEventInfo) => void;
}

/** Identity of a block across options: same section, same time slot. */
function eventKey(e: EventInput): string {
  const section = (e.extendedProps as Partial<EventProps> | undefined)?.section;
  return section ? `${section.term}-${section.nrc}-${String(e.start)}` : String(e.id ?? e.start);
}

/**
 * Marks blocks that weren't on screen before (new option, added section) so
 * they animate in; blocks that stay put don't move, which makes the change
 * easy to spot.
 */
function useNewEventKeys(events: EventInput[]): Set<string> {
  const [previous, setPrevious] = useState(events);
  const [fresh, setFresh] = useState(() => new Set(events.map(eventKey)));
  if (events !== previous) {
    const before = new Set(previous.map(eventKey));
    setFresh(new Set(events.map(eventKey).filter((k) => !before.has(k))));
    setPrevious(events);
  }
  return fresh;
}

export default function ScheduleCalendar({ events, range, onEventClick }: Props) {
  const freshKeys = useNewEventKeys(events);
  const marked = useMemo(
    () =>
      events.map((e) =>
        freshKeys.has(eventKey(e)) ? { ...e, classNames: [...((e.classNames as string[]) ?? []), "ev-new"] } : e,
      ),
    [events, freshKeys],
  );

  const options = useMemo<CalendarOptions>(
    () => ({
      plugins: [timeGridPlugin, interactionPlugin],
      locales: [esLocale],
      locale: "es",
      initialDate: CALENDAR_BASE_DATE,
      initialView: "timeGridWeek",
      headerToolbar: false,
      height: "auto",
      allDaySlot: false,
      expandRows: true,
      slotMinTime: range.slotMinTime,
      slotMaxTime: range.slotMaxTime,
      hiddenDays: range.hiddenDays,
      slotDuration: "01:00:00",
      slotLabelInterval: "01:00",
      slotLabelFormat: { hour: "numeric", minute: "2-digit", hour12: true, meridiem: "short" },
      dayHeaderContent: (arg) => {
        const name = arg.date.toLocaleDateString("es-ES", { weekday: "short" }).replace(".", "");
        return name.charAt(0).toUpperCase() + name.slice(1);
      },
      // Titles are pre-escaped HTML built in lib/calendar-events.ts
      eventContent: (arg) => ({ html: arg.event.title }),
      eventDidMount: (info) => {
        const { color, splitColorB } = info.event.extendedProps as Partial<EventProps>;
        if (color) info.el.style.setProperty("--ev", color);
        if (splitColorB) info.el.style.setProperty("--ev-b", splitColorB);
      },
      eventClick: (arg) => {
        if (arg.event.display === "background") return;
        onEventClick(eventInfoFromClick(arg));
      },
    }),
    [range, onEventClick],
  );

  return <FullCalendar {...options} events={marked} />;
}
