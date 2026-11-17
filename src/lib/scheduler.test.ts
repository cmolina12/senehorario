import { describe, expect, it } from "vitest";
import {
  fitsInSchedule,
  generateAllSchedules,
  mergeHalfSemesterPairs,
  sectionsConflict,
} from "./scheduler";
import type { DayOfWeek, Meeting, ScheduledSection, Section } from "./types";

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
});

describe("fitsInSchedule", () => {
  it("rejects a section that overlaps the schedule", () => {
    const sched = [section("1", [meeting("MONDAY", "09:00", "10:00")])];
    expect(fitsInSchedule(section("2", [meeting("MONDAY", "09:30", "10:30")]), sched)).toBe(false);
    expect(fitsInSchedule(section("3", [meeting("FRIDAY", "09:30", "10:30")]), sched)).toBe(true);
  });
});
