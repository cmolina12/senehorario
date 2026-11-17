// localStorage persistence for the planner. Keys and JSON shape match the
// Angular app so existing saved state, saved plans and exported plan files
// keep working. (Old snapshots also carry `scheduleOptions`; it is ignored
// because schedules are regenerated from the selected sections.)

import type { SelectedMeta, SelectedSections } from "./types";

const STATE_KEY = "planningState";
const PLANS_KEY = "savedPlans";

export interface PlanSnapshot {
  selectedSectionsByCourse: SelectedSections;
  selectedCoursesMeta: SelectedMeta;
  selectedScheduleIndex: number;
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

/** Normalizes anything that looks like a plan snapshot; null if it isn't one. */
export function toSnapshot(data: unknown): PlanSnapshot | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Partial<PlanSnapshot>;
  if (!d.selectedSectionsByCourse || !d.selectedCoursesMeta) return null;
  return {
    selectedSectionsByCourse: d.selectedSectionsByCourse,
    selectedCoursesMeta: d.selectedCoursesMeta,
    selectedScheduleIndex: typeof d.selectedScheduleIndex === "number" ? d.selectedScheduleIndex : 0,
    savedAt: d.savedAt,
  };
}

export const loadPlanningState = () => toSnapshot(read(STATE_KEY));
export const savePlanningState = (state: PlanSnapshot) => write(STATE_KEY, state);

export const loadSavedPlans = (): SavedPlans => read<SavedPlans>(PLANS_KEY) ?? {};
export const persistSavedPlans = (plans: SavedPlans) => write(PLANS_KEY, plans);
