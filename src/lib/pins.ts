// Pinned sections: "I want exactly this section of this course". A pinned
// course only offers that section to the generator, and pinning a course in an
// "elige uno" group picks that course for the group.

import type { CourseGroups } from "./groups";
import type { Section, SelectedSections } from "./types";

/** Course code -> pinned NRC (one term per selection, so the NRC is enough). */
export type Pins = Record<string, string>;

/** Keeps pins whose course and section are still selected, at most one per group. */
export function normalizePins(pins: Pins, sections: SelectedSections, groups: CourseGroups): Pins {
  const result: Pins = {};
  const groupOf = new Map<string, number>();
  groups.forEach((group, i) => group.forEach((code) => groupOf.set(code, i)));
  const pinnedGroups = new Set<number>();
  for (const [code, nrc] of Object.entries(pins)) {
    if (!sections[code]?.some((s) => s.nrc === nrc)) continue;
    const group = groupOf.get(code);
    if (group !== undefined) {
      if (pinnedGroups.has(group)) continue;
      pinnedGroups.add(group);
    }
    result[code] = nrc;
  }
  return result;
}

/** Pins `nrc` for `code`, or unpins it if it already is; drops other pins in the same group. */
export function togglePin(pins: Pins, code: string, nrc: string, groups: CourseGroups): Pins {
  if (pins[code] === nrc) return Object.fromEntries(Object.entries(pins).filter(([c]) => c !== code));
  const group = groups.find((g) => g.includes(code)) ?? [];
  return {
    ...Object.fromEntries(Object.entries(pins).filter(([c]) => !group.includes(c))),
    [code]: nrc,
  };
}

/**
 * The sections a generation slot offers. With a pin in the slot, only the
 * pinned section (pins win over preference filters: they're an explicit
 * choice); otherwise every section of every course that passes `keep`.
 */
export function slotSections(
  slot: string[],
  sections: SelectedSections,
  pins: Pins,
  keep: (section: Section) => boolean,
): { code: string; section: Section }[] {
  const pinned = slot.find((code) => pins[code]);
  if (pinned) {
    const section = sections[pinned]?.find((s) => s.nrc === pins[pinned]);
    return section ? [{ code: pinned, section }] : [];
  }
  return slot.flatMap((code) => (sections[code] ?? []).filter(keep).map((section) => ({ code, section })));
}

/** Validates stored or linked pins. */
export function toPins(data: unknown): Pins {
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};
  return Object.fromEntries(
    Object.entries(data).filter((e): e is [string, string] => typeof e[1] === "string"),
  );
}
