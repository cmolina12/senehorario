"use client";

// Selection state, schedule generation and persistence for the planner page.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as api from "@/lib/api";
import { scheduleToEvents } from "@/lib/calendar-events";
import { buildSlots, normalizeGroups, type CourseGroups } from "@/lib/groups";
import { normalizePins, slotSections, togglePin as togglePinIn, type Pins } from "@/lib/pins";
import { describeChange, reconcileSelection, type FreshCourses, type PlanChange } from "@/lib/refresh";
import { parseShareQuery, type SharedPlan } from "@/lib/share";
import {
  MAX_SCHEDULES,
  explainNoSchedules,
  generateAllSchedules,
  mergeHalfSemesterPairs,
  type NoScheduleReason,
} from "@/lib/scheduler";
import {
  DEFAULT_PREFERENCES,
  activeFilterCount,
  sectionConflict,
  sortSchedules,
  type Preferences,
} from "@/lib/preferences";
import {
  loadActivePlan,
  loadPlanningState,
  loadPreferences,
  loadSavedPlans,
  persistSavedPlans,
  savePlanningState,
  saveActivePlan,
  savePreferences,
  type PlanSnapshot,
} from "@/lib/storage";
import { keepNewestTerm } from "@/lib/terms";
import {
  sectionKey,
  type Course,
  type ScheduledSection,
  type Section,
  type SelectedMeta,
  type SelectedSections,
} from "@/lib/types";

export interface Selection {
  sections: SelectedSections; // course code -> chosen candidate sections
  meta: SelectedMeta; // course code -> title/credits
  /** "Elige uno" groups. Omitted in an update = keep the current groups. */
  groups?: CourseGroups;
  /** Pinned section per course. Omitted in an update = keep the current pins. */
  pins?: Pins;
}

export interface SelectedEventInfo {
  section: ScheduledSection;
  courseCode?: string;
  courseTitle?: string;
  courseCredits?: number;
  color?: string;
}

/** Message shown above the calendar after a plan is refreshed or a shared plan is opened. */
export interface PlanNotice {
  title: string;
  lines: string[];
}

const EMPTY_SELECTION: Selection = { sections: {}, meta: {}, groups: [], pins: {} };

const scheduleSignature = (schedule: ScheduledSection[]) => schedule.map(sectionKey).sort().join(",");

/** Live catalog data for each course code. */
async function fetchFreshCourses(codes: string[]): Promise<FreshCourses> {
  return Object.fromEntries(
    await Promise.all(
      codes.map(async (code) => {
        try {
          const { courses, truncated } = await api.searchCourses(code);
          const course = courses.find((c) => c.code === code);
          // Never drop sections based on a partial answer.
          if (truncated) return [code, "error"] as const;
          return [code, course ?? "missing"] as const;
        } catch {
          return [code, "error"] as const;
        }
      }),
    ),
  );
}

/** Coming back to the tab re-checks the plan if the last check is older than this. */
const RECHECK_AFTER_MS = 5 * 60 * 1000;

const refreshNotice = (changes: PlanChange[]): PlanNotice | null =>
  changes.length > 0
    ? { title: "Actualizamos tu plan con la oferta actual", lines: changes.map(describeChange) }
    : null;

/** Saves a plan under "Plan anterior (fecha)" so opening a shared link never loses it. */
function backUpPlan(snapshot: PlanSnapshot): string {
  const plans = loadSavedPlans();
  const stamp = new Date().toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  let name = `Plan anterior (${stamp})`;
  for (let i = 2; plans[name]; i++) name = `Plan anterior (${stamp}) ${i}`;
  persistSavedPlans({ ...plans, [name]: { ...snapshot, savedAt: new Date().toISOString() } });
  return name;
}

const NO_SCHEDULES_ERROR =
  "Todas las combinaciones de las secciones seleccionadas tienen choques. Agrega más secciones o quita alguna que esté causando conflicto.";

const joinOr = (items: string[]) =>
  items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} o ${items.at(-1)}`;

/** Names the courses behind "no schedules" when they can be pinned down. */
function noSchedulesMessage(reason: NoScheduleReason, labels: string[]): string {
  if (reason.kind === "pairs") {
    const shown = reason.pairs.slice(0, 3).map(([a, b]) => `${labels[a]} y ${labels[b]}`);
    const more = reason.pairs.length > 3 ? " (y otros)" : "";
    return reason.pairs.length === 1
      ? `${shown[0]} chocan en todas sus secciones. Agrega otras secciones de alguno de los dos o quita uno.`
      : `Estos cursos chocan en todas sus secciones: ${shown.join(", ")}${more}. Agrega otras secciones o quita alguno.`;
  }
  if (reason.kind === "removable") {
    const names = reason.slots.map((i) => labels[i]);
    return `Ningún par de cursos choca siempre, pero no caben todos juntos. Si quitas ${joinOr(names)}, sí hay horarios. También puedes agregar más secciones.`;
  }
  return NO_SCHEDULES_ERROR;
}

export function usePlanner() {
  const [selection, setSelection] = useState<Selection>(EMPTY_SELECTION);
  const [schedules, setSchedules] = useState<ScheduledSection[][]>([]);
  const [truncated, setTruncated] = useState(false);
  const [scheduleIndex, setScheduleIndex] = useState(0);
  const [scheduleError, setScheduleError] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<SelectedEventInfo | null>(null);
  const [notice, setNotice] = useState<PlanNotice | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  /** When the selection was last checked against the live catalog. */
  const [verifiedAt, setVerifiedAt] = useState<Date | null>(null);
  const [activePlan, setActivePlanState] = useState<string | null>(null);

  /** Remembers which saved plan is being edited (null: none). */
  const setActivePlan = useCallback((name: string | null) => {
    setActivePlanState(name);
    saveActivePlan(name);
  }, []);

  // Bumped on every selection change so a slow catalog refresh never
  // overwrites edits made while it was running.
  const version = useRef(0);
  const scheduleIndexRef = useRef(0);
  const groupsRef = useRef<CourseGroups>([]);
  const pinsRef = useRef<Pins>({});
  const [preferences, setPreferencesState] = useState<Preferences>(DEFAULT_PREFERENCES);
  const preferencesRef = useRef<Preferences>(DEFAULT_PREFERENCES);

  const persist = useCallback((sel: Selection, index: number) => {
    savePlanningState({
      selectedSectionsByCourse: sel.sections,
      selectedCoursesMeta: sel.meta,
      selectedScheduleIndex: index,
      courseGroups: sel.groups ?? [],
      pinnedSections: sel.pins ?? {},
    });
  }, []);

  /**
   * Stores a new selection and regenerates its schedule options. `preferred`
   * is the option to show: an index (kept if still valid) or a schedule to
   * find again among the new options.
   */
  const applySelection = useCallback(
    (update: Selection, preferred: number | ScheduledSection[] = 0, prefs = preferencesRef.current) => {
      version.current++;
      const codes = Object.keys(update.sections);
      const groups = normalizeGroups(update.groups ?? groupsRef.current, codes);
      const pins = normalizePins(update.pins ?? pinsRef.current, update.sections, groups);
      const sel: Selection = { ...update, groups, pins };
      groupsRef.current = groups;
      pinsRef.current = pins;
      setSelection(sel);
      setSelectedEvent(null);

      // One slot per ungrouped course, one per group ("elige uno": a group's
      // slot offers the sections of all its courses, so exactly one is picked).
      // Sections that break a filter or blocked time never enter generation;
      // a pinned section is the only one its slot offers.
      const slots = buildSlots(codes, groups);
      const candidates = slots.map((slot) =>
        slotSections(slot, sel.sections, pins, (s) => sectionConflict(s, prefs) === null).map(
          ({ code, section }): ScheduledSection => ({
            ...section,
            courseCode: code,
            courseTitle: sel.meta[code]?.title,
            courseCredits: sel.meta[code]?.credits,
          }),
        ),
      );
      const blockedCodes = slots.filter((_, i) => candidates[i].length === 0).map((slot) => slot.join(" / "));
      const raw = blockedCodes.length > 0 ? [] : generateAllSchedules(candidates);
      const sorted = sortSchedules(mergeHalfSemesterPairs(raw), prefs.sort);
      let index = 0;
      if (typeof preferred === "number") {
        if (preferred >= 0 && preferred < sorted.length) index = preferred;
      } else {
        const signature = scheduleSignature(preferred);
        index = Math.max(0, sorted.findIndex((s) => scheduleSignature(s) === signature));
      }

      let error = "";
      if (blockedCodes.length > 0) {
        error = `Ninguna sección de ${blockedCodes.join(", ")} cumple tus preferencias. Ajusta los horarios, días libres o bloques en Preferencias.`;
      } else if (codes.length > 0 && raw.length === 0) {
        const message = noSchedulesMessage(
          explainNoSchedules(candidates),
          slots.map((slot) => slot.join(" / ")),
        );
        error = activeFilterCount(prefs) > 0 ? `${message} También puedes relajar tus preferencias.` : message;
      }

      setSchedules(sorted);
      setTruncated(raw.length >= MAX_SCHEDULES);
      setScheduleIndex(index);
      scheduleIndexRef.current = index;
      setScheduleError(error);
      persist(sel, index);
    },
    [persist],
  );

  // --- Selection actions ---

  const toggleSection = useCallback(
    (course: Course, section: Section) => {
      const current = selection.sections[course.code] ?? [];
      const key = sectionKey(section);
      const isSelected = current.some((s) => sectionKey(s) === key);
      const sections = { ...selection.sections };
      const meta = { ...selection.meta, [course.code]: { title: course.title, credits: course.credits } };

      if (isSelected) {
        const remaining = current.filter((s) => sectionKey(s) !== key);
        if (remaining.length > 0) {
          sections[course.code] = remaining;
        } else {
          delete sections[course.code];
          delete meta[course.code];
        }
      } else {
        sections[course.code] = [...current, section];
      }
      applySelection({ sections, meta });
    },
    [selection, applySelection],
  );

  /** `course` should already be narrowed to the active term. */
  const addSections = useCallback(
    (course: Course, onlyAvailable: boolean) => {
      const toAdd = onlyAvailable
        ? course.sections.filter((s) => s.availableSeats > 0)
        : course.sections;
      if (toAdd.length === 0) return;

      const current = selection.sections[course.code] ?? [];
      const currentKeys = new Set(current.map(sectionKey));
      applySelection({
        sections: {
          ...selection.sections,
          [course.code]: [...current, ...toAdd.filter((s) => !currentKeys.has(sectionKey(s)))],
        },
        meta: { ...selection.meta, [course.code]: { title: course.title, credits: course.credits } },
      });
    },
    [selection, applySelection],
  );

  const removeCourse = useCallback(
    (courseCode: string) => {
      if (!selection.sections[courseCode]) return;
      const sections = { ...selection.sections };
      const meta = { ...selection.meta };
      delete sections[courseCode];
      delete meta[courseCode];
      applySelection({ sections, meta });
    },
    [selection, applySelection],
  );

  const removeSection = useCallback(
    (courseCode: string, section: Section) => {
      const current = selection.sections[courseCode];
      if (!current) return;
      const remaining = current.filter((s) => sectionKey(s) !== sectionKey(section));
      const sections = { ...selection.sections };
      const meta = { ...selection.meta };
      if (remaining.length > 0) {
        sections[courseCode] = remaining;
      } else {
        delete sections[courseCode];
        delete meta[courseCode];
      }
      applySelection({ sections, meta });
    },
    [selection, applySelection],
  );

  const isSectionSelected = useCallback(
    (courseCode: string, section: Section) =>
      selection.sections[courseCode]?.some((s) => sectionKey(s) === sectionKey(section)) ?? false,
    [selection],
  );

  /** Re-checks a loaded selection against the live catalog (seats, times, removed sections). */
  const refreshFromCatalog = useCallback(
    async (sel: Selection) => {
      const codes = Object.keys(sel.sections);
      if (codes.length === 0) return;
      const startVersion = version.current;
      setRefreshing(true);
      const fresh = await fetchFreshCourses(codes);
      setRefreshing(false);
      if (version.current !== startVersion) return; // the user changed the plan meanwhile

      // If nothing at all came back, the catalog is probably down or between
      // terms: don't wipe the plan, just say it couldn't be checked.
      if (Object.values(fresh).every((v) => v === "missing" || v === "error")) {
        setNotice(refreshNotice(codes.map((courseCode) => ({ kind: "unverified", courseCode }))));
        return;
      }

      const result = reconcileSelection(sel.sections, sel.meta, fresh);
      const reshaped = result.changes.some((c) => c.kind !== "full" && c.kind !== "unverified");
      applySelection({ sections: result.sections, meta: result.meta }, reshaped ? 0 : scheduleIndexRef.current);
      setNotice(refreshNotice(result.changes));
      if (!result.changes.some((c) => c.kind === "unverified")) setVerifiedAt(new Date());
    },
    [applySelection],
  );

  // Re-check seats when the student comes back to the tab after a while, so
  // "verificados a las…" doesn't quietly go stale while the tab sits open.
  const liveRef = useRef({ selection, verifiedAt, refreshing, lastAttempt: 0 });
  useEffect(() => {
    liveRef.current = { ...liveRef.current, selection, verifiedAt, refreshing };
  }, [selection, verifiedAt, refreshing]);
  useEffect(() => {
    const recheck = () => {
      if (document.visibilityState !== "visible") return;
      const live = liveRef.current;
      const last = Math.max(live.verifiedAt?.getTime() ?? 0, live.lastAttempt);
      if (live.refreshing || Date.now() - last < RECHECK_AFTER_MS) return;
      if (Object.keys(live.selection.sections).length === 0) return;
      live.lastAttempt = Date.now();
      void refreshFromCatalog(live.selection);
    };
    liveRef.current.lastAttempt = Date.now(); // the initial load does its own check
    document.addEventListener("visibilitychange", recheck);
    window.addEventListener("focus", recheck);
    return () => {
      document.removeEventListener("visibilitychange", recheck);
      window.removeEventListener("focus", recheck);
    };
  }, [refreshFromCatalog]);

  /** Replaces the whole selection (restoring state or loading a saved plan), then refreshes it. */
  const loadSnapshot = useCallback(
    (snapshot: PlanSnapshot) => {
      const { sections, meta } = keepNewestTerm(
        snapshot.selectedSectionsByCourse,
        snapshot.selectedCoursesMeta,
      );
      setNotice(null);
      applySelection(
        { sections, meta, groups: snapshot.courseGroups ?? [], pins: snapshot.pinnedSections ?? {} },
        snapshot.selectedScheduleIndex,
      );
      void refreshFromCatalog({ sections, meta });
    },
    [applySelection, refreshFromCatalog],
  );

  /**
   * Opens a plan from a share link. The sections come fresh from the catalog;
   * `previous` (the visitor's own plan, if any) is saved to "Mis planes" first.
   */
  const loadSharedPlan = useCallback(
    async (shared: SharedPlan, previous: PlanSnapshot | null) => {
      const codes = Object.keys(shared.courses);
      const startVersion = version.current;
      setRefreshing(true);
      const fresh = await fetchFreshCourses(codes);
      setRefreshing(false);
      if (version.current !== startVersion) return;

      if (Object.values(fresh).every((v) => v === "missing" || v === "error")) {
        if (previous) loadSnapshot(previous);
        setNotice({
          title: "No pudimos abrir el plan compartido",
          lines: ["La oferta de cursos no respondió o ya no tiene estos cursos. Intenta de nuevo más tarde."],
        });
        return;
      }

      const sections: Selection["sections"] = {};
      const meta: Selection["meta"] = {};
      const changes: PlanChange[] = [];
      for (const code of codes) {
        const live = fresh[code];
        if (live === "error") {
          changes.push({ kind: "unverified", courseCode: code });
          continue;
        }
        if (live === "missing") {
          changes.push({ kind: "courseRemoved", courseCode: code });
          continue;
        }
        const found = live.sections.filter((s) => s.term === shared.term && shared.courses[code].includes(s.nrc));
        for (const nrc of shared.courses[code]) {
          if (!found.some((s) => s.nrc === nrc)) {
            changes.push({ kind: "nrcNotFound", courseCode: code, nrc });
          }
        }
        if (found.length > 0) {
          sections[code] = found;
          meta[code] = { title: live.title, credits: live.credits };
        }
      }

      const hasPrevious = !!previous && Object.keys(previous.selectedSectionsByCourse).length > 0;
      const savedAs = hasPrevious ? backUpPlan(previous) : null;
      applySelection({ sections, meta, groups: shared.groups, pins: shared.pins }, shared.optionIndex);
      if (!changes.some((c) => c.kind === "unverified")) setVerifiedAt(new Date());
      // The shared selection isn't any of this browser's saved plans.
      setActivePlan(null);
      setNotice({
        title: "Abriste un plan compartido",
        lines: [
          ...(savedAs ? [`Tu plan anterior quedó guardado en Mis planes como “${savedAs}”.`] : []),
          ...changes.map(describeChange),
        ],
      });
    },
    [applySelection, loadSnapshot, setActivePlan],
  );

  /** Updates preferences and regenerates the options from the first one. */
  const setPreferences = useCallback(
    (next: Preferences) => {
      preferencesRef.current = next;
      setPreferencesState(next);
      savePreferences(next);
      applySelection(selection, 0, next);
    },
    [applySelection, selection],
  );

  // Restore preferences and the last session on mount. localStorage isn't
  // available during server rendering, so this has to happen after hydration.
  // Runs once even when React re-runs effects (Strict Mode in development):
  // a second run would no longer see the share link and would cancel it.
  const initialized = useRef(false);
  /* eslint-disable react-hooks/set-state-in-effect -- restoring from localStorage/URL after hydration */
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const prefs = loadPreferences();
    preferencesRef.current = prefs;
    setPreferencesState(prefs);
    setActivePlanState(loadActivePlan());
    const saved = loadPlanningState();
    const shared = parseShareQuery(window.location.search);
    if (shared) {
      // Drop the share parameters so a reload doesn't reopen the link.
      window.history.replaceState(null, "", window.location.pathname);
      void loadSharedPlan(shared, saved);
    } else if (saved) {
      loadSnapshot(saved);
    }
  }, [loadSnapshot, loadSharedPlan]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // --- Schedule navigation ---

  const goToSchedule = useCallback(
    (index: number) => {
      if (index < 0 || index >= schedules.length) return;
      setScheduleIndex(index);
      scheduleIndexRef.current = index;
      persist(selection, index);
    },
    [schedules.length, selection, persist],
  );

  /** Replaces the "elige uno" groups and regenerates from the first option. */
  const setGroups = useCallback(
    (groups: CourseGroups) => applySelection({ ...selection, groups }, 0),
    [applySelection, selection],
  );

  /**
   * Pins a section (or unpins it). Stays on the current option when it still
   * exists, so pinning from the calendar doesn't jump elsewhere.
   */
  const togglePin = useCallback(
    (courseCode: string, nrc: string) => {
      const pins = togglePinIn(selection.pins ?? {}, courseCode, nrc, selection.groups ?? []);
      const openDetails = selectedEvent;
      applySelection({ ...selection, pins }, schedules[scheduleIndex] ?? 0);
      // Keep the class details open (pinning from there shouldn't close them).
      if (openDetails) setSelectedEvent(openDetails);
    },
    [applySelection, selection, schedules, scheduleIndex, selectedEvent],
  );

  const selectedCodes = useMemo(() => Object.keys(selection.sections), [selection.sections]);
  const groups = selection.groups ?? [];
  const currentSchedule = schedules[scheduleIndex] ?? null;
  // Colors follow selection order, so a course keeps its color even in
  // options that leave it out (groups).
  const pins = selection.pins;
  const events = useMemo(() => {
    if (!currentSchedule) return [];
    const pinned = new Set(currentSchedule.filter((s) => pins?.[s.courseCode] === s.nrc).map(sectionKey));
    return scheduleToEvents(currentSchedule, selectedCodes, pinned);
  }, [currentSchedule, selectedCodes, pins]);

  // With groups, an option takes one course per group, so count slots and
  // add up the credits of the courses actually in the option.
  const courseCount = buildSlots(selectedCodes, groups).length;
  const totalCredits = currentSchedule
    ? [...new Map(currentSchedule.map((s) => [s.courseCode, s.courseCredits ?? 0])).values()].reduce((a, b) => a + b, 0)
    : Object.entries(selection.meta)
        .filter(([code]) => !groups.some((g) => g.includes(code)))
        .reduce((sum, [, m]) => sum + (m.credits || 0), 0);
  // Every selected section shares one term (enforced by the UI and keepNewestTerm).
  const selectionTerm = selectedCodes.length > 0 ? selection.sections[selectedCodes[0]][0]?.term ?? null : null;

  return {
    selection,
    selectedCodes,
    groups,
    setGroups,
    pins: pins ?? {},
    togglePin,
    courseCount,
    selectionTerm,
    totalCredits,
    schedules,
    truncated,
    scheduleIndex,
    currentSchedule,
    events,
    scheduleError,
    selectedEvent,
    setSelectedEvent,
    notice,
    dismissNotice: () => setNotice(null),
    preferences,
    setPreferences,
    refreshing,
    verifiedAt,
    toggleSection,
    addSections,
    removeCourse,
    removeSection,
    isSectionSelected,
    loadSnapshot,
    goToSchedule,
    activePlan,
    setActivePlan,
  };
}
