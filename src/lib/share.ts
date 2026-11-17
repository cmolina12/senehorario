// Share links: /planning?t=202710&c=MATE1203-36109-80880&c=IIND4200-10210&o=3
// Only the term, each course's NRCs and the option number travel in the link;
// everything else is fetched fresh from the catalog when it's opened.

import type { SelectedSections } from "./types";

export interface SharedPlan {
  term: string;
  courses: Record<string, string[]>; // course code -> NRCs
  optionIndex: number; // 0-based
}

export function buildShareQuery(sections: SelectedSections, term: string, optionIndex: number): string {
  const params = new URLSearchParams({ t: term });
  for (const [code, list] of Object.entries(sections)) {
    params.append("c", [code, ...list.map((s) => s.nrc)].join("-"));
  }
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

  const option = Number.parseInt(params.get("o") ?? "1", 10);
  return { term, courses, optionIndex: Number.isFinite(option) && option > 0 ? option - 1 : 0 };
}
