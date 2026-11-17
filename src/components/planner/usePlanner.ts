"use client";

// Selection state, schedule generation and persistence for the planner page.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as api from "@/lib/api";
import { scheduleToEvents } from "@/lib/calendar-events";
import { reconcileSelection, type FreshCourses, type PlanChange } from "@/lib/refresh";
import { MAX_SCHEDULES, generateAllSchedules, mergeHalfSemesterPairs } from "@/lib/scheduler";
import { loadPlanningState, savePlanningState, type PlanSnapshot } from "@/lib/storage";
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
}

export interface SelectedEventInfo {
  section: ScheduledSection;
  courseCode?: string;
  courseTitle?: string;
  courseCredits?: number;
  color?: string;
}

const EMPTY_SELECTION: Selection = { sections: {}, meta: {} };

const NO_SCHEDULES_ERROR =
  "No se encontraron horarios compatibles para las secciones seleccionadas. Por favor, seleccione secciones diferentes o verifique si hay conflictos.";

export function usePlanner() {
  const [selection, setSelection] = useState<Selection>(EMPTY_SELECTION);
  const [schedules, setSchedules] = useState<ScheduledSection[][]>([]);
  const [truncated, setTruncated] = useState(false);
  const [scheduleIndex, setScheduleIndex] = useState(0);
  const [scheduleError, setScheduleError] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<SelectedEventInfo | null>(null);
  const [planChanges, setPlanChanges] = useState<PlanChange[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Bumped on every selection change so a slow catalog refresh never
  // overwrites edits made while it was running.
  const version = useRef(0);
  const scheduleIndexRef = useRef(0);

  const persist = useCallback((sel: Selection, index: number) => {
    savePlanningState({
      selectedSectionsByCourse: sel.sections,
      selectedCoursesMeta: sel.meta,
      selectedScheduleIndex: index,
    });
  }, []);

  /** Stores a new selection and regenerates its schedule options, keeping `preferredIndex` if still valid. */
  const applySelection = useCallback(
    (sel: Selection, preferredIndex = 0) => {
      version.current++;
      setSelection(sel);
      setSelectedEvent(null);

      const codes = Object.keys(sel.sections);
      const candidates = codes.map((code) =>
        sel.sections[code].map(
          (s): ScheduledSection => ({
            ...s,
            courseCode: code,
            courseTitle: sel.meta[code]?.title,
            courseCredits: sel.meta[code]?.credits,
          }),
        ),
      );
      const raw = generateAllSchedules(candidates);
      const merged = mergeHalfSemesterPairs(raw);
      const index = preferredIndex >= 0 && preferredIndex < merged.length ? preferredIndex : 0;

      setSchedules(merged);
      setTruncated(raw.length >= MAX_SCHEDULES);
      setScheduleIndex(index);
      scheduleIndexRef.current = index;
      setScheduleError(codes.length > 0 && raw.length === 0 ? NO_SCHEDULES_ERROR : "");
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
      const fresh: FreshCourses = Object.fromEntries(
        await Promise.all(
          codes.map(async (code) => {
            try {
              const results = await api.searchCourses(code);
              return [code, results.find((c) => c.code === code) ?? "missing"] as const;
            } catch {
              return [code, "error"] as const;
            }
          }),
        ),
      );
      setRefreshing(false);
      if (version.current !== startVersion) return; // the user changed the plan meanwhile

      // If nothing at all came back, the catalog is probably down or between
      // terms: don't wipe the plan, just say it couldn't be checked.
      if (Object.values(fresh).every((v) => v === "missing" || v === "error")) {
        setPlanChanges(codes.map((courseCode) => ({ kind: "unverified", courseCode })));
        return;
      }

      const result = reconcileSelection(sel.sections, sel.meta, fresh);
      const reshaped = result.changes.some((c) => c.kind !== "full" && c.kind !== "unverified");
      applySelection({ sections: result.sections, meta: result.meta }, reshaped ? 0 : scheduleIndexRef.current);
      setPlanChanges(result.changes);
    },
    [applySelection],
  );

  /** Replaces the whole selection (restoring state or loading a saved plan), then refreshes it. */
  const loadSnapshot = useCallback(
    (snapshot: PlanSnapshot) => {
      const { sections, meta } = keepNewestTerm(
        snapshot.selectedSectionsByCourse,
        snapshot.selectedCoursesMeta,
      );
      setPlanChanges([]);
      applySelection({ sections, meta }, snapshot.selectedScheduleIndex);
      void refreshFromCatalog({ sections, meta });
    },
    [applySelection, refreshFromCatalog],
  );

  // Restore the last session on mount. localStorage isn't available during
  // server rendering, so this has to happen after hydration.
  useEffect(() => {
    const saved = loadPlanningState();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved) loadSnapshot(saved);
  }, [loadSnapshot]);

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

  const currentSchedule = schedules[scheduleIndex] ?? null;
  const events = useMemo(
    () => (currentSchedule ? scheduleToEvents(currentSchedule) : []),
    [currentSchedule],
  );

  const selectedCodes = Object.keys(selection.sections);
  const totalCredits = Object.values(selection.meta).reduce((sum, m) => sum + (m.credits || 0), 0);
  // Every selected section shares one term (enforced by the UI and keepNewestTerm).
  const selectionTerm = selectedCodes.length > 0 ? selection.sections[selectedCodes[0]][0]?.term ?? null : null;

  return {
    selection,
    selectedCodes,
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
    planChanges,
    dismissPlanChanges: () => setPlanChanges([]),
    refreshing,
    toggleSection,
    addSections,
    removeCourse,
    removeSection,
    isSectionSelected,
    loadSnapshot,
    goToSchedule,
  };
}
