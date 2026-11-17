// Course groups ("elige uno"): every schedule includes exactly one course from
// each group, e.g. three electives when you only need one of them.

/** Each group is a list of course codes (at least two). */
export type CourseGroups = string[][];

/** Drops unknown or repeated codes, keeps each code in one group, and removes groups with fewer than two courses. */
export function normalizeGroups(groups: CourseGroups, codes: string[]): CourseGroups {
  const known = new Set(codes);
  const used = new Set<string>();
  const result: CourseGroups = [];
  for (const group of groups) {
    const kept = group.filter((code) => known.has(code) && !used.has(code));
    kept.forEach((code) => used.add(code));
    if (kept.length >= 2) result.push(kept);
  }
  return result;
}

/**
 * Generation slots in selection order: an ungrouped course is its own slot,
 * a group is one slot (placed where its first course appears).
 */
export function buildSlots(codes: string[], groups: CourseGroups): string[][] {
  const groupOf = new Map<string, string[]>();
  for (const group of groups) for (const code of group) groupOf.set(code, group);
  const emitted = new Set<string[]>();
  const slots: string[][] = [];
  for (const code of codes) {
    const group = groupOf.get(code);
    if (!group) {
      slots.push([code]);
    } else if (!emitted.has(group)) {
      emitted.add(group);
      slots.push(codes.filter((c) => group.includes(c)));
    }
  }
  return slots;
}

/** Validates stored or linked groups. */
export function toGroups(data: unknown): CourseGroups {
  if (!Array.isArray(data)) return [];
  return data.filter(
    (g): g is string[] => Array.isArray(g) && g.length >= 2 && g.every((c) => typeof c === "string"),
  );
}
