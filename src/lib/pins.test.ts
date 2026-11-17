import { describe, expect, it } from "vitest";
import { normalizePins, slotSections, toPins, togglePin } from "./pins";
import type { Section } from "./types";

const section = (nrc: string, availableSeats = 1): Section => ({
  nrc,
  sectionId: nrc,
  term: "202710",
  ptrm: "1",
  campus: "",
  meetings: [],
  professors: [],
  availableSeats,
  totalSeats: 1,
  attrs: [],
});

const sections = {
  A: [section("1"), section("2")],
  B: [section("3"), section("4", 0)],
  C: [section("5")],
};

describe("pinned sections", () => {
  it("drops pins for removed courses or sections, and keeps one per group", () => {
    expect(normalizePins({ A: "1", B: "9", Z: "1" }, sections, [])).toEqual({ A: "1" });
    expect(normalizePins({ A: "1", B: "3", C: "5" }, sections, [["A", "B"]])).toEqual({ A: "1", C: "5" });
  });

  it("toggles a pin and replaces other pins in the same group", () => {
    expect(togglePin({}, "A", "1", [])).toEqual({ A: "1" });
    expect(togglePin({ A: "1" }, "A", "1", [])).toEqual({});
    expect(togglePin({ A: "1" }, "A", "2", [])).toEqual({ A: "2" });
    expect(togglePin({ A: "1", C: "5" }, "B", "3", [["A", "B"]])).toEqual({ C: "5", B: "3" });
  });

  it("offers only the pinned section, even if it breaks a preference", () => {
    const open = (s: Section) => s.availableSeats > 0;
    expect(slotSections(["B"], sections, {}, open).map((x) => x.section.nrc)).toEqual(["3"]);
    expect(slotSections(["B"], sections, { B: "4" }, open).map((x) => x.section.nrc)).toEqual(["4"]);
  });

  it("makes a group pick the pinned course", () => {
    const all = () => true;
    expect(slotSections(["A", "B"], sections, {}, all)).toHaveLength(4);
    expect(slotSections(["A", "B"], sections, { B: "3" }, all)).toEqual([{ code: "B", section: sections.B[0] }]);
  });

  it("validates stored data", () => {
    expect(toPins({ A: "1", B: 2 })).toEqual({ A: "1" });
    expect(toPins(["A"])).toEqual({});
    expect(toPins(null)).toEqual({});
  });
});
