import { describe, expect, it } from "vitest";
import { buildShareQuery, parseShareQuery } from "./share";
import type { Section } from "./types";

const section = (nrc: string): Section => ({
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

describe("share links", () => {
  it("round-trips a selection", () => {
    const query = buildShareQuery(
      { MATE1203: [section("36109"), section("80880")], IIND4200: [section("10210")] },
      "202710",
      2,
    );
    expect(query).toBe("t=202710&c=MATE1203-36109-80880&c=IIND4200-10210&o=3");
    expect(parseShareQuery(`?${query}`)).toEqual({
      term: "202710",
      courses: { MATE1203: ["36109", "80880"], IIND4200: ["10210"] },
      groups: [],
      optionIndex: 2,
    });
  });

  it("ignores links that aren't share links or are malformed", () => {
    expect(parseShareQuery("")).toBeNull();
    expect(parseShareQuery("?t=202710")).toBeNull();
    expect(parseShareQuery("?t=2027&c=MATE1203-36109")).toBeNull();
    expect(parseShareQuery("?t=202710&c=MATE1203")).toBeNull();
    expect(parseShareQuery("?t=202710&c=<script>-1")).toBeNull();
  });

  it("round-trips groups and ignores codes that aren't in the plan", () => {
    const query = buildShareQuery({ A1000: [section("1")], B1000: [section("2")] }, "202710", 0, [["A1000", "B1000"]]);
    expect(query).toContain("g=A1000%7EB1000");
    expect(parseShareQuery(`?${query}`)?.groups).toEqual([["A1000", "B1000"]]);
    expect(parseShareQuery("?t=202710&c=A1000-1&g=A1000~ZZZZ9999")?.groups).toEqual([]);
  });

  it("defaults to the first option", () => {
    expect(parseShareQuery("?t=202710&c=MATE1203-36109")?.optionIndex).toBe(0);
    expect(parseShareQuery("?t=202710&c=MATE1203-36109&o=abc")?.optionIndex).toBe(0);
  });
});
