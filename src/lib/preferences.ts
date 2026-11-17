// Schedule preferences: how to order the generated options, which hours and
// days to keep free, and blocked time (work, lunch, sports…).

import { meetingsOverlap, toMinutes } from "./scheduler";
import type { DayOfWeek, Section } from "./types";

export type SortMode = "default" | "fewestGaps" | "fewestDays" | "lateStart" | "earlyEnd" | "mostSeats";

export const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "default", label: "Recomendado" },
  { value: "fewestGaps", label: "Menos huecos" },
  { value: "fewestDays", label: "Menos días" },
  { value: "lateStart", label: "Empezar más tarde" },
  { value: "earlyEnd", label: "Terminar más temprano" },
  { value: "mostSeats", label: "Más cupos libres" },
];

export interface TimeBlock {
  id: string;
  day: DayOfWeek;
  start: string; // "HH:mm"
  end: string;
  label?: string;
}

export interface Preferences {
  sort: SortMode;
  /** No classes starting before this time ("HH:mm"), or null. */
  earliestStart: string | null;
  /** No classes ending after this time ("HH:mm"), or null. */
  latestEnd: string | null;
  freeDays: DayOfWeek[];
  blocks: TimeBlock[];
}

export const DEFAULT_PREFERENCES: Preferences = {
  sort: "default",
  earliestStart: null,
  latestEnd: null,
  freeDays: [],
  blocks: [],
};

/** Number of active filters (sorting doesn't count), for the button badge. */
export function activeFilterCount(p: Preferences): number {
  return (p.earliestStart ? 1 : 0) + (p.latestEnd ? 1 : 0) + p.freeDays.length + p.blocks.length;
}

/** Why a section is excluded by the preferences, or null if it's allowed. */
export function sectionConflict(section: Section, p: Preferences): string | null {
  for (const m of section.meetings) {
    if (p.freeDays.includes(m.day)) return "día libre";
    if (p.earliestStart && toMinutes(m.start) < toMinutes(p.earliestStart)) return "hora de inicio";
    if (p.latestEnd && toMinutes(m.end) > toMinutes(p.latestEnd)) return "hora de salida";
    for (const b of p.blocks) {
      if (meetingsOverlap(m, { day: b.day, start: b.start, end: b.end, location: "" })) return "bloque";
    }
  }
  return null;
}

export interface ScheduleStats {
  /** Distinct days with classes. */
  days: number;
  /** Minutes of free time between classes, summed over the week. */
  gapMinutes: number;
  /** Earliest class start of the week (minutes). */
  earliestStart: number;
  /** Latest class end of the week (minutes). */
  latestEnd: number;
  /** Average first-class start across days with classes (minutes). */
  avgStart: number;
  /** Average last-class end across days with classes (minutes). */
  avgEnd: number;
  /** Free seats in the option's fullest section: the one most likely to fill up first. */
  minSeats: number;
  /** Free seats across all its sections. */
  totalSeats: number;
}

export function scheduleStats(sections: Section[]): ScheduleStats {
  const byDay = new Map<DayOfWeek, [number, number][]>();
  for (const s of sections) {
    for (const m of s.meetings) {
      const list = byDay.get(m.day) ?? [];
      list.push([toMinutes(m.start), toMinutes(m.end)]);
      byDay.set(m.day, list);
    }
  }

  let gapMinutes = 0;
  const starts: number[] = [];
  const ends: number[] = [];
  for (const intervals of byDay.values()) {
    intervals.sort((a, b) => a[0] - b[0]);
    starts.push(intervals[0][0]);
    let curEnd = intervals[0][1];
    for (const [s, e] of intervals.slice(1)) {
      if (s > curEnd) gapMinutes += s - curEnd;
      curEnd = Math.max(curEnd, e);
    }
    ends.push(curEnd);
  }

  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  return {
    days: byDay.size,
    gapMinutes,
    earliestStart: starts.length ? Math.min(...starts) : 0,
    latestEnd: ends.length ? Math.max(...ends) : 0,
    avgStart: avg(starts),
    avgEnd: avg(ends),
    minSeats: sections.length ? Math.min(...sections.map((s) => s.availableSeats)) : 0,
    totalSeats: sections.reduce((sum, s) => sum + s.availableSeats, 0),
  };
}

/** Orders options by the chosen mode; "default" keeps generation order. Stable. */
export function sortSchedules<T extends Section>(schedules: T[][], mode: SortMode): T[][] {
  if (mode === "default") return schedules;
  const keyed = schedules.map((schedule, i) => ({ schedule, i, s: scheduleStats(schedule) }));
  const cmp: Record<Exclude<SortMode, "default">, (a: ScheduleStats, b: ScheduleStats) => number> = {
    fewestGaps: (a, b) => a.gapMinutes - b.gapMinutes || a.days - b.days,
    fewestDays: (a, b) => a.days - b.days || a.gapMinutes - b.gapMinutes,
    lateStart: (a, b) => b.earliestStart - a.earliestStart || b.avgStart - a.avgStart,
    earlyEnd: (a, b) => a.latestEnd - b.latestEnd || a.avgEnd - b.avgEnd,
    mostSeats: (a, b) => b.minSeats - a.minSeats || b.totalSeats - a.totalSeats,
  };
  keyed.sort((a, b) => cmp[mode](a.s, b.s) || a.i - b.i);
  return keyed.map((k) => k.schedule);
}

/** Normalizes stored preferences (older or hand-edited data). */
export function toPreferences(data: unknown): Preferences {
  if (!data || typeof data !== "object") return DEFAULT_PREFERENCES;
  const d = data as Partial<Preferences>;
  const time = (v: unknown) => (typeof v === "string" && /^\d{2}:\d{2}$/.test(v) ? v : null);
  return {
    sort: SORT_OPTIONS.some((o) => o.value === d.sort) ? (d.sort as SortMode) : "default",
    earliestStart: time(d.earliestStart),
    latestEnd: time(d.latestEnd),
    freeDays: Array.isArray(d.freeDays) ? d.freeDays.filter((x): x is DayOfWeek => typeof x === "string") : [],
    blocks: Array.isArray(d.blocks)
      ? d.blocks
          .filter(
            (b): b is TimeBlock =>
              !!b && typeof b === "object" && typeof b.day === "string" && !!time(b.start) && !!time(b.end) && b.start < b.end,
          )
          .map((b, i) => ({ ...b, id: typeof b.id === "string" && b.id ? b.id : `block-${i}` }))
      : [],
  };
}
