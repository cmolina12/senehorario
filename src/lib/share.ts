// Share links: /planning?t=202710&c=MATE1203-36109-80880&c=IIND4200-10210&p=10210&o=3
// Only the term, each course's NRCs and the option number travel in the link;
// everything else is fetched fresh from the catalog when it's opened.

import type { CourseGroups } from "./groups";
import type { Pins } from "./pins";
import type { SelectedSections } from "./types";

export interface SharedPlan {
  term: string;
  courses: Record<string, string[]>; // course code -> NRCs
  groups: CourseGroups; // "elige uno" groups, e.g. g=CBUH1003~CBUT1044
  pins: Pins; // pinned sections, e.g. p=10210
  optionIndex: number; // 0-based
}

export function buildShareQuery(
  sections: SelectedSections,
  term: string,
  optionIndex: number,
  groups: CourseGroups = [],
  pins: Pins = {},
): string {
  const params = new URLSearchParams({ t: term });
  for (const [code, list] of Object.entries(sections)) {
    params.append("c", [code, ...list.map((s) => s.nrc)].join("-"));
  }
  for (const group of groups) params.append("g", group.join("~"));
  for (const nrc of Object.values(pins)) params.append("p", nrc);
  params.set("o", String(optionIndex + 1));
  return params.toString();
}

/** Parses a share query string; null when it isn't a (valid) share link. */
export function parseShareQuery(search: string): SharedPlan | null {
  const params = new URLSearchParams(search);
  const term = params.get("t");
  const entries = params.getAll("c");
  if (!term || !/^\d{6}$/.test(term) || entries.length === 0) return null;

  const courses: Record<string, string[]> = {};
  for (const entry of entries) {
    const [code, ...nrcs] = entry.split("-");
    if (!/^[A-Z0-9]{4,12}$/i.test(code)) return null;
    const valid = nrcs.filter((n) => /^\d{1,8}$/.test(n));
    if (valid.length === 0) return null;
    courses[code.toUpperCase()] = valid;
  }

  const groups = params
    .getAll("g")
    .map((g) => g.split("~").map((c) => c.toUpperCase()).filter((c) => c in courses))
    .filter((g) => g.length >= 2);

  const pins: Pins = {};
  for (const nrc of params.getAll("p")) {
    const code = Object.keys(courses).find((c) => courses[c].includes(nrc));
    if (code) pins[code] = nrc;
  }

  const option = Number.parseInt(params.get("o") ?? "1", 10);
  return { term, courses, groups, pins, optionIndex: Number.isFinite(option) && option > 0 ? option - 1 : 0 };
}
