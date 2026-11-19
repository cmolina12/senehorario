import { describe, expect, it } from "vitest";
import { filterCourses, hasActiveFilters, NO_FILTERS, toSearchFilters } from "./search-filters";
import type { Course, DayOfWeek, ScheduledSection, Section } from "./types";

const section = (nrc: string, over: Partial<Section> = {}, day: DayOfWeek = "MONDAY"): Section => ({
  nrc,
  sectionId: nrc,
  term: "202710",
  ptrm: "1",
  campus: "CAMPUS PRINCIPAL",
  meetings: [{ day, start: "08:00:00", end: "09:20:00", location: ".Edif. SD .SD_402" }],
  professors: [],
  availableSeats: 10,
  totalSeats: 30,
  attrs: [],
  level: "PRE",
  ...over,
});

const course = (code: string, sections: Section[]): Course => ({ code, title: code, credits: 3, sections });
const nrcs = (courses: Course[]) => courses.map((c) => `${c.code}:${c.sections.map((s) => s.nrc).join(",")}`);

describe("filterCourses", () => {
  const courses = [
    course("AAAA1000", [
      section("1"),
      section("2", { availableSeats: 0 }),
      section("3", { attrs: ["INGL"], ptrm: "8A" }),
      section("4", { meetings: [{ day: "TUESDAY", start: "17:00:00", end: "18:20:00", location: ".VIRTUAL .VIRT" }] }),
    ]),
    course("BBBB4000", [section("5", { level: "POS", ptrm: "8B" })]),
  ];

  it("keeps everything without filters and counts the original sections", () => {
    const result = filterCourses(courses, NO_FILTERS, null);
    expect(nrcs(result)).toEqual(["AAAA1000:1,2,3,4", "BBBB4000:5"]);
    expect(result[0].totalSections).toBe(4);
  });

  it("narrows sections and drops courses left empty", () => {
    expect(nrcs(filterCourses(courses, { ...NO_FILTERS, withSeats: true }, null))).toEqual(["AAAA1000:1,3,4", "BBBB4000:5"]);
    expect(nrcs(filterCourses(courses, { ...NO_FILTERS, english: true }, null))).toEqual(["AAAA1000:3"]);
    expect(nrcs(filterCourses(courses, { ...NO_FILTERS, level: "POS" }, null))).toEqual(["BBBB4000:5"]);
    expect(nrcs(filterCourses(courses, { ...NO_FILTERS, delivery: "virtual" }, null))).toEqual(["AAAA1000:4"]);
    expect(nrcs(filterCourses(courses, { ...NO_FILTERS, delivery: "presencial" }, null))).toEqual(["AAAA1000:1,2,3", "BBBB4000:5"]);
    expect(nrcs(filterCourses(courses, { ...NO_FILTERS, cycle: "16" }, null))).toEqual(["AAAA1000:1,2,4"]);
    expect(nrcs(filterCourses(courses, { ...NO_FILTERS, cycle: "8B" }, null))).toEqual(["BBBB4000:5"]);
  });

  it("keeps sections without a stored level", () => {
    const old = [course("CCCC1000", [section("6", { level: undefined })])];
    expect(nrcs(filterCourses(old, { ...NO_FILTERS, level: "PRE" }, null))).toEqual(["CCCC1000:6"]);
  });

  it("checks fit against the rest of the option, not the course's own section", () => {
    const schedule: ScheduledSection[] = [
      { ...section("1"), courseCode: "AAAA1000" },
      {
        ...section("9", { meetings: [{ day: "TUESDAY", start: "17:30:00", end: "18:50:00", location: "" }] }),
        courseCode: "ZZZZ1000",
      },
    ];
    const result = filterCourses(courses, { ...NO_FILTERS, fitsSchedule: true }, schedule);
    // Sections 1–3 meet Monday 8:00, where AAAA1000 itself sits: still valid swaps.
    // Section 4 clashes with ZZZZ1000 on Tuesday; BBBB4000 clashes with AAAA1000 on Monday.
    expect(nrcs(result)).toEqual(["AAAA1000:1,2,3"]);
  });
});

describe("toSearchFilters", () => {
  it("restores valid values and drops the rest", () => {
    expect(toSearchFilters({ withSeats: true, level: "POS", delivery: "nope", cycle: "8A" })).toEqual({
      ...NO_FILTERS,
      withSeats: true,
      level: "POS",
      cycle: "8A",
    });
    expect(toSearchFilters(null)).toEqual(NO_FILTERS);
    expect(hasActiveFilters(NO_FILTERS)).toBe(false);
  });
});
