import { describe, expect, it } from "vitest";
import { buildSlots, normalizeGroups, toGroups } from "./groups";

describe("course groups", () => {
  it("normalizes groups against the selected courses", () => {
    expect(
      normalizeGroups(
        [
          ["A", "B", "X"],
          ["B", "C"],
          ["D", "E"],
        ],
        ["A", "B", "C", "D"],
      ),
    ).toEqual([["A", "B"]]); // X unknown, B already used, E unknown → [D] too small
  });

  it("builds one slot per ungrouped course and one per group, in selection order", () => {
    expect(buildSlots(["A", "B", "C", "D"], [["D", "B"]])).toEqual([["A"], ["B", "D"], ["C"]]);
    expect(buildSlots(["A"], [])).toEqual([["A"]]);
  });

  it("validates stored data", () => {
    expect(toGroups([["A", "B"], ["C"], "x", [1, 2]])).toEqual([["A", "B"]]);
    expect(toGroups(null)).toEqual([]);
  });
});
