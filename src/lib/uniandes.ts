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
  levele?: string | null; // "PRE" or "POS"
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
 * with whitespace replaced by `_`. The catalog no longer accepts spaces or
 * `%` between words (both return nothing), but `_` still matches any single
 * character, so "proyecto de grado" finds "PROYECTO DE GRADO".
 */
export function toNameInput(query: string): string {
  return query.trim().replace(/\s+/g, "_").toUpperCase();
}

/** Upper-case without accents, for comparisons. */
const normalize = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toUpperCase();

/** The query's words, upper-case without accents. */
export function queryWords(query: string): string[] {
  return normalize(query).split(/\s+/).filter(Boolean);
}

/** Every word appears somewhere in the course's code or titles. */
export function matchesAllWords(course: Course, words: string[]): boolean {
  const text = normalize([course.code, course.title, ...course.sections.map((s) => s.title ?? "")].join(" "));
  return words.every((w) => text.includes(w));
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

/**
 * Searches by the query as a phrase. When a multi-word phrase finds nothing
 * (the words aren't next to each other in the title, as in "calculo integral"),
 * searches the longest word alone and keeps the courses that have every word.
 */
export async function searchCourses(query: string, professor = ""): Promise<SearchResult> {
  const prof = professor.trim();
  const raw = await fetchRaw(toNameInput(query), prof, MAX_ROWS);
  const words = queryWords(query);
  if (raw.length > 0 || words.length < 2) {
    return { courses: mapToDomain(raw), truncated: raw.length >= MAX_ROWS };
  }
  const longest = words.reduce((a, b) => (b.length > a.length ? b : a));
  const broad = await fetchRaw(longest, prof, MAX_ROWS);
  return {
    courses: mapToDomain(broad).filter((c) => matchesAllWords(c, words)),
    truncated: broad.length >= MAX_ROWS,
  };
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
    // Group rows by weekly slot (day + time) and expand dated rows into the
    // dates they actually meet. The catalog lists the same class in many
    // shapes: one row for the whole term, several date ranges (room changes),
    // or one row per date (MMBA4401). Rows without dates stay plain weekly
    // meetings.
    const slots = new Map<string, { base: Meeting; undated: boolean; dates: Map<string, string> }>();
    for (const row of rows) {
      const key = `${row.day}-${row.start}-${row.end}`;
      let slot = slots.get(key);
      if (!slot) {
        slot = { base: row, undated: false, dates: new Map() };
        slots.set(key, slot);
      }
      if (!row.startDate || !row.endDate) {
        slot.undated = true;
        continue;
      }
      for (const date of weeklyDates(row.startDate, row.endDate, row.day)) slot.dates.set(date, row.location);
    }

    // A slot that meets most weeks is a weekly class; otherwise each date is a
    // one-off session (an exam, a Saturday workshop, a two-week rotation).
    const meetings: Meeting[] = [];
    const sessions: Meeting[] = [];
    for (const { base, undated, dates } of slots.values()) {
      const { day, start, end } = base;
      const sorted = [...dates.keys()].sort();
      // Rooms can change from week to week (or alternate with online classes).
      const location = [...new Set([...(undated ? [base.location] : []), ...sorted.map((d) => dates.get(d)!)])].join(" / ");
      if (undated) {
        // Leave dates out entirely rather than half-filled.
        meetings.push({ day, start, end, location });
      } else if (isWeekly(sorted)) {
        meetings.push({ day, start, end, location, startDate: sorted[0], endDate: sorted.at(-1) });
      } else {
        for (const date of sorted) sessions.push({ day, start, end, location: dates.get(date)!, startDate: date, endDate: date });
      }
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
      ...(sessions.length > 0 && {
        sessions: sessions.sort(
          (x, y) => x.startDate!.localeCompare(y.startDate!) || x.start.localeCompare(y.start),
        ),
      }),
      professors: (a.instructors ?? []).map((i) => reorderProfessorName(i.name ?? "")),
      availableSeats,
      totalSeats,
      attrs: (a.attr ?? []).map((x) => x.code).filter((c): c is string => !!c),
      ...(a.levele && { level: a.levele }),
      ...(cleanTitle(a.title) !== course.title && { title: cleanTitle(a.title) }),
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

const DAY_MS = 86_400_000;

const addDays = (iso: string, days: number) => new Date(Date.parse(iso) + days * DAY_MS).toISOString().slice(0, 10);

/** Every date from `startDate` to `endDate` that falls on `day`, one week apart. */
function weeklyDates(startDate: string, endDate: string, day: DayOfWeek): string[] {
  const dates: string[] = [];
  for (let d = firstOccurrence(startDate, day); d <= endDate; d = addDays(d, 7)) dates.push(d);
  return dates;
}

/** At least three dates, covering at least half the weeks between the first and the last. */
function isWeekly(sortedDates: string[]): boolean {
  if (sortedDates.length < 3) return false;
  const weeks = Math.round((Date.parse(sortedDates.at(-1)!) - Date.parse(sortedDates[0])) / (7 * DAY_MS)) + 1;
  return sortedDates.length / weeks >= 0.5;
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
