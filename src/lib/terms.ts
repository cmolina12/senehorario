// Academic terms. The catalog can publish several terms at once (e.g. the
// current semester and the next one), so the planner works on one term at a time.

import type { Course, SelectedMeta, SelectedSections } from "./types";

/** Distinct terms, newest first. Term codes ("202710") sort chronologically as strings. */
export function sortTerms(terms: Iterable<string>): string[] {
  return [...new Set(terms)].filter(Boolean).sort().reverse();
}

export function termsOfCourses(courses: Course[]): string[] {
  return courses.flatMap((c) => c.sections.map((s) => s.term));
}

/** "202710" -> "2027-10"; intersemestral terms (…19) get a suffix. */
export function formatTerm(term: string): string {
  if (!/^\d{6}$/.test(term)) return term;
  const label = `${term.slice(0, 4)}-${term.slice(4)}`;
  return term.endsWith("19") ? `${label} (Intersemestral)` : label;
}

/** Keeps only the sections of `term`, dropping courses left with none. */
export function coursesInTerm(courses: Course[], term: string | null): Course[] {
  if (!term) return courses;
  return courses
    .map((c) => ({ ...c, sections: c.sections.filter((s) => s.term === term) }))
    .filter((c) => c.sections.length > 0);
}

/**
 * Selections saved by older versions could mix terms. Keep the newest term
 * and drop the rest.
 */
export function keepNewestTerm(sections: SelectedSections, meta: SelectedMeta) {
  const [newest] = sortTerms(Object.values(sections).flat().map((s) => s.term));
  const nextSections: SelectedSections = {};
  const nextMeta: SelectedMeta = {};
  for (const [code, list] of Object.entries(sections)) {
    const kept = list.filter((s) => s.term === newest);
    if (kept.length > 0) {
      nextSections[code] = kept;
      if (meta[code]) nextMeta[code] = meta[code];
    }
  }
  return { sections: nextSections, meta: nextMeta, term: newest ?? null };
}
