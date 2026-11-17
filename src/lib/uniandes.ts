// Server-side client for the public Uniandes course catalog.
// Port of the Spring Boot CourseService: fetches raw sections and groups them
// into Course -> Section -> Meeting.

import type { Course, DayOfWeek, Meeting, Section } from "./types";

const API_BASE_URL =
  process.env.UNIANDES_API_BASE_URL ??
  "https://ofertadecursos.uniandes.edu.co/api/courses";

// Raw shapes returned by the catalog API (only the fields we use).
interface ApiSchedule {
  time_ini: string | null;
  time_fin: string | null;
  classroom: string | null;
  building: string | null;
  l: string | null;
  m: string | null;
  i: string | null;
  j: string | null;
  v: string | null;
  s: string | null;
  date_ini?: string | null; // "2027-01-25 00:00:00"
  date_fin?: string | null;
}

export interface ApiCourse {
  nrc: string;
  class: string;
  course: string;
  section: string;
  credits: string;
  title: string;
  maxenrol: string;
  term: string;
  ptrm: string;
  seatsavail: string;
  campus: string;
  schedules: ApiSchedule[] | null;
  instructors: { name: string | null }[] | null;
  attr: { code: string | null }[] | null;
}

async function fetchRaw(nameInput: string, profesorName: string, limit: number): Promise<ApiCourse[]> {
  const params = new URLSearchParams({
    term: "",
    ptrm: "",
    prefix: "",
    attr: "",
    nameInput,
    campus: "",
    attrs: "",
    timeStart: "",
    offset: "0",
    limit: String(limit),
    courseQuotas: "",
    days: "",
    courseRestrictions: "",
    programNew: "",
    profesorName,
  });

  const res = await fetch(`${API_BASE_URL}?${params}`, {
    // Seat counts change constantly; always hit the catalog.
    cache: "no-store",
    // The catalog's firewall rejects some default client user agents.
    headers: { "User-Agent": "Mozilla/5.0 (compatible; Senehorario)", Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Uniandes API responded ${res.status}`);
  }
  const data: unknown = await res.json();
  return Array.isArray(data) ? (data as ApiCourse[]) : [];
}

/**
 * Turns a free-text query into the catalog's nameInput format: upper-case,
 * with whitespace replaced by the SQL-style `%` wildcard.
 */
export function toNameInput(query: string): string {
  return query.trim().replace(/\s+/g, "%").toUpperCase();
}

/**
 * Most rows the catalog is asked for. Each row is one section, and a single
 * course can have dozens (MATE1203 has ~80 across terms), so this must be
 * generous; only very broad searches (e.g. "a") reach it.
 */
export const MAX_ROWS = 1000;

export interface SearchResult {
  courses: Course[];
  /** The catalog returned MAX_ROWS rows, so there may be more. */
  truncated: boolean;
}

export async function searchCourses(query: string, professor = ""): Promise<SearchResult> {
  const raw = await fetchRaw(toNameInput(query), professor.trim(), MAX_ROWS);
  return { courses: mapToDomain(raw), truncated: raw.length >= MAX_ROWS };
}

/** All CBU (Ciclo Básico Uniandino) courses with their sections. */
export async function getCBUCourses(): Promise<Course[]> {
  const raw = await fetchRaw("CB", "", MAX_ROWS);
  return mapToDomain(raw).filter((c) => c.code.startsWith("CBU"));
}

export function mapToDomain(raw: ApiCourse[]): Course[] {
  const courses = new Map<string, Course>();

  for (const a of raw) {
    const code = `${a.class}${a.course}`;
    let course = courses.get(code);
    if (!course) {
      course = { code, title: a.title, credits: parseIntSafe(a.credits), sections: [] };
      courses.set(code, course);
    }

    // The catalog can list the same weekly slot in several rows with
    // different date ranges; keep one meeting per slot spanning all of them.
    const bySlot = new Map<string, Meeting>();
    for (const s of a.schedules ?? []) {
      const start = parseTime(s.time_ini);
      const end = parseTime(s.time_fin);
      // Skip malformed entries instead of failing the whole search.
      if (!start || !end) continue;
      const location = `${s.building} ${s.classroom}`;
      const startDate = parseDate(s.date_ini);
      const endDate = parseDate(s.date_fin);
      for (const day of parseDays(s)) {
        const key = `${day}-${start}-${end}`;
        const existing = bySlot.get(key);
        if (!existing) {
          bySlot.set(key, { day, start, end, location, startDate, endDate });
          continue;
        }
        if (startDate && (!existing.startDate || startDate < existing.startDate)) existing.startDate = startDate;
        if (endDate && (!existing.endDate || endDate > existing.endDate)) existing.endDate = endDate;
      }
    }
    // Leave dates out entirely rather than half-filled.
    const meetings = [...bySlot.values()].map((m): Meeting =>
      m.startDate && m.endDate ? m : { day: m.day, start: m.start, end: m.end, location: m.location },
    );

    meetings.sort((x, y) => DAY_ORDER.indexOf(x.day) - DAY_ORDER.indexOf(y.day) || x.start.localeCompare(y.start));

    const totalSeats = parseIntSafe(a.maxenrol);
    const availableSeats = Math.max(0, Math.min(parseIntSafe(a.seatsavail), totalSeats));

    const section: Section = {
      nrc: a.nrc,
      sectionId: a.section,
      term: a.term,
      ptrm: a.ptrm,
      campus: a.campus,
      meetings,
      professors: (a.instructors ?? []).map((i) => reorderProfessorName(i.name ?? "")),
      availableSeats,
      totalSeats,
      attrs: (a.attr ?? []).map((x) => x.code).filter((c): c is string => !!c),
    };
    course.sections.push(section);
  }

  return [...courses.values()];
}

/** "2027-01-25 00:00:00" -> "2027-01-25"; undefined when missing or malformed. */
function parseDate(value: string | null | undefined): string | undefined {
  const match = value?.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : undefined;
}

/** "0630" -> "06:30:00"; returns null when malformed. */
export function parseTime(hhmm: string | null): string | null {
  if (!hhmm || !/^\d{4}/.test(hhmm)) return null;
  return `${hhmm.slice(0, 2)}:${hhmm.slice(2, 4)}:00`;
}

const DAY_ORDER: DayOfWeek[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

function parseDays(s: ApiSchedule): DayOfWeek[] {
  const days: DayOfWeek[] = [];
  if (s.l?.toUpperCase() === "L") days.push("MONDAY");
  if (s.m?.toUpperCase() === "M") days.push("TUESDAY");
  if (s.i?.toUpperCase() === "I") days.push("WEDNESDAY");
  if (s.j?.toUpperCase() === "J") days.push("THURSDAY");
  if (s.v?.toUpperCase() === "V") days.push("FRIDAY");
  if (s.s?.toUpperCase() === "S") days.push("SATURDAY");
  return days;
}

/** The catalog lists names as "SURNAMES GIVEN-NAMES"; flip them to "GIVEN-NAMES SURNAMES". */
export function reorderProfessorName(name: string): string {
  if (!name.trim()) return name;
  const p = name.trim().split(/\s+/);
  switch (p.length) {
    case 2:
      return `${p[1]} ${p[0]}`;
    case 3:
      return `${p[2]} ${p[0]} ${p[1]}`;
    case 4:
      return `${p[2]} ${p[3]} ${p[0]} ${p[1]}`;
    default:
      return name;
  }
}

function parseIntSafe(value: string | null | undefined): number {
  const n = Number.parseInt(value ?? "", 10);
  return Number.isNaN(n) ? 0 : n;
}
