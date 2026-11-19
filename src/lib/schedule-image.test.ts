import { describe, expect, it } from "vitest";
import { buildImageModel } from "./schedule-image";
import type { DayOfWeek, ScheduledSection } from "./types";

const sec = (
  courseCode: string,
  nrc: string,
  meetings: [DayOfWeek, string, string, string?][],
  extra: Partial<ScheduledSection> = {},
): ScheduledSection => ({
  courseCode,
  courseTitle: "CÁLCULO DIFERENCIAL",
  nrc,
  sectionId: nrc.slice(-1),
  term: "202710",
  ptrm: "1",
  campus: "",
  meetings: meetings.map(([day, start, end, location = ".Edif. SD .SD_402"]) => ({ day, start, end, location })),
  professors: [],
  availableSeats: 1,
  totalSeats: 1,
  attrs: [],
  ...extra,
});

describe("buildImageModel", () => {
  it("lays out blocks, fits the hours and skips empty weekends", () => {
    const model = buildImageModel(
      [sec("AAAA1000", "11", [["MONDAY", "06:30", "07:50"], ["THURSDAY", "17:00", "18:50", ".VIRTUAL .VIRT"]])],
      ["AAAA1000"],
      { includeNrcs: false },
    );
    expect(model.days).toEqual(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"]);
    expect([model.startHour, model.endHour]).toEqual([6, 19]);
    expect(model.blocks).toMatchObject([
      { day: 0, code: "AAAA1000", section: "1", half: null, time: "6:30–7:50", lane: 0, lanes: 1, online: false, title: "Cálculo Diferencial" },
      { day: 3, online: true },
    ]);
  });

  it("puts overlapping 8A/8B courses side by side and merges a course's own 8A+8B", () => {
    const model = buildImageModel(
      [
        sec("AAAA1000", "11", [["TUESDAY", "17:30", "18:50"]], { ptrm: "8A" }),
        sec("BBBB1000", "22", [["TUESDAY", "17:30", "18:50"]], { ptrm: "8B" }),
        sec("CCCC1000", "31", [["FRIDAY", "08:00", "09:20"]], { ptrm: "8A" }),
        sec("CCCC1000", "32", [["FRIDAY", "08:00", "09:20"]], { ptrm: "8B" }),
        sec("DDDD1000", "41", [["SATURDAY", "08:00", "11:00"]]),
      ],
      ["AAAA1000", "BBBB1000", "CCCC1000", "DDDD1000"],
      { includeNrcs: true },
    );
    expect(model.days.at(-1)).toBe("SATURDAY");
    const tuesday = model.blocks.filter((b) => b.day === 1);
    expect(tuesday.map((b) => [b.code, b.section, b.half, b.lane, b.lanes])).toEqual([
      ["AAAA1000", "1", "8A", 0, 2],
      ["BBBB1000", "2", "8B", 1, 2],
    ]);
    expect(model.blocks.filter((b) => b.day === 4).map((b) => [b.code, b.section, b.half])).toEqual([["CCCC1000", null, "8A+8B"]]);
    expect(model.legend.find((r) => r.code === "CCCC1000")?.detail).toBe("Sec. 1 (8A) · Sec. 2 (8B) · NRC 31, 32");
  });

  it("leaves NRCs out unless asked and lists what the grid can't show", () => {
    const model = buildImageModel(
      [
        sec("AAAA1000", "11", [["MONDAY", "08:00", "09:20"]], {
          sessions: [{ day: "SATURDAY", start: "08:00", end: "10:50", location: "", startDate: "2027-03-13", endDate: "2027-03-13" }],
        }),
        sec("PRAC3991", "55", []),
      ],
      ["AAAA1000", "PRAC3991"],
      { includeNrcs: false },
    );
    expect(model.legend.map((r) => r.detail)).toEqual(["Sec. 1", "Sec. 5"]);
    expect(model.notes).toEqual(["Sin horario fijo: PRAC3991", "AAAA1000: Sáb 13 mar · 08:00–10:50"]);
    // A one-off Saturday session doesn't add a Saturday column.
    expect(model.days).not.toContain("SATURDAY");
  });
});
