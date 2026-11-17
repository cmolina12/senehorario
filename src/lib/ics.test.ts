import { describe, expect, it } from "vitest";
import { buildIcs, firstOccurrence } from "./ics";
import type { Meeting, ScheduledSection } from "./types";

const section = (meetings: Meeting[]): ScheduledSection => ({
  nrc: "36109",
  sectionId: "1",
  term: "202710",
  ptrm: "1",
  campus: "",
  meetings,
  professors: ["ALICIA PEREZ GUTIERREZ"],
  availableSeats: 1,
  totalSeats: 1,
  attrs: [],
  courseCode: "MATE1203",
  courseTitle: "CÁLCULO DIFERENCIAL, GRUPO; ESPECIAL",
});

const now = new Date("2026-11-17T12:00:00Z");

describe("firstOccurrence", () => {
  it("finds the first matching weekday on or after the start date", () => {
    expect(firstOccurrence("2027-01-25", "MONDAY")).toBe("2027-01-25"); // a Monday
    expect(firstOccurrence("2027-01-25", "FRIDAY")).toBe("2027-01-29");
    expect(firstOccurrence("2027-01-30", "MONDAY")).toBe("2027-02-01");
  });
});

describe("buildIcs", () => {
  it("creates a weekly event in Bogotá time until the last day", () => {
    const { content, skipped } = buildIcs(
      [
        section([
          {
            day: "THURSDAY",
            start: "06:30:00",
            end: "07:50:00",
            location: ".Edif. SD .SD_402",
            startDate: "2027-01-25",
            endDate: "2027-05-22",
          },
        ]),
      ],
      "Senéhorario 2027-10",
      now,
    );
    const unfolded = content.replace(/\r\n /g, "");
    expect(skipped).toBe(0);
    expect(content.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(unfolded).toContain("DTSTART;TZID=America/Bogota:20270128T063000");
    expect(unfolded).toContain("DTEND;TZID=America/Bogota:20270128T075000");
    expect(unfolded).toContain("RRULE:FREQ=WEEKLY;UNTIL=20270523T045959Z");
    expect(unfolded).toContain("SUMMARY:MATE1203 · Cálculo Diferencial\\, Grupo\\; Especial");
    expect(unfolded).toContain("LOCATION:.Edif. SD .SD_402");
    expect(unfolded).toContain("DESCRIPTION:Sección 1 · NRC 36109\\nProfesor: Alicia Perez Gutierrez\\nJueves 06:30–07:50");
    expect(unfolded).toContain("DTSTAMP:20261117T120000Z");
  });

  it("makes one-day sessions single events and skips meetings without dates", () => {
    const { content, skipped } = buildIcs(
      [
        section([
          { day: "WEDNESDAY", start: "18:00:00", end: "20:00:00", location: "- -", startDate: "2027-03-10", endDate: "2027-03-10" },
          { day: "MONDAY", start: "08:00:00", end: "09:20:00", location: "" },
        ]),
      ],
      "x",
      now,
    );
    expect(skipped).toBe(1);
    expect(content.match(/BEGIN:VEVENT/g)).toHaveLength(1);
    expect(content).not.toContain("RRULE");
    expect(content).toContain("LOCATION:Salón por asignar");
  });

  it("folds long lines to 75 octets", () => {
    const long = section([
      { day: "MONDAY", start: "08:00:00", end: "09:00:00", location: "Á".repeat(80), startDate: "2027-01-25", endDate: "2027-05-22" },
    ]);
    const { content } = buildIcs([long], "x", now);
    const encoder = new TextEncoder();
    for (const line of content.split("\r\n")) expect(encoder.encode(line).length).toBeLessThanOrEqual(75);
  });
});
