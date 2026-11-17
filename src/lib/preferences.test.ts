import { describe, expect, it } from "vitest";
import {
  DEFAULT_PREFERENCES,
  activeFilterCount,
  scheduleStats,
  sectionConflict,
  sortSchedules,
  toPreferences,
  type Preferences,
} from "./preferences";
import type { DayOfWeek, Section } from "./types";

const section = (nrc: string, meetings: [DayOfWeek, string, string][], availableSeats = 1): Section => ({
  nrc,
  sectionId: nrc,
  term: "202710",
  ptrm: "1",
  campus: "",
  meetings: meetings.map(([day, start, end]) => ({ day, start: `${start}:00`, end: `${end}:00`, location: "" })),
  professors: [],
  availableSeats,
  totalSeats: 1,
  attrs: [],
});

const prefs = (p: Partial<Preferences>): Preferences => ({ ...DEFAULT_PREFERENCES, ...p });

describe("sectionConflict", () => {
  const s = section("1", [["MONDAY", "07:00", "08:20"], ["FRIDAY", "15:30", "16:50"]]);

  it("allows a section when nothing is set", () => {
    expect(sectionConflict(s, DEFAULT_PREFERENCES)).toBeNull();
  });

  it("rejects early starts, late ends, free days and blocked time", () => {
    expect(sectionConflict(s, prefs({ earliestStart: "08:00" }))).toBe("hora de inicio");
    expect(sectionConflict(s, prefs({ latestEnd: "16:00" }))).toBe("hora de salida");
    expect(sectionConflict(s, prefs({ freeDays: ["FRIDAY"] }))).toBe("día libre");
    expect(
      sectionConflict(s, prefs({ blocks: [{ id: "a", day: "MONDAY", start: "08:00", end: "09:00" }] })),
    ).toBe("bloque");
  });

  it("allows classes that end exactly when a block starts", () => {
    expect(
      sectionConflict(s, prefs({ blocks: [{ id: "a", day: "MONDAY", start: "08:20", end: "09:00" }] })),
    ).toBeNull();
  });
});

describe("scheduleStats", () => {
  it("counts days and the gaps between classes (merging overlaps)", () => {
    const stats = scheduleStats([
      section("1", [["MONDAY", "07:00", "08:20"], ["WEDNESDAY", "07:00", "08:20"]]),
      section("2", [["MONDAY", "10:00", "11:20"]]),
      section("3", [["MONDAY", "10:30", "12:00"]]),
    ]);
    expect(stats.days).toBe(2);
    expect(stats.gapMinutes).toBe(100); // 08:20 → 10:00 on Monday
    expect(stats.earliestStart).toBe(7 * 60);
    expect(stats.latestEnd).toBe(12 * 60);
  });
});

describe("sortSchedules", () => {
  const compact = [section("a", [["MONDAY", "08:00", "10:00"]])];
  const spread = [section("b", [["MONDAY", "08:00", "09:00"]]), section("c", [["TUESDAY", "15:00", "16:00"]])];
  const gappy = [section("d", [["MONDAY", "10:00", "11:00"], ["MONDAY", "15:00", "16:00"]])];

  it("keeps generation order by default", () => {
    expect(sortSchedules([spread, compact], "default")).toEqual([spread, compact]);
  });

  it("orders by gaps, days, start and end", () => {
    expect(sortSchedules([gappy, compact], "fewestGaps")[0]).toBe(compact);
    expect(sortSchedules([spread, compact], "fewestDays")[0]).toBe(compact);
    expect(sortSchedules([compact, gappy], "lateStart")[0]).toBe(gappy);
    expect(sortSchedules([gappy, compact], "earlyEnd")[0]).toBe(compact);
  });

  it("orders by the fullest section's free seats, then total free seats", () => {
    const tight = [section("e", [], 50), section("f", [], 2)]; // min 2
    const even = [section("g", [], 20), section("h", [], 20)]; // min 20, total 40
    const evenMore = [section("i", [], 20), section("j", [], 30)]; // min 20, total 50
    expect(sortSchedules([tight, even, evenMore], "mostSeats")).toEqual([evenMore, even, tight]);
  });
});

describe("toPreferences", () => {
  it("normalizes stored data and drops invalid blocks", () => {
    const p = toPreferences({
      sort: "fewestDays",
      earliestStart: "8:00",
      latestEnd: "18:00",
      freeDays: ["FRIDAY", 3],
      blocks: [
        { day: "MONDAY", start: "12:00", end: "13:00" },
        { day: "TUESDAY", start: "14:00", end: "13:00" },
      ],
    });
    expect(p.sort).toBe("fewestDays");
    expect(p.earliestStart).toBeNull();
    expect(p.latestEnd).toBe("18:00");
    expect(p.freeDays).toEqual(["FRIDAY"]);
    expect(p.blocks).toEqual([{ id: "block-0", day: "MONDAY", start: "12:00", end: "13:00" }]);
    expect(activeFilterCount(p)).toBe(3);
    expect(toPreferences(null)).toEqual(DEFAULT_PREFERENCES);
  });
});
