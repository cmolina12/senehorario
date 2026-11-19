// Brings a saved selection up to date with the live catalog. Saved sections
// are snapshots (seats, times, professors at the time they were added), so a
// plan from last week can be stale.

import { toMinutes } from "./scheduler";
import { coursesInTerm } from "./terms";
import { sectionKey, type Course, type Section, type SelectedMeta, type SelectedSections } from "./types";

/** Live data per selected course: the course, "missing" if the catalog no longer has it, or "error" if it couldn't be checked. */
export type FreshCourses = Record<string, Course | "missing" | "error">;

export type PlanChange =
  | { kind: "removed"; courseCode: string; sectionId: string; nrc: string }
  | { kind: "courseRemoved"; courseCode: string }
  | { kind: "full"; courseCode: string; sectionId: string; nrc: string }
  | { kind: "timeChanged"; courseCode: string; sectionId: string; nrc: string }
  | { kind: "unverified"; courseCode: string }
  | { kind: "nrcNotFound"; courseCode: string; nrc: string };

// Weekly slots and one-off sessions together, so a plan saved before
// sessions were split out of the weekly meetings doesn't read as changed.
const meetingsSignature = (s: Pick<Section, "meetings" | "sessions">) =>
  [...new Set([...s.meetings, ...(s.sessions ?? [])].map((m) => `${m.day}-${toMinutes(m.start)}-${toMinutes(m.end)}`))]
    .sort()
    .join("|");

export function reconcileSelection(
  sections: SelectedSections,
  meta: SelectedMeta,
  fresh: FreshCourses,
): { sections: SelectedSections; meta: SelectedMeta; changes: PlanChange[] } {
  const nextSections: SelectedSections = {};
  const nextMeta: SelectedMeta = {};
  const changes: PlanChange[] = [];

  for (const [code, saved] of Object.entries(sections)) {
    const live = fresh[code];

    if (live === undefined || live === "error") {
      nextSections[code] = saved;
      if (meta[code]) nextMeta[code] = meta[code];
      changes.push({ kind: "unverified", courseCode: code });
      continue;
    }
    if (live === "missing") {
      changes.push({ kind: "courseRemoved", courseCode: code });
      continue;
    }

    const byKey = new Map(live.sections.map((s) => [sectionKey(s), s]));
    const kept = [];
    const courseChanges: PlanChange[] = [];
    for (const old of saved) {
      const current = byKey.get(sectionKey(old));
      const ref = { courseCode: code, sectionId: old.sectionId, nrc: old.nrc };
      if (!current) {
        courseChanges.push({ kind: "removed", ...ref });
        continue;
      }
      if (meetingsSignature(current) !== meetingsSignature(old)) {
        courseChanges.push({ kind: "timeChanged", ...ref });
      }
      if (current.availableSeats === 0 && old.availableSeats > 0) {
        courseChanges.push({ kind: "full", ...ref });
      }
      kept.push(current);
    }

    if (kept.length > 0) {
      nextSections[code] = kept;
      // The term's own title; a course can be renamed between terms.
      const [inTerm] = coursesInTerm([live], kept[0].term);
      nextMeta[code] = { title: inTerm?.title ?? live.title, credits: live.credits };
      changes.push(...courseChanges);
    } else {
      changes.push({ kind: "courseRemoved", courseCode: code });
    }
  }

  return { sections: nextSections, meta: nextMeta, changes };
}

/** One-line Spanish description of a change, for the notice shown in the planner. */
export function describeChange(change: PlanChange): string {
  switch (change.kind) {
    case "removed":
      return `${change.courseCode}: la sección ${change.sectionId} (NRC ${change.nrc}) ya no está en la oferta y se quitó.`;
    case "courseRemoved":
      return `${change.courseCode} ya no tiene ninguna de tus secciones en la oferta y se quitó.`;
    case "full":
      return `${change.courseCode}: la sección ${change.sectionId} (NRC ${change.nrc}) se quedó sin cupos.`;
    case "timeChanged":
      return `${change.courseCode}: la sección ${change.sectionId} (NRC ${change.nrc}) cambió de horario.`;
    case "unverified":
      return `No pudimos verificar ${change.courseCode} con la oferta actual.`;
    case "nrcNotFound":
      return `${change.courseCode}: el NRC ${change.nrc} ya no está en la oferta.`;
  }
}
