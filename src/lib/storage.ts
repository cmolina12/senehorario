// localStorage persistence for the planner. Keys and JSON shape match the
// Angular app so existing saved state, saved plans and exported plan files
// keep working. (Old snapshots also carry `scheduleOptions`; it is ignored
// because schedules are regenerated from the selected sections.)

import { toGroups } from "./groups";
import { toPreferences, type Preferences } from "./preferences";
import type { SelectedMeta, SelectedSections } from "./types";

const STATE_KEY = "planningState";
const PLANS_KEY = "savedPlans";
const PREFERENCES_KEY = "schedulePreferences";

export interface PlanSnapshot {
  selectedSectionsByCourse: SelectedSections;
  selectedCoursesMeta: SelectedMeta;
  selectedScheduleIndex: number;
  /** "Elige uno" groups of course codes (newer plans only). */
  courseGroups?: string[][];
  savedAt?: string;
}

export type SavedPlans = Record<string, PlanSnapshot>;

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Could not save ${key} to localStorage.`, error);
  }
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);

/** Enough structure for the scheduler and UI not to crash on stored/imported data. */
function isSectionLike(v: unknown): boolean {
  return (
    isObject(v) &&
    typeof v.nrc === "string" &&
    typeof v.term === "string" &&
    Array.isArray(v.meetings) &&
    v.meetings.every(
      (m) => isObject(m) && typeof m.day === "string" && typeof m.start === "string" && typeof m.end === "string",
    )
  );
}

/** Normalizes anything that looks like a plan snapshot; null if it isn't one. */
export function toSnapshot(data: unknown): PlanSnapshot | null {
  if (!isObject(data)) return null;
  const d = data as Partial<PlanSnapshot>;
  if (!isObject(d.selectedSectionsByCourse) || !isObject(d.selectedCoursesMeta)) return null;
  const sectionsValid = Object.values(d.selectedSectionsByCourse).every(
    (list) => Array.isArray(list) && list.every(isSectionLike),
  );
  if (!sectionsValid) return null;
  return {
    selectedSectionsByCourse: d.selectedSectionsByCourse,
    selectedCoursesMeta: d.selectedCoursesMeta,
    selectedScheduleIndex: typeof d.selectedScheduleIndex === "number" ? d.selectedScheduleIndex : 0,
    courseGroups: toGroups(d.courseGroups),
    savedAt: d.savedAt,
  };
}

export const loadPlanningState = () => toSnapshot(read(STATE_KEY));
export const savePlanningState = (state: PlanSnapshot) => write(STATE_KEY, state);

/** Saved plans, skipping any entry that isn't a valid snapshot. */
export function loadSavedPlans(): SavedPlans {
  const raw = read<unknown>(PLANS_KEY);
  if (!isObject(raw)) return {};
  const plans: SavedPlans = {};
  for (const [name, value] of Object.entries(raw)) {
    const snapshot = toSnapshot(value);
    if (snapshot) plans[name] = snapshot;
  }
  return plans;
}
export const persistSavedPlans = (plans: SavedPlans) => write(PLANS_KEY, plans);

export const loadPreferences = (): Preferences => toPreferences(read(PREFERENCES_KEY));
export const savePreferences = (prefs: Preferences) => write(PREFERENCES_KEY, prefs);
