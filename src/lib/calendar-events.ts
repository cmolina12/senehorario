// Converts generated schedules into FullCalendar events, including the special
// rendering for half-semester (8A/8B) sections. Event markup is styled by the
// .ev* rules in globals.css.

import type { EventInput } from "@fullcalendar/core";
import { shortTime, titleCase } from "./format";
import { meetingsOverlap, toMinutes } from "./scheduler";
import { sectionKey, type DayOfWeek, type Meeting, type ScheduledSection, type Section } from "./types";

// Color palette for courses (matches the university's official platform)
export const COURSE_COLORS = [
  "#67A6D4",
  "#A05DD4",
  "#E1A557",
  "#C78A6B",
  "#E1628B",
  "#9595FF",
  "#81BA6C",
  "#62E1C9",
];

/** Color for a course, by its position among the selected courses. */
export function courseColor(codes: string[], code: string): string {
  const idx = Math.max(0, codes.indexOf(code));
  return COURSE_COLORS[idx % COURSE_COLORS.length];
}

// Fixed week the calendar displays (Monday 2025-07-28).
export const CALENDAR_BASE_DATE = "2025-07-28";

const DAY_OFFSET: Record<DayOfWeek, number> = {
  MONDAY: 0,
  TUESDAY: 1,
  WEDNESDAY: 2,
  THURSDAY: 3,
  FRIDAY: 4,
  SATURDAY: 5,
  SUNDAY: 6,
};

export interface EventProps {
  section: ScheduledSection;
  courseCode: string;
  courseTitle?: string;
  courseCredits?: number;
  color: string;
  /** Second course sharing a split 8A/8B event. */
  splitColorB?: string;
  splitSectionB?: ScheduledSection;
  splitCourseCodeB?: string;
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Local (timezone-less) ISO datetime for a meeting time in the display week. */
function toDateTime(day: DayOfWeek, time: string): string {
  const d = new Date(`${CALENDAR_BASE_DATE}T00:00:00`);
  d.setDate(d.getDate() + DAY_OFFSET[day]);
  const [h, m] = time.split(":");
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return `${date}T${h.padStart(2, "0")}:${(m ?? "00").padStart(2, "0")}:00`;
}

function makeEvent(
  section: ScheduledSection,
  meeting: Meeting,
  color: string,
  html: string,
  classNames: string[],
  extra: Partial<EventProps> = {},
): EventInput {
  const extendedProps: EventProps = {
    section,
    courseCode: section.courseCode,
    courseTitle: section.courseTitle,
    courseCredits: section.courseCredits,
    color,
    ...extra,
  };
  return {
    title: html,
    start: toDateTime(meeting.day, meeting.start),
    end: toDateTime(meeting.day, meeting.end),
    classNames,
    extendedProps,
  };
}

const badge = (ptrm: string) => `<span class="ev-badge">${escapeHtml(ptrm)}</span>`;

function eventHtml(heading: string, sec: ScheduledSection, meeting: Meeting): string {
  return (
    `<div class="ev">` +
    `<div class="ev-code">${heading}</div>` +
    `<div class="ev-title">${escapeHtml(titleCase(sec.courseTitle ?? ""))}</div>` +
    `<div class="ev-time">${shortTime(meeting.start)}–${shortTime(meeting.end)}</div>` +
    `</div>`
  );
}

const heading = (sec: ScheduledSection, extra = "") =>
  `${escapeHtml(sec.courseCode)} · ${escapeHtml(sec.sectionId)}${extra}`;

export function scheduleToEvents(schedule: ScheduledSection[]): EventInput[] {
  const uniqueCourses = [...new Set(schedule.map((s) => s.courseCode))];
  const colorFor = (code: string) => courseColor(uniqueCourses, code);

  const sectionsByCourse = new Map<string, ScheduledSection[]>();
  for (const sec of schedule) {
    const list = sectionsByCourse.get(sec.courseCode) ?? [];
    list.push(sec);
    sectionsByCourse.set(sec.courseCode, list);
  }

  const events: EventInput[] = [];
  const handled = new Set<string>();

  // Pass 1: same-course 8A+8B -> one combined event per meeting
  for (const [courseCode, sections] of sectionsByCourse) {
    const color = colorFor(courseCode);
    const s8A = sections.find((s) => s.ptrm === "8A");
    const s8B = sections.find((s) => s.ptrm === "8B");
    if (!s8A || !s8B) continue;

    handled.add(sectionKey(s8A));
    handled.add(sectionKey(s8B));
    for (const m of s8A.meetings) {
      const html = eventHtml(`${escapeHtml(courseCode)}${badge("8A")}${badge("8B")}`, s8A, m);
      events.push(makeEvent(s8A, m, color, html, ["ptrm-combined"]));
    }
    for (const sec of sections.filter((s) => s !== s8A && s !== s8B)) {
      handled.add(sectionKey(sec));
      for (const m of sec.meetings) events.push(makeEvent(sec, m, color, eventHtml(heading(sec), sec, m), []));
    }
  }

  // Pass 2: flat meeting list for remaining sections
  type Entry = { sec: ScheduledSection; meeting: Meeting; color: string };
  const entries: Entry[] = [];
  for (const [courseCode, sections] of sectionsByCourse) {
    const color = colorFor(courseCode);
    for (const sec of sections) {
      if (handled.has(sectionKey(sec))) continue;
      for (const meeting of sec.meetings) entries.push({ sec, meeting, color });
    }
  }

  // Pass 3: cross-course 8A+8B overlapping meetings -> split event
  const used = new Set<number>();
  for (let i = 0; i < entries.length; i++) {
    if (used.has(i)) continue;
    const eA = entries[i];
    if (eA.sec.ptrm !== "8A") continue;
    for (let j = 0; j < entries.length; j++) {
      if (i === j || used.has(j)) continue;
      const eB = entries[j];
      if (eB.sec.ptrm !== "8B" || eA.sec.courseCode === eB.sec.courseCode) continue;
      if (!meetingsOverlap(eA.meeting, eB.meeting)) continue;
      used.add(i);
      used.add(j);
      const html =
        `<div class="ev-split">` +
        eventHtml(heading(eA.sec, badge("8A")), eA.sec, eA.meeting) +
        eventHtml(heading(eB.sec, badge("8B")), eB.sec, eB.meeting) +
        `</div>`;
      // Use the later of the two end times so neither section gets cut off
      const longerEnd =
        toMinutes(eA.meeting.end) >= toMinutes(eB.meeting.end)
          ? eA.meeting
          : { ...eA.meeting, end: eB.meeting.end };
      events.push(
        makeEvent(eA.sec, longerEnd, eA.color, html, ["ptrm-split"], {
          splitColorB: eB.color,
          splitSectionB: eB.sec,
          splitCourseCodeB: eB.sec.courseCode,
        }),
      );
      break;
    }
  }

  // Pass 4: remaining meetings rendered normally
  for (let i = 0; i < entries.length; i++) {
    if (used.has(i)) continue;
    const { sec, meeting, color } = entries[i];
    const isHalf = sec.ptrm === "8A" || sec.ptrm === "8B";
    const cls = isHalf ? [`ptrm-${sec.ptrm.toLowerCase()}`] : [];
    events.push(makeEvent(sec, meeting, color, eventHtml(heading(sec, isHalf ? badge(sec.ptrm) : ""), sec, meeting), cls));
  }

  return events;
}

export interface VisibleRange {
  slotMinTime: string; // "07:00:00"
  slotMaxTime: string;
  hiddenDays: number[]; // FullCalendar day numbers (0 = Sunday)
}

const DEFAULT_START_HOUR = 7;
const DEFAULT_END_HOUR = 18;

/**
 * Hours and days the calendar should show for a set of candidate sections:
 * fitted to their meetings (so switching options doesn't make the grid jump),
 * never narrower than 7:00–18:00, and Saturday only when something meets then.
 */
export function visibleRange(sections: Section[], extra: Meeting[] = []): VisibleRange {
  const meetings = [...sections.flatMap((s) => s.meetings), ...extra];
  let start = DEFAULT_START_HOUR;
  let end = DEFAULT_END_HOUR;
  for (const m of meetings) {
    start = Math.min(start, Math.floor(toMinutes(m.start) / 60));
    end = Math.max(end, Math.ceil(toMinutes(m.end) / 60));
  }
  const hh = (h: number) => `${String(Math.max(0, Math.min(24, h))).padStart(2, "0")}:00:00`;
  const hasSaturday = meetings.some((m) => m.day === "SATURDAY");
  return {
    slotMinTime: hh(start),
    slotMaxTime: hh(end),
    hiddenDays: hasSaturday ? [0] : [0, 6],
  };
}

/** Blocked time drawn as striped background areas (not clickable). */
export function blockEvents(blocks: { id: string; day: DayOfWeek; start: string; end: string; label?: string }[]): EventInput[] {
  return blocks.map((b) => ({
    id: `block-${b.id}`,
    start: toDateTime(b.day, b.start),
    end: toDateTime(b.day, b.end),
    display: "background",
    classNames: ["block-event"],
    title: `<div class="block-label"><i class="bi bi-slash-circle"></i> ${escapeHtml(b.label || "Bloqueado")}</div>`,
  }));
}
