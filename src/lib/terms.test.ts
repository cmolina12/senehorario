import { describe, expect, it } from "vitest";
import { coursesInTerm, formatTerm, keepNewestTerm, sortTerms } from "./terms";
import type { Course, Section } from "./types";

const section = (nrc: string, term: string): Section => ({
  nrc,
  sectionId: "1",
  term,
  ptrm: "1",
  campus: "CAMPUS PRINCIPAL",
  meetings: [],
  professors: [],
  availableSeats: 1,
  totalSeats: 1,
  attrs: [],
});

const course = (code: string, sections: Section[]): Course => ({ code, title: code, credits: 3, sections });

describe("terms", () => {
  it("sorts distinct terms newest first", () => {
    expect(sortTerms(["202620", "202710", "202620", "202619"])).toEqual(["202710", "202620", "202619"]);
  });

  it("formats term codes", () => {
    expect(formatTerm("202710")).toBe("2027-10");
    expect(formatTerm("202619")).toBe("2026-19 (Intersemestral)");
  });

  it("narrows courses to one term and drops empty ones", () => {
    const courses = [
      course("A", [section("1", "202620"), section("1", "202710")]),
      course("B", [section("2", "202620")]),
    ];
    const result = coursesInTerm(courses, "202710");
    expect(result.map((c) => c.code)).toEqual(["A"]);
    expect(result[0].sections.map((s) => s.term)).toEqual(["202710"]);
    expect(coursesInTerm(courses, null)).toBe(courses);
  });

  it("keeps only the newest term of a mixed legacy selection", () => {
    const { sections, meta, term } = keepNewestTerm(
      { A: [section("1", "202620"), section("1", "202710")], B: [section("2", "202620")] },
      { A: { title: "A", credits: 3 }, B: { title: "B", credits: 3 } },
    );
    expect(term).toBe("202710");
    expect(Object.keys(sections)).toEqual(["A"]);
    expect(Object.keys(meta)).toEqual(["A"]);
  });
});
