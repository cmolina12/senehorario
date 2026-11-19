// Remembers, per browser, how many changelog entries existed the last time
// Novedades was opened, so the planner can flag new ones. Entries are only
// ever added at the top, so a count is enough.

import { CHANGELOG } from "@/content/changelog";

const KEY = "seenChangelog";

/** Entries added since Novedades was last opened; 0 before the first visit is recorded. */
export function unseenChangelogCount(): number {
  try {
    const raw = localStorage.getItem(KEY);
    return raw === null ? 0 : Math.max(0, CHANGELOG.length - (Number(raw) || 0));
  } catch {
    return 0;
  }
}

/** A first visit counts as having seen everything, so only later entries get the dot. */
export function initChangelogSeen() {
  try {
    if (localStorage.getItem(KEY) === null) localStorage.setItem(KEY, String(CHANGELOG.length));
  } catch {
    // Storage blocked: no dot.
  }
}

export function markChangelogSeen() {
  try {
    localStorage.setItem(KEY, String(CHANGELOG.length));
  } catch {
    // Storage blocked: the dot just keeps showing.
  }
}
