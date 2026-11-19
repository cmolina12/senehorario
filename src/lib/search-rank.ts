// Orders search results by how well they match the query. The catalog
// matches anywhere in the code or title and returns results alphabetically,
// so "ISIS" lists "Análisis …" and "Crisis …" before any ISIS course.

import type { Course } from "./types";

/** Upper-case without accents, for comparisons. */
const normalize = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toUpperCase();

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function rank(course: Course, compact: string, words: string[]): number {
  const code = course.code.toUpperCase();
  if (code === compact || course.sections.some((s) => s.nrc === compact)) return 0;
  if (code.startsWith(compact)) return 1;
  if (code.includes(compact)) return 2;
  const title = normalize(course.title);
  // Every word of the query starts a word of the title ("datos", "calculo dif").
  if (words.every((w) => new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(w)}`, "u").test(title))) return 3;
  return 4;
}

/** Best matches first: code or NRC, then title words; ties keep the catalog's order. */
export function rankCourses(courses: Course[], query: string): Course[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  const compact = words.join("").replace(/-/g, "");
  if (!compact) return courses;
  return courses
    .map((course, index) => ({ course, index, rank: rank(course, compact, words) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((r) => r.course);
}
