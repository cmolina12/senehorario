import { describe, expect, it } from "vitest";
import { rankCourses } from "./search-rank";
import type { Course } from "./types";

const course = (code: string, title: string, nrc = "1"): Course => ({
  code,
  title,
  credits: 3,
  sections: [{ nrc, sectionId: "1", term: "202710", ptrm: "1", campus: "", meetings: [], professors: [], availableSeats: 1, totalSeats: 1, attrs: [] }],
});

const codes = (courses: Course[]) => courses.map((c) => c.code);

describe("rankCourses", () => {
  const results = [
    course("ADMI1403", "ANÁLISIS DE DATOS CON HOJAS DE CÁLCULO"),
    course("CPOL2509", "CRISIS POLÍTICAS"),
    course("ISIS1221", "INTRODUCCIÓN A LA PROGRAMACIÓN", "41887"),
    course("MISIS4000", "SEMINARIO"),
    course("ISIS1105", "DISEÑO Y ANÁLISIS DE ALGORITMOS"),
  ];

  it("puts code matches first, keeping the catalog's order within a rank", () => {
    expect(codes(rankCourses(results, "isis"))).toEqual(["ISIS1221", "ISIS1105", "MISIS4000", "ADMI1403", "CPOL2509"]);
    expect(codes(rankCourses(results, "ISIS 1105"))[0]).toBe("ISIS1105");
    expect(codes(rankCourses(results, "isis-1221"))[0]).toBe("ISIS1221");
  });

  it("finds NRCs and title words, ignoring accents", () => {
    expect(codes(rankCourses(results, "41887"))[0]).toBe("ISIS1221");
    expect(codes(rankCourses(results, "analisis"))).toEqual(["ADMI1403", "ISIS1105", "CPOL2509", "ISIS1221", "MISIS4000"]);
  });

  it("leaves results alone for an empty query", () => {
    expect(rankCourses(results, "  ")).toBe(results);
  });
});
