import { describe, expect, it } from "vitest";
import {
  explainNoSchedules,
  fitsInSchedule,
  generateAllSchedules,
  mergeHalfSemesterPairs,
  sectionsConflict,
} from "./scheduler";
import { sectionKey, type DayOfWeek, type Meeting, type ScheduledSection, type Section } from "./types";

const meeting = (day: DayOfWeek, start: string, end: string): Meeting => ({
  day,
  start: `${start}:00`,
  end: `${end}:00`,
  location: ".A_101",
});

const section = (nrc: string, meetings: Meeting[], ptrm = "1"): Section => ({
  nrc,
  sectionId: nrc.slice(-1),
  term: "202519",
  ptrm,
  campus: "CAMPUS PRINCIPAL",
  meetings,
  professors: ["PROF. A"],
  availableSeats: 5,
  totalSeats: 30,
  attrs: [],
});

const nrcs = (schedules: Section[][]) => schedules.map((s) => s.map((x) => x.nrc));

describe("generateAllSchedules", () => {
  it("one course with two non-overlapping sections -> two schedules", () => {
    const s1 = section("11060", [meeting("MONDAY", "09:00", "10:00")]);
    const s2 = section("11061", [meeting("MONDAY", "10:00", "11:00")]);
    expect(nrcs(generateAllSchedules([[s1, s2]]))).toEqual([["11060"], ["11061"]]);
  });

  it("two courses whose only sections overlap -> no schedules", () => {
    const a = section("1", [meeting("MONDAY", "09:00", "10:30")]);
    const b = section("2", [meeting("MONDAY", "10:00", "11:00")]);
    expect(generateAllSchedules([[a], [b]])).toEqual([]);
  });

  it("multiple courses with one section each -> one schedule with all of them", () => {
    const a = section("1", [meeting("MONDAY", "09:00", "10:00")]);
    const b = section("2", [meeting("TUESDAY", "09:00", "10:00")]);
    const c = section("3", [meeting("WEDNESDAY", "09:00", "10:00")]);
    expect(nrcs(generateAllSchedules([[a], [b], [c]]))).toEqual([["1", "2", "3"]]);
  });

  it("keeps only non-overlapping combinations", () => {
    const a1 = section("a1", [meeting("MONDAY", "08:00", "09:20")]);
    const a2 = section("a2", [meeting("MONDAY", "11:00", "12:20")]);
    const b1 = section("b1", [meeting("MONDAY", "08:30", "09:50")]);
    const b2 = section("b2", [meeting("TUESDAY", "08:00", "09:20")]);
    expect(nrcs(generateAllSchedules([[a1, a2], [b1, b2]]))).toEqual([
      ["a1", "b2"],
      ["a2", "b1"],
      ["a2", "b2"],
    ]);
  });

  it("empty input -> no schedules", () => {
    expect(generateAllSchedules([])).toEqual([]);
  });

  it("considers every meeting of a multi-meeting section", () => {
    const a = section("1", [meeting("MONDAY", "09:00", "10:00"), meeting("WEDNESDAY", "09:00", "10:00")]);
    const b = section("2", [meeting("WEDNESDAY", "09:30", "10:30")]);
    expect(generateAllSchedules([[a], [b]])).toEqual([]);
  });

  it("same time on different days does not conflict", () => {
    const a = section("1", [meeting("MONDAY", "09:00", "10:00")]);
    const b = section("2", [meeting("TUESDAY", "09:00", "10:00")]);
    expect(generateAllSchedules([[a], [b]])).toHaveLength(1);
  });

  it("back-to-back meetings do not conflict", () => {
    const a = section("1", [meeting("MONDAY", "10:00", "11:00")]);
    const b = section("2", [meeting("MONDAY", "11:00", "12:00")]);
    expect(generateAllSchedules([[a], [b]])).toHaveLength(1);
  });

  it("8A and 8B sections never conflict, but either conflicts with a 16-week section", () => {
    const m = meeting("MONDAY", "09:00", "10:00");
    expect(sectionsConflict(section("1", [m], "8A"), section("2", [m], "8B"))).toBe(false);
    expect(sectionsConflict(section("1", [m], "8A"), section("2", [m], "8A"))).toBe(true);
    expect(sectionsConflict(section("1", [m], "1"), section("2", [m], "8B"))).toBe(true);
    // Other period codes (e.g. "2") span the whole semester too.
    expect(sectionsConflict(section("1", [m], "2"), section("2", [m], "8A"))).toBe(true);
  });

  it("sections from different terms never conflict", () => {
    const m = meeting("MONDAY", "09:00", "10:00");
    expect(sectionsConflict(section("1", [m]), { ...section("2", [m]), term: "202710" })).toBe(false);
  });

  it("handles legacy HH:mm times from older saved plans", () => {
    const a = section("1", [{ day: "MONDAY", start: "07:00", end: "08:00", location: "" }]);
    const b = section("2", [meeting("MONDAY", "08:00", "09:00")]);
    expect(generateAllSchedules([[a], [b]])).toHaveLength(1);
  });

  it("stops at the given limit", () => {
    const course = (prefix: string) =>
      Array.from({ length: 10 }, (_, i) => section(`${prefix}${i}`, []));
    expect(generateAllSchedules([course("a"), course("b"), course("c")], 50)).toHaveLength(50);
  });
});

describe("sectionsConflict with dates", () => {
  const dated = (m: Meeting, startDate: string, endDate: string): Meeting => ({ ...m, startDate, endDate });

  it("ignores same-slot meetings that run in different weeks", () => {
    // DECA1101: a Wednesday slot only during the first month.
    const early = section("1", [dated(meeting("WEDNESDAY", "14:00", "15:20"), "2027-01-25", "2027-02-20")], "2");
    const late = section("2", [dated(meeting("WEDNESDAY", "14:00", "15:20"), "2027-03-29", "2027-05-22")], "8B");
    expect(sectionsConflict(early, late)).toBe(false);
  });

  it("still clashes when the date ranges share a week, whatever the period code", () => {
    const sports = section("1", [dated(meeting("TUESDAY", "06:30", "07:50"), "2027-01-25", "2027-05-22")], "D");
    const half = section("2", [dated(meeting("TUESDAY", "07:00", "08:20"), "2027-01-25", "2027-03-20")], "8A");
    expect(sectionsConflict(sports, half)).toBe(true);
  });

  it("checks one-off sessions only on their date", () => {
    const weekly = section("1", [dated(meeting("SATURDAY", "08:00", "10:00"), "2026-08-03", "2026-11-28")]);
    const workshop = section("2", []);
    workshop.sessions = [dated(meeting("SATURDAY", "07:00", "09:50"), "2026-08-22", "2026-08-22")];
    const otherWorkshop = section("3", []);
    otherWorkshop.sessions = [dated(meeting("SATURDAY", "07:00", "09:50"), "2026-10-17", "2026-10-17")];
    expect(sectionsConflict(weekly, workshop)).toBe(true);
    expect(sectionsConflict(workshop, otherWorkshop)).toBe(false);
    expect(fitsInSchedule(workshop, [weekly])).toBe(false);
  });

  it("falls back to the period when saved meetings have no dates", () => {
    const a = section("1", [meeting("MONDAY", "09:00", "10:00")], "8A");
    const b = section("2", [meeting("MONDAY", "09:00", "10:00")], "8B");
    const c = section("3", [meeting("MONDAY", "09:00", "10:00")], "D");
    expect(sectionsConflict(a, b)).toBe(false);
    expect(sectionsConflict(a, c)).toBe(true);
  });
});

describe("explainNoSchedules", () => {
  it("names a pair of courses that clash in every section", () => {
    const a = [section("1", [meeting("MONDAY", "08:00", "09:20")])];
    const b = [section("2", [meeting("MONDAY", "09:00", "10:20")]), section("3", [meeting("MONDAY", "08:30", "09:50")])];
    const c = [section("4", [meeting("FRIDAY", "08:00", "09:20")])];
    expect(explainNoSchedules([a, c, b])).toEqual({ kind: "pairs", pairs: [[0, 2]] });
  });

  it("names the courses whose removal leaves schedules when no pair is to blame", () => {
    // Each pair can be combined, but not all three: A and B share Monday 8:00 / Tuesday 8:00 options.
    const a = [section("1", [meeting("MONDAY", "08:00", "09:00")]), section("2", [meeting("TUESDAY", "08:00", "09:00")])];
    const b = [section("3", [meeting("MONDAY", "08:00", "09:00")]), section("4", [meeting("TUESDAY", "08:00", "09:00")])];
    const c = [section("5", [meeting("MONDAY", "08:00", "09:00")]), section("6", [meeting("TUESDAY", "08:00", "09:00")])];
    expect(explainNoSchedules([a, b, c])).toEqual({ kind: "removable", slots: [0, 1, 2] });
  });
});

describe("mergeHalfSemesterPairs", () => {
  const tag = (s: Section, courseCode: string): ScheduledSection => ({ ...s, courseCode });

  it("merges options that differ only by an 8A/8B section of the same course", () => {
    const base = tag(section("x", [meeting("MONDAY", "07:00", "08:00")]), "AAAA1000");
    const half8A = tag(section("a", [meeting("TUESDAY", "07:00", "08:00")], "8A"), "BBBB1000");
    const half8B = tag(section("b", [meeting("TUESDAY", "07:00", "08:00")], "8B"), "BBBB1000");

    const merged = mergeHalfSemesterPairs([
      [base, half8A],
      [base, half8B],
    ]);
    expect(nrcs(merged)).toEqual([["x", "a", "b"]]);
  });

  it("leaves unrelated options alone", () => {
    const s1 = tag(section("1", []), "AAAA1000");
    const s2 = tag(section("2", []), "AAAA1000");
    expect(mergeHalfSemesterPairs([[s1], [s2]])).toHaveLength(2);
  });

  // The previous pairwise implementation, kept as the reference result.
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

  function pairwise(schedules: ScheduledSection[][]): ScheduledSection[][] {
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

  it("matches the pairwise merge on generated options", () => {
    // Courses with full-term, 8A and 8B sections; each course has its own hour.
    const days: DayOfWeek[] = ["MONDAY", "TUESDAY", "WEDNESDAY"];
    let nrc = 0;
    const course = (code: string, hour: number, ptrms: string[]) =>
      ptrms.map((ptrm, i) =>
        tag(section(String(++nrc), [meeting(days[i % 3], `${hour}:00`, `${hour}:50`)], ptrm), code),
      );
    const candidates = [
      course("AAAA1000", 10, ["8A", "8B", "1", "8A"]),
      course("BBBB1000", 11, ["8B", "8A", "8B"]),
      course("CCCC1000", 12, ["1", "1"]),
      course("DDDD1000", 13, ["8A", "8B"]),
    ];
    const schedules = generateAllSchedules(candidates);
    expect(schedules.length).toBeGreaterThan(5);
    const merged = mergeHalfSemesterPairs(schedules);
    expect(merged.length).toBeLessThan(schedules.length); // some pairs did merge
    expect(nrcs(merged)).toEqual(nrcs(pairwise(schedules)));
  });

  it("handles thousands of options quickly", () => {
    const many = Array.from({ length: 2000 }, (_, i) => [tag(section(`x${i}`, []), "AAAA1000"), tag(section(`y${i}`, []), "BBBB1000")]);
    const start = performance.now();
    expect(mergeHalfSemesterPairs(many)).toHaveLength(2000);
    expect(performance.now() - start).toBeLessThan(200);
  });
});

describe("fitsInSchedule", () => {
  it("rejects a section that overlaps the schedule", () => {
    const sched = [section("1", [meeting("MONDAY", "09:00", "10:00")])];
    expect(fitsInSchedule(section("2", [meeting("MONDAY", "09:30", "10:30")]), sched)).toBe(false);
    expect(fitsInSchedule(section("3", [meeting("FRIDAY", "09:30", "10:30")]), sched)).toBe(true);
  });
});
