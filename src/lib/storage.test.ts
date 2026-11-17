import { describe, expect, it } from "vitest";
import { toSnapshot } from "./storage";

const section = {
  nrc: "36109",
  sectionId: "1",
  term: "202710",
  ptrm: "1",
  campus: "CAMPUS PRINCIPAL",
  meetings: [{ day: "MONDAY", start: "06:30", end: "07:50", location: "" }],
  professors: [],
  availableSeats: 1,
  totalSeats: 1,
  attrs: [],
};

describe("toSnapshot", () => {
  it("accepts snapshots saved by the Angular app (including scheduleOptions)", () => {
    const snap = toSnapshot({
      selectedSectionsByCourse: { MATE1203: [section] },
      selectedCoursesMeta: { MATE1203: { title: "CÁLCULO", credits: 3 } },
      scheduleOptions: [[{ title: "x" }]],
      selectedScheduleIndex: 2,
    });
    expect(snap?.selectedScheduleIndex).toBe(2);
    expect(Object.keys(snap!.selectedSectionsByCourse)).toEqual(["MATE1203"]);
  });

  it("rejects malformed data", () => {
    expect(toSnapshot(null)).toBeNull();
    expect(toSnapshot({ selectedSectionsByCourse: {}, selectedCoursesMeta: [] })).toBeNull();
    expect(
      toSnapshot({ selectedSectionsByCourse: { A: [{ nrc: "1" }] }, selectedCoursesMeta: {} }),
    ).toBeNull();
    expect(
      toSnapshot({ selectedSectionsByCourse: { A: "nope" }, selectedCoursesMeta: {} }),
    ).toBeNull();
  });
});
