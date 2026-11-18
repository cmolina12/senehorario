import { describe, expect, it } from "vitest";
import { reconcileSelection } from "./refresh";
import type { Course, DayOfWeek, Section } from "./types";

const section = (nrc: string, day: DayOfWeek, start: string, seats = 10): Section => ({
  nrc,
  sectionId: nrc.slice(-1),
  term: "202710",
  ptrm: "1",
  campus: "",
  meetings: [{ day, start, end: "23:00:00", location: "" }],
  professors: [],
  availableSeats: seats,
  totalSeats: 30,
  attrs: [],
});

const course = (code: string, sections: Section[]): Course => ({ code, title: `${code} nuevo`, credits: 4, sections });
const meta = { A: { title: "A viejo", credits: 3 }, B: { title: "B", credits: 3 } };

describe("reconcileSelection", () => {
  it("replaces saved sections with live data and refreshes course info", () => {
    const saved = { A: [section("11", "MONDAY", "08:00:00", 10)] };
    const live = section("11", "MONDAY", "08:00:00", 3);
    const result = reconcileSelection(saved, meta, { A: course("A", [live]) });
    expect(result.sections.A[0].availableSeats).toBe(3);
    expect(result.meta.A).toEqual({ title: "A nuevo", credits: 4 });
    expect(result.changes).toEqual([]);
  });

  it("drops sections that left the catalog, and reports full or rescheduled ones", () => {
    const saved = {
      A: [section("11", "MONDAY", "08:00:00"), section("12", "TUESDAY", "08:00:00"), section("13", "FRIDAY", "08:00:00")],
    };
    const result = reconcileSelection(saved, meta, {
      A: course("A", [section("11", "MONDAY", "08:00:00", 0), section("12", "WEDNESDAY", "08:00:00")]),
    });
    expect(result.sections.A.map((s) => s.nrc)).toEqual(["11", "12"]);
    expect(result.changes.map((c) => `${c.kind}:${"nrc" in c ? c.nrc : ""}`)).toEqual([
      "full:11",
      "timeChanged:12",
      "removed:13",
    ]);
  });

  it("doesn't report a time change when one-off rows moved into sessions", () => {
    const old = section("11", "MONDAY", "08:00:00");
    old.meetings.push({ day: "SATURDAY", start: "07:00:00", end: "09:50:00", location: "" });
    const live = section("11", "MONDAY", "08:00:00");
    live.sessions = [
      { day: "SATURDAY", start: "07:00:00", end: "09:50:00", location: "", startDate: "2026-08-22", endDate: "2026-08-22" },
      { day: "SATURDAY", start: "07:00:00", end: "09:50:00", location: "", startDate: "2026-10-17", endDate: "2026-10-17" },
    ];
    const result = reconcileSelection({ A: [old] }, meta, { A: course("A", [live]) });
    expect(result.changes).toEqual([]);
  });

  it("reports a single course-level change when none of its sections remain", () => {
    const saved = { A: [section("11", "MONDAY", "08:00:00")], B: [section("21", "MONDAY", "10:00:00")] };
    const result = reconcileSelection(saved, meta, { A: course("A", []), B: "missing" });
    expect(result.sections).toEqual({});
    expect(result.meta).toEqual({});
    expect(result.changes).toEqual([
      { kind: "courseRemoved", courseCode: "A" },
      { kind: "courseRemoved", courseCode: "B" },
    ]);
  });

  it("keeps courses it couldn't check", () => {
    const saved = { A: [section("11", "MONDAY", "08:00:00")] };
    const result = reconcileSelection(saved, meta, { A: "error" });
    expect(result.sections).toEqual(saved);
    expect(result.changes).toEqual([{ kind: "unverified", courseCode: "A" }]);
  });

  it("treats HH:mm and HH:mm:ss as the same time", () => {
    const saved = { A: [{ ...section("11", "MONDAY", "08:00"), meetings: [{ day: "MONDAY" as const, start: "08:00", end: "23:00", location: "" }] }] };
    const result = reconcileSelection(saved, meta, { A: course("A", [section("11", "MONDAY", "08:00:00")]) });
    expect(result.changes).toEqual([]);
  });
});
