// Schedule generation. Port of the Spring Boot ScheduleService, now run in the
// browser so there is no round trip per selection change.

import { sectionKey, type Meeting, type ScheduledSection, type Section } from "./types";

/**
 * Upper bound on generated combinations. The search is exponential in the
 * number of courses; past this point the UI would freeze and nobody browses
 * that many options anyway.
 */
export const MAX_SCHEDULES = 2000;

/** "HH:mm" or "HH:mm:ss" -> minutes since midnight. */
export function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

/**
 * Two academic periods overlap unless they are the disjoint halves 8A and 8B.
 * Any other period code ("1", "2", …) spans the whole semester.
 */
export function ptrmOverlaps(ptrm1: string, ptrm2: string): boolean {
  const halves = new Set([ptrm1, ptrm2]);
  return !(halves.size === 2 && halves.has("8A") && halves.has("8B"));
}

/** Same day and intersecting time ranges. Back-to-back meetings don't overlap. */
export function meetingsOverlap(m1: Meeting, m2: Meeting): boolean {
  return (
    m1.day === m2.day &&
    toMinutes(m1.start) < toMinutes(m2.end) &&
    toMinutes(m2.start) < toMinutes(m1.end)
  );
}

/**
 * Whether two meetings run during some common week. Uses their dates when
 * both have them; older saved plans have none, so fall back to the period.
 */
function sameWeeks(m1: Meeting, a: Section, m2: Meeting, b: Section): boolean {
  if (m1.startDate && m1.endDate && m2.startDate && m2.endDate) {
    return m1.startDate <= m2.endDate && m2.startDate <= m1.endDate;
  }
  return ptrmOverlaps(a.ptrm, b.ptrm);
}

/** Weekly meetings plus one-off dated sessions. */
const allMeetings = (s: Section) => (s.sessions?.length ? [...s.meetings, ...s.sessions] : s.meetings);

export function sectionsConflict(a: Section, b: Section): boolean {
  if (a.term !== b.term) return false; // different semesters never clash
  const mb = allMeetings(b);
  return allMeetings(a).some((m1) =>
    mb.some((m2) => meetingsOverlap(m1, m2) && sameWeeks(m1, a, m2, b)),
  );
}

/**
 * Every combination that picks one section per course with no time conflicts.
 * `candidates[i]` holds the candidate sections for course i; each result keeps
 * that order.
 */
export function generateAllSchedules<T extends Section>(
  candidates: T[][],
  limit = MAX_SCHEDULES,
): T[][] {
  const results: T[][] = [];
  const current: T[] = [];

  const backtrack = (idx: number) => {
    if (results.length >= limit) return;
    if (idx === candidates.length) {
      results.push([...current]);
      return;
    }
    for (const sec of candidates[idx]) {
      if (current.some((chosen) => sectionsConflict(chosen, sec))) continue;
      current.push(sec);
      backtrack(idx + 1);
      current.pop();
    }
  };

  if (candidates.length > 0) backtrack(0);
  return results;
}

/**
 * Two options that differ only in one course, where one uses its 8A section
 * and the other its 8B section, are really the same weekly plan. Merge them
 * into a single option that contains both half-semester sections.
 */
export function mergeHalfSemesterPairs(schedules: ScheduledSection[][]): ScheduledSection[][] {
  const result: ScheduledSection[][] = [];
  const used = new Set<number>();

  for (let i = 0; i < schedules.length; i++) {
    if (used.has(i)) continue;
    let merged: ScheduledSection[] | null = null;

    for (let j = i + 1; j < schedules.length; j++) {
      if (used.has(j)) continue;
      merged = tryMerge(schedules[i], schedules[j]);
      if (merged) {
        used.add(j);
        break;
      }
    }

    result.push(merged ?? schedules[i]);
    used.add(i);
  }
  return result;
}

function tryMerge(a: ScheduledSection[], b: ScheduledSection[]): ScheduledSection[] | null {
  const keysA = new Set(a.map(sectionKey));
  const keysB = new Set(b.map(sectionKey));
  const inANotB = a.filter((s) => !keysB.has(sectionKey(s)));
  const inBNotA = b.filter((s) => !keysA.has(sectionKey(s)));
  if (inANotB.length !== 1 || inBNotA.length !== 1) return null;

  const [sA] = inANotB;
  const [sB] = inBNotA;
  if (sA.courseCode !== sB.courseCode) return null;

  const ptrms = new Set([sA.ptrm, sB.ptrm]);
  if (!ptrms.has("8A") || !ptrms.has("8B")) return null;

  return [...a, sB];
}

export type NoScheduleReason =
  /** Slot pairs (indices into the candidates) whose sections all clash with each other. */
  | { kind: "pairs"; pairs: [number, number][] }
  /** No single pair is to blame; dropping any one of these slots leaves schedules. */
  | { kind: "removable"; slots: number[] }
  | { kind: "unknown" };

/**
 * Why `candidates` produce no schedule, to point the student at the
 * culprit instead of "everything clashes".
 */
export function explainNoSchedules<T extends Section>(candidates: T[][]): NoScheduleReason {
  const pairs: [number, number][] = [];
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      if (candidates[i].every((a) => candidates[j].every((b) => sectionsConflict(a, b)))) pairs.push([i, j]);
    }
  }
  if (pairs.length > 0) return { kind: "pairs", pairs };

  const slots = candidates
    .map((_, i) => i)
    .filter((i) => generateAllSchedules(candidates.filter((_, j) => j !== i), 1).length > 0);
  return slots.length > 0 ? { kind: "removable", slots } : { kind: "unknown" };
}

/** Whether a section can be added to an existing schedule without conflicts. */
export function fitsInSchedule(section: Section, schedule: Section[]): boolean {
  if (section.meetings.length === 0 && !section.sessions?.length) return true;
  return !schedule.some((s) => sectionsConflict(section, s));
}
