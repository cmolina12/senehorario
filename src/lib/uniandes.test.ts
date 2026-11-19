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
        // First and last dates the class actually meets.
        startDate: "2026-08-03",
        endDate: "2026-11-23",
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

  it("keeps a section's own title when it differs from the course's", () => {
    const [course] = mapToDomain([raw(), raw({ nrc: "2", term: "202710", title: "ANÁLISIS  DE DATOS (INGLÉS)" })]);
    expect(course.title).toBe("ANÁLISIS DE DATOS");
    expect(course.sections.map((s) => s.title)).toEqual([undefined, "ANÁLISIS DE DATOS (INGLÉS)"]);
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

  it("treats one row per date as a weekly class, keeping alternating rooms", () => {
    // MMBA4401 sec. 2: every class is its own row, alternating classroom and
    // online, plus a single Saturday session.
    const base = { ...raw().schedules![0], l: null, i: null };
    const day = (flag: "v" | "s", date: string, classroom: string, time = "1800") => ({
      ...base,
      [flag]: flag.toUpperCase(),
      time_ini: time,
      time_fin: time === "1800" ? "2050" : "1550",
      building: classroom === ".VIRT" ? ".VIRTUAL" : ".Edif. SD",
      classroom,
      date_ini: `${date} 00:00:00`,
      date_fin: `${date} 00:00:00`,
    });
    const [course] = mapToDomain([
      raw({
        ptrm: "8A",
        schedules: [
          day("s", "2026-08-08", ".SD_702", "1300"),
          day("v", "2026-08-14", ".VIRT"),
          day("v", "2026-08-21", ".SD_703"),
          day("v", "2026-08-28", ".VIRT"),
          day("v", "2026-09-04", ".SD_703"),
        ],
      }),
    ]);
    const [section] = course.sections;
    expect(section.meetings).toEqual([
      {
        day: "FRIDAY",
        start: "18:00:00",
        end: "20:50:00",
        location: ".VIRTUAL .VIRT / .Edif. SD .SD_703",
        startDate: "2026-08-14",
        endDate: "2026-09-04",
      },
    ]);
    expect(section.sessions).toMatchObject([{ day: "SATURDAY", startDate: "2026-08-08", endDate: "2026-08-08" }]);
  });

  it("makes every date a session when nothing repeats weekly", () => {
    // DEMP5102: a Friday afternoon and a Saturday, once. MEDI rotation: two weeks.
    const base = { ...raw().schedules![0], l: null, i: null };
    const [course] = mapToDomain([
      raw({
        schedules: [
          { ...base, v: "V", time_ini: "1400", time_fin: "1750", date_ini: "2026-08-21 00:00:00", date_fin: "2026-08-21 00:00:00" },
          { ...base, s: "S", time_ini: "0800", time_fin: "1750", date_ini: "2026-08-22 00:00:00", date_fin: "2026-08-22 00:00:00" },
        ],
      }),
      raw({
        nrc: "69697",
        schedules: [{ ...base, m: "M", time_ini: "0700", time_fin: "1150", date_ini: "2026-07-27 00:00:00", date_fin: "2026-08-09 00:00:00" }],
      }),
    ]);
    const [once, rotation] = course.sections;
    expect(once.meetings).toEqual([]);
    expect(once.sessions?.map((m) => m.startDate)).toEqual(["2026-08-21", "2026-08-22"]);
    expect(rotation.meetings).toEqual([]);
    expect(rotation.sessions?.map((m) => `${m.day} ${m.startDate}`)).toEqual(["TUESDAY 2026-07-28", "TUESDAY 2026-08-04"]);
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
    expect(section.meetings).toMatchObject([{ day: "THURSDAY", startDate: "2027-01-28", endDate: "2027-03-18" }]);
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
