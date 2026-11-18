// Server-side client for the public Uniandes course catalog.
// Port of the Spring Boot CourseService: fetches raw sections and groups them
// into Course -> Section -> Meeting.

import { firstOccurrence } from "./ics";
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
  d?: string | null;
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

interface FetchOptions {
  /** Cache the catalog response for this many seconds instead of always fetching. */
  revalidate?: number;
  timeoutMs?: number;
}

async function fetchRaw(
  nameInput: string,
  profesorName: string,
  limit: number,
  { revalidate, timeoutMs }: FetchOptions = {},
): Promise<ApiCourse[]> {
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
    // Seat counts change constantly, so searches always hit the catalog;
    // only aggregate stats opt into caching.
    ...(revalidate ? { next: { revalidate } } : { cache: "no-store" as const }),
    ...(timeoutMs ? { signal: AbortSignal.timeout(timeoutMs) } : {}),
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

/**
 * How many CBUs the newest term offers, for the landing page. Cached for a
 * few hours; null if the catalog doesn't answer in time.
 */
export async function getCBUStats(): Promise<{ term: string; courses: number } | null> {
  try {
    const raw = await fetchRaw("CB", "", MAX_ROWS, { revalidate: 6 * 60 * 60, timeoutMs: 15_000 });
    const courses = mapToDomain(raw).filter((c) => c.code.startsWith("CBU"));
    // Prefer the newest regular semester (…10 or …20) over short special terms.
    const terms = [...new Set(courses.flatMap((c) => c.sections.map((s) => s.term)))].sort();
    const regular = terms.filter((t) => /(10|20)$/.test(t));
    const term = (regular.length ? regular : terms).at(-1);
    if (!term) return null;
    const count = courses.filter((c) => c.sections.some((s) => s.term === term)).length;
    return { term, courses: count };
  } catch {
    return null;
  }
}

export function mapToDomain(raw: ApiCourse[]): Course[] {
  const courses = new Map<string, Course>();

  for (const a of raw) {
    const code = `${a.class}${a.course}`;
    let course = courses.get(code);
    if (!course) {
      course = { code, title: cleanTitle(a.title), credits: parseIntSafe(a.credits), sections: [] };
      courses.set(code, course);
    }

    const rows = (a.schedules ?? []).flatMap((s) => {
      const start = parseTime(s.time_ini);
      const end = parseTime(s.time_fin);
      // Skip malformed entries instead of failing the whole search.
      if (!start || !end) return [];
      const room = `${s.building} ${s.classroom}`;
      // Fully online sections often list "- -" as the room; keep them recognizable.
      const location = a.campus?.toUpperCase() === "VIRTUAL" && !/[\p{L}\p{N}]/u.test(room) ? "VIRTUAL" : room;
      const startDate = parseDate(s.date_ini);
      const endDate = parseDate(s.date_fin);
      return parseDays(s).map((day): Meeting => ({ day, start, end, location, startDate, endDate }));
    });
    const slotKey = (m: Meeting) => `${m.day}-${m.start}-${m.end}`;
    const longest = Math.max(0, ...rows.map(spanDays));
    const isShort = (m: Meeting) => longest >= MIN_TERM_DAYS && spanDays(m) <= ONE_OFF_MAX_DAYS;
    // In a section that runs for weeks, a slot that only shows up in rows
    // lasting a week or less is a one-off session (an exam, a Saturday
    // workshop), not a weekly class. Short rows in a slot that also has a long
    // row are just that class split into date ranges (room changes).
    const weeklySlots = new Set(rows.filter((m) => !isShort(m)).map(slotKey));
    const isOneOff = (m: Meeting) => isShort(m) && !weeklySlots.has(slotKey(m));

    // The catalog can list the same weekly slot in several rows with
    // different date ranges; keep one meeting per slot spanning all of them.
    const bySlot = new Map<string, Meeting>();
    for (const row of rows) {
      if (isOneOff(row)) continue;
      const existing = bySlot.get(slotKey(row));
      if (!existing) {
        bySlot.set(slotKey(row), { ...row });
        continue;
      }
      if (row.startDate && (!existing.startDate || row.startDate < existing.startDate)) existing.startDate = row.startDate;
      if (row.endDate && (!existing.endDate || row.endDate > existing.endDate)) existing.endDate = row.endDate;
    }
    // Leave dates out entirely rather than half-filled.
    const meetings = [...bySlot.values()].map((m): Meeting =>
      m.startDate && m.endDate ? m : { day: m.day, start: m.start, end: m.end, location: m.location },
    );

    const sessions = new Map<string, Meeting>();
    for (const row of rows) {
      if (!isOneOff(row)) continue;
      const date = firstOccurrence(row.startDate!, row.day);
      if (date > row.endDate!) continue; // the range never includes that weekday
      sessions.set(`${date}-${row.start}-${row.end}`, { ...row, startDate: date, endDate: date });
    }

    meetings.sort((x, y) => DAY_ORDER.indexOf(x.day) - DAY_ORDER.indexOf(y.day) || x.start.localeCompare(y.start));

    const totalSeats = parseIntSafe(a.maxenrol);
    const availableSeats = Math.max(0, Math.min(parseIntSafe(a.seatsavail), totalSeats));

    const section: Section = {
      nrc: a.nrc,
      sectionId: a.section,
      term: a.term,
      ptrm: a.ptrm,
      campus: a.campus,
      meetings: mergeOverlapping(meetings),
      ...(sessions.size > 0 && {
        sessions: [...sessions.values()].sort(
          (x, y) => x.startDate!.localeCompare(y.startDate!) || x.start.localeCompare(y.start),
        ),
      }),
      professors: (a.instructors ?? []).map((i) => reorderProfessorName(i.name ?? "")),
      availableSeats,
      totalSeats,
      attrs: (a.attr ?? []).map((x) => x.code).filter((c): c is string => !!c),
    };
    course.sections.push(section);
  }

  return [...courses.values()];
}

/** Drops stray control characters (e.g. "ANÁ\x81LISIS") and repeated or non-breaking spaces. */
export function cleanTitle(title: string): string {
  return title.replace(/[\u0000-\u001f\u007f-\u009f]/g, "").replace(/\s+/g, " ").trim();
}

/**
 * Some sections list overlapping times on the same day (in person some weeks,
 * online others); show them as one block spanning both. Expects meetings
 * sorted by day and start.
 */
function mergeOverlapping(meetings: Meeting[]): Meeting[] {
  const merged: Meeting[] = [];
  for (const m of meetings) {
    const prev = merged.at(-1);
    if (!prev || prev.day !== m.day || m.start >= prev.end) {
      merged.push({ ...m });
      continue;
    }
    if (m.end > prev.end) prev.end = m.end;
    if (!prev.location.split(" / ").includes(m.location)) prev.location += ` / ${m.location}`;
    if (prev.startDate && prev.endDate && m.startDate && m.endDate) {
      if (m.startDate < prev.startDate) prev.startDate = m.startDate;
      if (m.endDate > prev.endDate) prev.endDate = m.endDate;
    } else {
      delete prev.startDate;
      delete prev.endDate;
    }
  }
  return merged;
}

const MIN_TERM_DAYS = 28;
const ONE_OFF_MAX_DAYS = 6;

/** Days between a meeting's first and last date; -1 when it has no dates. */
function spanDays(m: Meeting): number {
  if (!m.startDate || !m.endDate) return -1;
  return (Date.parse(m.endDate) - Date.parse(m.startDate)) / 86_400_000;
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
  if (s.d?.toUpperCase() === "D") days.push("SUNDAY");
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
