import { describe, expect, it } from "vitest";
import { courseColor, COURSE_COLORS, scheduleToEvents, visibleRange } from "./calendar-events";
import { formatLocation } from "./format";
import type { DayOfWeek, ScheduledSection } from "./types";

const section = (
  nrc: string,
  courseCode: string,
  meetings: [DayOfWeek, string, string][],
  ptrm = "1",
): ScheduledSection => ({
  nrc,
  sectionId: "1",
  term: "202710",
  ptrm,
  campus: "",
  meetings: meetings.map(([day, start, end]) => ({ day, start, end, location: "" })),
  professors: [],
  availableSeats: 1,
  totalSeats: 1,
  attrs: [],
  courseCode,
  courseTitle: "CÁLCULO <b>DIFERENCIAL</b>",
});

describe("visibleRange", () => {
  it("defaults to 7:00–18:00 without Saturday", () => {
    expect(visibleRange([])).toEqual({ slotMinTime: "07:00:00", slotMaxTime: "18:00:00", hiddenDays: [0, 6] });
  });

  it("expands to fit early, late and Saturday meetings", () => {
    const range = visibleRange([
      section("1", "A", [["MONDAY", "06:30:00", "07:50:00"]]),
      section("2", "B", [["SATURDAY", "18:30:00", "20:50:00"]]),
    ]);
    expect(range).toEqual({ slotMinTime: "06:00:00", slotMaxTime: "21:00:00", hiddenDays: [0] });
  });
});

describe("scheduleToEvents", () => {
  it("builds one escaped, title-cased event per meeting with its course color", () => {
    const events = scheduleToEvents([
      section("1", "MATE1203", [["MONDAY", "06:30:00", "07:50:00"], ["THURSDAY", "06:30:00", "07:50:00"]]),
      section("2", "IIND4200", [["TUESDAY", "14:00:00", "15:20:00"]]),
    ]);
    expect(events).toHaveLength(3);
    expect(events[0].start).toBe("2025-07-28T06:30:00");
    expect(events[0].extendedProps?.color).toBe(COURSE_COLORS[0]);
    expect(events[2].extendedProps?.color).toBe(COURSE_COLORS[1]);
    expect(events[0].title).toContain("Cálculo &lt;B&gt;Diferencial&lt;/B&gt;");
    expect(events[0].title).toContain("06:30–07:50");
  });

  it("splits overlapping 8A/8B sections of different courses into one event", () => {
    const events = scheduleToEvents([
      section("1", "AAAA1000", [["MONDAY", "09:00:00", "10:20:00"]], "8A"),
      section("2", "BBBB1000", [["MONDAY", "09:00:00", "10:50:00"]], "8B"),
    ]);
    expect(events).toHaveLength(1);
    expect(events[0].classNames).toEqual(["ptrm-split"]);
    expect(events[0].end).toBe("2025-07-28T10:50:00");
  });
});

describe("helpers", () => {
  it("assigns colors by position and cycles the palette", () => {
    const codes = Array.from({ length: 9 }, (_, i) => `C${i}`);
    expect(courseColor(codes, "C1")).toBe(COURSE_COLORS[1]);
    expect(courseColor(codes, "C8")).toBe(COURSE_COLORS[0]);
  });

  it("formats unassigned locations", () => {
    expect(formatLocation("- - - -")).toBe("Salón por asignar");
    expect(formatLocation(" .Edif. SD .SD_402 ")).toBe(".Edif. SD .SD_402");
  });
});

describe("titleCase", async () => {
  const { titleCase } = await import("./format");
  it("keeps Spanish connectors lowercase and Roman numerals upper-case", () => {
    expect(titleCase("MODELOS DE CONTROL DE PRODUCCION")).toBe("Modelos de Control de Produccion");
    expect(titleCase("DE LA TIERRA")).toBe("De la Tierra");
    expect(titleCase("FISICA II")).toBe("Fisica II");
    expect(titleCase("ARTE EN COLOMBIA (TIPO E)")).toBe("Arte en Colombia (Tipo E)");
    expect(titleCase("ALICIA PEREZ GUTIERREZ")).toBe("Alicia Perez Gutierrez");
  });
});
