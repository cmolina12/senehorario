// Filters for course search results. They narrow each course's sections; a
// course whose sections are all filtered out is dropped.

import { deliveryLabel } from "./format";
import { fitsInSchedule } from "./scheduler";
import type { Course, ScheduledSection, Section } from "./types";

export type LevelFilter = "" | "PRE" | "POS";
export type DeliveryFilter = "" | "presencial" | "virtual" | "hibrida";
export type CycleFilter = "" | "16" | "8A" | "8B";

export interface SearchFilters {
  withSeats: boolean;
  fitsSchedule: boolean;
  english: boolean;
  level: LevelFilter;
  delivery: DeliveryFilter;
  cycle: CycleFilter;
}

export const NO_FILTERS: SearchFilters = {
  withSeats: false,
  fitsSchedule: false,
  english: false,
  level: "",
  delivery: "",
  cycle: "",
};

export const hasActiveFilters = (f: SearchFilters) =>
  f.withSeats || f.fitsSchedule || f.english || !!f.level || !!f.delivery || !!f.cycle;

const DELIVERY: Record<Exclude<DeliveryFilter, "">, ReturnType<typeof deliveryLabel>> = {
  presencial: null,
  virtual: "Virtual",
  hibrida: "Híbrida",
};

function matches(section: Section, f: SearchFilters, others: ScheduledSection[] | null): boolean {
  if (f.withSeats && section.availableSeats <= 0) return false;
  if (f.english && !section.attrs?.includes("INGL")) return false;
  // Plans saved before levels were stored have none; don't hide them.
  if (f.level && section.level && section.level !== f.level) return false;
  if (f.delivery && deliveryLabel(section) !== DELIVERY[f.delivery]) return false;
  if (f.cycle) {
    const half = section.ptrm === "8A" || section.ptrm === "8B";
    if (f.cycle === "16" ? half : section.ptrm !== f.cycle) return false;
  }
  if (others && !fitsInSchedule(section, others)) return false;
  return true;
}

export interface FilteredCourse extends Course {
  /** Sections before filtering. */
  totalSections: number;
}

/**
 * Applies the filters to search results. `schedule` is the option on screen,
 * used by "fits my schedule"; a course already in it is checked against the
 * rest of the option, so its other sections still show up as swaps.
 */
export function filterCourses(
  courses: Course[],
  filters: SearchFilters,
  schedule: ScheduledSection[] | null,
): FilteredCourse[] {
  return courses
    .map((course) => {
      const others =
        filters.fitsSchedule && schedule ? schedule.filter((s) => s.courseCode !== course.code) : null;
      return {
        ...course,
        sections: course.sections.filter((s) => matches(s, filters, others)),
        totalSections: course.sections.length,
      };
    })
    .filter((course) => course.sections.length > 0);
}

/** Restores saved filters, ignoring anything that doesn't fit the current shape. */
export function toSearchFilters(data: unknown): SearchFilters {
  if (!data || typeof data !== "object") return NO_FILTERS;
  const d = data as Partial<Record<keyof SearchFilters, unknown>>;
  const oneOf = <T extends string>(v: unknown, options: readonly T[]): T =>
    options.includes(v as T) ? (v as T) : options[0];
  return {
    withSeats: d.withSeats === true,
    fitsSchedule: d.fitsSchedule === true,
    english: d.english === true,
    level: oneOf(d.level, ["", "PRE", "POS"] as const),
    delivery: oneOf(d.delivery, ["", "presencial", "virtual", "hibrida"] as const),
    cycle: oneOf(d.cycle, ["", "16", "8A", "8B"] as const),
  };
}
