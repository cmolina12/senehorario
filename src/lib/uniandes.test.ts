import { describe, expect, it } from "vitest";
import { cleanTitle, mapToDomain, reorderProfessorName, toNameInput, type ApiCourse } from "./uniandes";

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

  it("keeps date ranges and merges rows that repeat the same weekly slot", () => {
    const base = { ...raw().schedules![0], l: "L", i: null };
    const [course] = mapToDomain([
      raw({
        schedules: [
          { ...base, date_ini: "2026-09-07 00:00:00", date_fin: "2026-11-28 00:00:00" },
          { ...base, date_ini: "2026-08-03 00:00:00", date_fin: "2026-09-06 00:00:00" },
        ],
      }),
    ]);
    expect(course.sections[0].meetings).toEqual([
      {
        day: "MONDAY",
        start: "06:30:00",
        end: "07:50:00",
        location: ".Edif. SD .SD_205-6",
        startDate: "2026-08-03",
        endDate: "2026-11-28",
      },
    ]);
  });

  it("merges overlapping meetings of one section into a single block", () => {
    // CIDE4705: Thursday in a classroom, plus an overlapping online slot.
    const base = { ...raw().schedules![0], l: null, i: null, j: "J" };
    const [course] = mapToDomain([
      raw({
        schedules: [
          { ...base, time_ini: "0630", time_fin: "0920", building: ".Edif. AU", classroom: ".AU_207" },
          { ...base, time_ini: "0700", time_fin: "0850", building: ".VIRTUAL", classroom: ".VIRT" },
        ],
      }),
    ]);
    expect(course.sections[0].meetings).toEqual([
      { day: "THURSDAY", start: "06:30:00", end: "09:20:00", location: ".Edif. AU .AU_207 / .VIRTUAL .VIRT" },
    ]);
  });

  it("reads Sunday meetings", () => {
    const [course] = mapToDomain([raw({ schedules: [{ ...raw().schedules![0], l: null, i: null, d: "D" }] })]);
    expect(course.sections[0].meetings.map((m) => m.day)).toEqual(["SUNDAY"]);
  });

  it("marks rooms of fully online sections as virtual", () => {
    const [course] = mapToDomain([
      raw({ campus: "VIRTUAL", schedules: [{ ...raw().schedules![0], building: "-", classroom: "-" }] }),
    ]);
    expect(course.sections[0].meetings.map((m) => m.location)).toEqual(["VIRTUAL", "VIRTUAL"]);
  });

  it("splits one-off dated rows into sessions instead of weekly meetings", () => {
    // ARTI4106: a weekly Monday class plus a few Saturday workshops.
    const base = { ...raw().schedules![0], l: null, i: null };
    const saturday = (date: string) => ({ ...base, s: "S", time_ini: "0700", time_fin: "0950", date_ini: `${date} 00:00:00`, date_fin: `${date} 00:00:00` });
    const [course] = mapToDomain([
      raw({
        schedules: [
          { ...base, l: "L", time_ini: "1800", time_fin: "2050", date_ini: "2026-08-03 00:00:00", date_fin: "2026-11-28 00:00:00" },
          saturday("2026-10-17"),
          saturday("2026-08-22"),
        ],
      }),
    ]);
    const [section] = course.sections;
    expect(section.meetings.map((m) => m.day)).toEqual(["MONDAY"]);
    expect(section.sessions).toMatchObject([
      { day: "SATURDAY", start: "07:00:00", startDate: "2026-08-22", endDate: "2026-08-22" },
      { day: "SATURDAY", start: "07:00:00", startDate: "2026-10-17", endDate: "2026-10-17" },
    ]);
  });

  it("keeps short rows of a weekly slot as part of that class", () => {
    // LENG1150: the Thursday class is listed in several date ranges, some a week long.
    const base = { ...raw().schedules![0], l: null, i: null, j: "J" };
    const range = (from: string, to: string) => ({ ...base, date_ini: `${from} 00:00:00`, date_fin: `${to} 00:00:00` });
    const [course] = mapToDomain([
      raw({
        ptrm: "8A",
        schedules: [range("2027-01-25", "2027-02-06"), range("2027-02-08", "2027-02-13"), range("2027-02-15", "2027-03-06"), range("2027-03-15", "2027-03-20")],
      }),
    ]);
    const [section] = course.sections;
    expect(section.sessions).toBeUndefined();
    expect(section.meetings).toMatchObject([{ day: "THURSDAY", startDate: "2027-01-25", endDate: "2027-03-20" }]);
  });

  it("sorts meetings by day and time across schedule rows", () => {
    const base = raw().schedules![0];
    const [course] = mapToDomain([
      raw({
        schedules: [
          { ...base, l: null, i: null, j: "J", time_ini: "0800", time_fin: "0920" },
          { ...base, l: "L", i: null, time_ini: "1000", time_fin: "1120" },
          { ...base, l: "L", i: null, time_ini: "0700", time_fin: "0750" },
        ],
      }),
    ]);
    expect(course.sections[0].meetings.map((m) => `${m.day} ${m.start}`)).toEqual([
      "MONDAY 07:00:00",
      "MONDAY 10:00:00",
      "THURSDAY 08:00:00",
    ]);
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
  it("cleans catalog titles", () => {
    expect(cleanTitle("TALLER DE ANÁ\x81LISIS DEL TERRITORIO")).toBe("TALLER DE ANÁLISIS DEL TERRITORIO");
    expect(cleanTitle("CUIDADO CRITICO IV\u00a0\u00a0")).toBe("CUIDADO CRITICO IV");
    expect(cleanTitle("CREACIÓN  Y GESTIÓN ")).toBe("CREACIÓN Y GESTIÓN");
  });

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
