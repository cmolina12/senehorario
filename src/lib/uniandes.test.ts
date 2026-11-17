import { describe, expect, it } from "vitest";
import { mapToDomain, reorderProfessorName, toNameInput, type ApiCourse } from "./uniandes";

const raw = (overrides: Partial<ApiCourse> = {}): ApiCourse => ({
  nrc: "75548",
  class: "ADMI",
  course: "1403",
  section: "1",
  credits: "2",
  title: "ANÁLISIS DE DATOS",
  maxenrol: "45",
  term: "202620",
  ptrm: "1",
  seatsavail: "22",
  campus: "CAMPUS PRINCIPAL",
  schedules: [
    {
      time_ini: "0630",
      time_fin: "0750",
      classroom: ".SD_205-6",
      building: ".Edif. SD",
      l: "L",
      m: null,
      i: "I",
      j: null,
      v: null,
      s: null,
    },
  ],
  instructors: [{ name: "MARTINEZ OSORIO JOSE DAVID" }],
  attr: [{ code: "ECUR" }, { code: null }],
  ...overrides,
});

describe("mapToDomain", () => {
  it("groups sections by course and expands meeting days", () => {
    const courses = mapToDomain([raw(), raw({ nrc: "75549", section: "2" })]);
    expect(courses).toHaveLength(1);
    const [course] = courses;
    expect(course).toMatchObject({ code: "ADMI1403", title: "ANÁLISIS DE DATOS", credits: 2 });
    expect(course.sections.map((s) => s.nrc)).toEqual(["75548", "75549"]);
    expect(course.sections[0]).toMatchObject({
      sectionId: "1",
      availableSeats: 22,
      totalSeats: 45,
      professors: ["JOSE DAVID MARTINEZ OSORIO"],
      attrs: ["ECUR"],
      meetings: [
        { day: "MONDAY", start: "06:30:00", end: "07:50:00", location: ".Edif. SD .SD_205-6" },
        { day: "WEDNESDAY", start: "06:30:00", end: "07:50:00", location: ".Edif. SD .SD_205-6" },
      ],
    });
  });

  it("clamps available seats and tolerates bad numbers and times", () => {
    const [course] = mapToDomain([
      raw({
        credits: "x",
        seatsavail: "99",
        schedules: [{ ...raw().schedules![0], time_ini: null }],
      }),
    ]);
    expect(course.credits).toBe(0);
    expect(course.sections[0].availableSeats).toBe(45);
    expect(course.sections[0].meetings).toEqual([]);
  });
});

describe("helpers", () => {
  it("reorders professor names", () => {
    expect(reorderProfessorName("PEREZ JUAN")).toBe("JUAN PEREZ");
    expect(reorderProfessorName("PEREZ GOMEZ JUAN")).toBe("JUAN PEREZ GOMEZ");
    expect(reorderProfessorName("PEREZ GOMEZ JUAN CARLOS")).toBe("JUAN CARLOS PEREZ GOMEZ");
    expect(reorderProfessorName("UNO")).toBe("UNO");
  });

  it("builds the catalog's wildcard query", () => {
    expect(toNameInput("  control  de produccion ")).toBe("CONTROL%DE%PRODUCCION");
  });
});
