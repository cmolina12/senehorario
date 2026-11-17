// Converts generated schedules into FullCalendar events, including the special
// rendering for half-semester (8A/8B) sections.

import type { EventInput } from "@fullcalendar/core";
import { meetingsOverlap } from "./scheduler";
import { sectionKey, type DayOfWeek, type Meeting, type ScheduledSection } from "./types";

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
  splitColorA?: string;
  splitColorB?: string;
  splitSectionB?: ScheduledSection;
  splitCourseCodeB?: string;
}

function escapeHtml(text: string): string {
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
  bgColor: string,
  titleHtml: string,
  classNames: string[],
  extra: Partial<EventProps> = {},
): EventInput {
  const extendedProps: EventProps = {
    section,
    courseCode: section.courseCode,
    courseTitle: section.courseTitle,
    courseCredits: section.courseCredits,
    ...extra,
  };
  return {
    title: titleHtml,
    start: toDateTime(meeting.day, meeting.start),
    end: toDateTime(meeting.day, meeting.end),
    color: bgColor,
    textColor: "rgb(34, 34, 34)",
    classNames,
    extendedProps,
  };
}

const ptrmBadge = (ptrm: string) =>
  `<span class="event-ptrm-badge event-ptrm-${ptrm.toLowerCase()}">${ptrm}</span>`;

function eventBody(heading: string, title: string | undefined): string {
  return `<div class="fc-event-content-wrapper"><div class="fc-event-course">${heading}</div><div class="fc-event-title">${escapeHtml(title ?? "")}</div></div>`;
}

export function scheduleToEvents(schedule: ScheduledSection[]): EventInput[] {
  const uniqueCourses = [...new Set(schedule.map((s) => s.courseCode))];
  const colorFor = (code: string) =>
    COURSE_COLORS[uniqueCourses.indexOf(code) % COURSE_COLORS.length];

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
    const bgColor = colorFor(courseCode);
    const s8A = sections.find((s) => s.ptrm === "8A");
    const s8B = sections.find((s) => s.ptrm === "8B");
    if (!s8A || !s8B) continue;

    handled.add(sectionKey(s8A));
    handled.add(sectionKey(s8B));
    const code = escapeHtml(courseCode);
    const title = eventBody(`${code} ${ptrmBadge("8A")}${ptrmBadge("8B")}`, s8A.courseTitle);
    for (const m of s8A.meetings) {
      events.push(makeEvent(s8A, m, bgColor, title, ["ptrm-combined"]));
    }
    for (const sec of sections.filter((s) => s !== s8A && s !== s8B)) {
      handled.add(sectionKey(sec));
      const t = eventBody(`${code} - ${escapeHtml(sec.sectionId)}`, sec.courseTitle);
      for (const m of sec.meetings) events.push(makeEvent(sec, m, bgColor, t, []));
    }
  }

  // Pass 2: flat meeting list for remaining sections
  type Entry = { sec: ScheduledSection; meeting: Meeting; bgColor: string };
  const entries: Entry[] = [];
  for (const [courseCode, sections] of sectionsByCourse) {
    const bgColor = colorFor(courseCode);
    for (const sec of sections) {
      if (handled.has(sectionKey(sec))) continue;
      for (const meeting of sec.meetings) entries.push({ sec, meeting, bgColor });
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
      const half = (e: Entry, ptrm: string) =>
        `<div class="fc-event-split-half"><div class="fc-event-course">${escapeHtml(e.sec.courseCode)} - ${escapeHtml(e.sec.sectionId)} ${ptrmBadge(ptrm)}</div><div class="fc-event-title">${escapeHtml(e.sec.courseTitle ?? "")}</div></div>`;
      const splitTitle = `<div class="fc-event-split-wrapper">${half(eA, "8A")}<div class="fc-event-split-divider"></div>${half(eB, "8B")}</div>`;
      // Use the later of the two end times so neither section gets cut off
      const longerEnd =
        eA.meeting.end >= eB.meeting.end ? eA.meeting : { ...eA.meeting, end: eB.meeting.end };
      events.push(
        makeEvent(eA.sec, longerEnd, eA.bgColor, splitTitle, ["ptrm-split"], {
          splitColorA: eA.bgColor,
          splitColorB: eB.bgColor,
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
    const { sec, meeting, bgColor } = entries[i];
    const isHalf = sec.ptrm === "8A" || sec.ptrm === "8B";
    const badge = isHalf ? ptrmBadge(sec.ptrm) : "";
    const cls = isHalf ? [`ptrm-${sec.ptrm.toLowerCase()}`] : [];
    const title = eventBody(
      `${escapeHtml(sec.courseCode)} - ${escapeHtml(sec.sectionId)}${badge}`,
      sec.courseTitle,
    );
    events.push(makeEvent(sec, meeting, bgColor, title, cls));
  }

  return events;
}
