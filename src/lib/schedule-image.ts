// What goes into the shareable schedule image, independent of how it's drawn
// (see schedule-image-draw.ts): the week's blocks laid out in lanes, one
// legend row per course, and notes for what the grid can't show.

import { courseColor } from "./calendar-events";
import { meetingDelivery, sessionLabel, sessionsSummary, shortTime, titleCase } from "./format";
import { toMinutes } from "./scheduler";
import type { DayOfWeek, ScheduledSection } from "./types";

const WEEKDAYS: DayOfWeek[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];

export interface ImageBlock {
  /** Index into `days`. */
  day: number;
  start: number; // minutes since midnight
  end: number;
  /** Side-by-side position when blocks overlap (8A/8B splits). */
  lane: number;
  lanes: number;
  color: string;
  code: string; // "ISIS1221"
  section: string | null; // null for a course's merged 8A+8B block
  half: "8A" | "8B" | "8A+8B" | null;
  title: string;
  time: string; // "6:30–7:50"
  online: boolean;
}

export interface LegendRow {
  color: string;
  code: string;
  title: string;
  detail: string; // "Sec. 2 · 8A · NRC 41887"
}

export interface ScheduleImageModel {
  days: DayOfWeek[];
  startHour: number;
  endHour: number;
  blocks: ImageBlock[];
  legend: LegendRow[];
  /** Sections without a weekly time and one-off dated sessions. */
  notes: string[];
}

const isHalf = (ptrm: string) => ptrm === "8A" || ptrm === "8B";

/** "06:30:00" -> "6:30", to keep blocks narrow. */
const compactTime = (time: string) => shortTime(time).replace(/^0/, "");

export function buildImageModel(
  schedule: ScheduledSection[],
  courseOrder: string[],
  { includeNrcs }: { includeNrcs: boolean },
): ScheduleImageModel {
  const colorOf = (code: string) => courseColor(courseOrder, code);

  // Same course, same slot in both halves (8A + 8B): one block, like the calendar.
  type Raw = Omit<ImageBlock, "day" | "lane" | "lanes"> & { dayName: DayOfWeek; halves: Set<string>; key: string };
  const raw = new Map<string, Raw>();
  for (const s of schedule) {
    for (const m of s.meetings) {
      const key = `${s.courseCode}|${m.day}|${m.start}|${m.end}`;
      const existing = raw.get(key);
      if (existing) {
        if (isHalf(s.ptrm)) existing.halves.add(s.ptrm);
        continue;
      }
      raw.set(key, {
        key,
        dayName: m.day,
        start: toMinutes(m.start),
        end: toMinutes(m.end),
        color: colorOf(s.courseCode),
        code: s.courseCode,
        section: s.sectionId,
        half: null,
        title: titleCase(s.courseTitle ?? ""),
        time: `${compactTime(m.start)}–${compactTime(m.end)}`,
        online: meetingDelivery(m.location) !== null,
        halves: new Set(isHalf(s.ptrm) ? [s.ptrm] : []),
      });
    }
  }
  const entries = [...raw.values()].map((b) => ({
    ...b,
    section: b.halves.size === 2 ? null : b.section,
    half: (b.halves.size === 2 ? "8A+8B" : ([...b.halves][0] ?? null)) as ImageBlock["half"],
  }));

  const usedDays = new Set(entries.map((b) => b.dayName));
  const days = [
    ...WEEKDAYS,
    ...(usedDays.has("SATURDAY") ? (["SATURDAY"] as const) : []),
    ...(usedDays.has("SUNDAY") ? (["SUNDAY"] as const) : []),
  ];

  const blocks: ImageBlock[] = [];
  days.forEach((dayName, day) => {
    const ofDay = entries
      .filter((b) => b.dayName === dayName)
      .sort((a, b) => a.start - b.start || a.end - b.end);
    // Group overlapping blocks and give each its own lane within the group.
    let group: ImageBlock[] = [];
    let groupEnd = -1;
    const flush = () => {
      const lanes = Math.max(1, ...group.map((b) => b.lane + 1));
      for (const b of group) blocks.push({ ...b, lanes });
      group = [];
    };
    for (const b of ofDay) {
      if (b.start >= groupEnd) flush();
      const laneEnds = new Map<number, number>();
      for (const g of group) laneEnds.set(g.lane, Math.max(laneEnds.get(g.lane) ?? 0, g.end));
      let lane = 0;
      while ((laneEnds.get(lane) ?? -1) > b.start) lane++;
      const { color, code, section, half, title, time, online, start, end } = b;
      group.push({ day, start, end, lane, lanes: 1, color, code, section, half, title, time, online });
      groupEnd = Math.max(groupEnd, b.end);
    }
    flush();
  });

  const starts = blocks.map((b) => b.start);
  const ends = blocks.map((b) => b.end);
  const startHour = blocks.length ? Math.floor(Math.min(...starts) / 60) : 7;
  const endHour = blocks.length ? Math.max(startHour + 4, Math.ceil(Math.max(...ends) / 60)) : 18;

  const legend: LegendRow[] = courseOrder
    .map((code) => schedule.filter((s) => s.courseCode === code))
    .filter((sections) => sections.length > 0)
    .map((sections) => {
      const [first] = sections;
      const parts = sections.map((s) => `Sec. ${s.sectionId}${isHalf(s.ptrm) ? ` (${s.ptrm})` : ""}`);
      if (includeNrcs) parts.push(`NRC ${sections.map((s) => s.nrc).join(", ")}`);
      return {
        color: colorOf(first.courseCode),
        code: first.courseCode,
        title: titleCase(first.courseTitle ?? ""),
        detail: parts.join(" · "),
      };
    });

  const notes: string[] = [];
  const unscheduled = schedule.filter((s) => s.meetings.length === 0 && !s.sessions?.length);
  if (unscheduled.length > 0) {
    notes.push(`Sin horario fijo: ${unscheduled.map((s) => s.courseCode).join(", ")}`);
  }
  for (const s of schedule) {
    const sessions = s.sessions ?? [];
    if (sessions.length === 0) continue;
    const text = sessions.length > 2 ? sessionsSummary(sessions) : sessions.map(sessionLabel).join("; ");
    notes.push(`${s.courseCode}: ${text}`);
  }

  return { days, startHour, endHour, blocks, legend, notes };
}
