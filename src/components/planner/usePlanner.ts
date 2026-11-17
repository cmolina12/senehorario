"use client";

// Selection state, schedule generation and persistence for the planner page.

import { useCallback, useEffect, useMemo, useState } from "react";
import { scheduleToEvents } from "@/lib/calendar-events";
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

  /** Replaces the whole selection (restoring state or loading a saved plan). */
  const loadSnapshot = useCallback(
    (snapshot: PlanSnapshot) => {
      const { sections, meta } = keepNewestTerm(
        snapshot.selectedSectionsByCourse,
        snapshot.selectedCoursesMeta,
      );
      applySelection({ sections, meta }, snapshot.selectedScheduleIndex);
    },
    [applySelection],
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
    toggleSection,
    addSections,
    removeCourse,
    removeSection,
    isSectionSelected,
    loadSnapshot,
    goToSchedule,
  };
}
