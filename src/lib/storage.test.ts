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

describe("planSignature", async () => {
  const { planSignature } = await import("./storage");
  const section = (nrc: string) => ({
    nrc,
    sectionId: "1",
    term: "202710",
    ptrm: "1",
    campus: "",
    meetings: [],
    professors: [],
    availableSeats: 1,
    totalSeats: 1,
    attrs: [],
  });
  const plan = (overrides = {}) => ({
    selectedSectionsByCourse: { A: [section("1"), section("2")], B: [section("3")] },
    selectedCoursesMeta: {},
    selectedScheduleIndex: 0,
    courseGroups: [["A", "B"]],
    pinnedSections: { A: "1" },
    ...overrides,
  });

  it("ignores order and the option being viewed", () => {
    const reordered = plan({
      selectedSectionsByCourse: { B: [section("3")], A: [section("2"), section("1")] },
      courseGroups: [["B", "A"]],
      selectedScheduleIndex: 4,
    });
    expect(planSignature(reordered)).toBe(planSignature(plan()));
  });

  it("changes with sections, groups and pins", () => {
    const base = planSignature(plan());
    expect(planSignature(plan({ selectedSectionsByCourse: { A: [section("1")], B: [section("3")] } }))).not.toBe(base);
    expect(planSignature(plan({ courseGroups: [] }))).not.toBe(base);
    expect(planSignature(plan({ pinnedSections: { A: "2" } }))).not.toBe(base);
  });
});
