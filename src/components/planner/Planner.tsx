"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MAX_SCHEDULES } from "@/lib/scheduler";
import { loadSavedPlans, toSnapshot, type PlanSnapshot, type SavedPlans } from "@/lib/storage";
import { coursesInTerm, sortTerms, termsOfCourses } from "@/lib/terms";
import { CalendarPanel } from "./CalendarPanel";
import { CbuPanel, useCbus } from "./CbuPanel";
import { EventDetailsPanel } from "./EventDetailsPanel";
import { PlansModal } from "./PlansModal";
import { SearchPanel, useCourseSearch } from "./SearchPanel";
import { SelectedCoursesPanel } from "./SelectedCoursesPanel";
import { usePlanner } from "./usePlanner";

export function Planner() {
  const planner = usePlanner();
  const search = useCourseSearch();
  const cbuState = useCbus(planner.schedules.length > 0);
  const [activeCode, setActiveCode] = useState<string | null>(null);
  const [plansOpen, setPlansOpen] = useState(false);
  const [savedPlans, setSavedPlans] = useState<SavedPlans>({});

  const [chosenTerm, setChosenTerm] = useState<string | null>(null);

  const { schedules, scheduleIndex, goToSchedule, selection } = planner;

  // The catalog may publish several terms at once; work on one at a time.
  // A non-empty selection pins the term; otherwise use the user's pick or the newest term seen.
  const knownTerms = useMemo(
    () =>
      sortTerms([
        ...termsOfCourses(search.courses),
        ...termsOfCourses(cbuState.cbus),
        ...(planner.selectionTerm ? [planner.selectionTerm] : []),
      ]),
    [search.courses, cbuState.cbus, planner.selectionTerm],
  );
  const activeTerm =
    planner.selectionTerm ??
    (chosenTerm && knownTerms.includes(chosenTerm) ? chosenTerm : (knownTerms[0] ?? null));
  const visibleCourses = useMemo(
    () => coursesInTerm(search.courses, activeTerm),
    [search.courses, activeTerm],
  );
  const hasSchedules = schedules.length > 0;

  // Forget the expanded course card once that course is no longer selected.
  const activeCodeVisible = activeCode && selection.sections[activeCode] ? activeCode : null;

  const openPlans = () => {
    setSavedPlans(loadSavedPlans());
    setPlansOpen(true);
  };

  const currentSnapshot = useCallback(
    (): PlanSnapshot => ({
      selectedSectionsByCourse: selection.sections,
      selectedCoursesMeta: selection.meta,
      selectedScheduleIndex: scheduleIndex,
    }),
    [selection, scheduleIndex],
  );

  const loadPlan = (snapshot: PlanSnapshot) => {
    const normalized = toSnapshot(snapshot);
    if (normalized) planner.loadSnapshot(normalized);
    setPlansOpen(false);
  };

  return (
    <div className="planning-page">
      {/* Top Navigation Bar */}
      <header className="planning-header">
        <div className="d-flex align-items-center justify-content-between px-4 py-2">
          <Link href="/" className="d-flex align-items-center text-decoration-none">
            <i className="bi bi-arrow-left me-2 brand-text"></i>
          </Link>
          <div className="d-flex align-items-center gap-3">
            <button type="button" className="theme-toggle" onClick={openPlans} title="Mis planes">
              <i className="bi bi-bookmark-star"></i>
            </button>
            <ThemeToggle />
            {hasSchedules && (
              <>
                <span className="schedule-counter">
                  Opción {scheduleIndex + 1} de {schedules.length}
                  {planner.truncated && "+"}
                </span>
                <div className="btn-group btn-group-sm">
                  <button
                    className="btn-toggle"
                    onClick={() => goToSchedule(scheduleIndex - 1)}
                    disabled={scheduleIndex === 0}
                    title="Previous schedule"
                  >
                    <i className="bi bi-chevron-left"></i>
                  </button>
                  <button
                    className="btn-toggle"
                    onClick={() => goToSchedule(scheduleIndex + 1)}
                    disabled={scheduleIndex === schedules.length - 1}
                    title={
                      planner.truncated
                        ? `Next schedule (showing the first ${MAX_SCHEDULES} combinations)`
                        : "Next schedule"
                    }
                  >
                    <i className="bi bi-chevron-right"></i>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="planning-container">
        {/* TOP SECTION: Course Search + Selected Courses */}
        <section className="top-section">
          <SearchPanel
            search={search}
            courses={visibleCourses}
            term={{
              terms: knownTerms,
              active: activeTerm,
              onChange: setChosenTerm,
              locked: planner.selectedCodes.length > 0,
            }}
            isSectionSelected={planner.isSectionSelected}
            onToggleSection={planner.toggleSection}
            onAddSections={planner.addSections}
            onRemoveCourse={planner.removeCourse}
          />
          <SelectedCoursesPanel
            selection={selection}
            totalCredits={planner.totalCredits}
            activeCode={activeCodeVisible}
            onActiveChange={setActiveCode}
            onSearchFor={search.searchFor}
            onRemoveSection={planner.removeSection}
          />
        </section>

        {/* BOTTOM SECTION: Schedule Calendar + Event Details */}
        <section className="bottom-section">
          <CalendarPanel
            events={planner.events}
            error={planner.scheduleError}
            hasSelection={planner.selectedCodes.length > 0}
            onEventClick={planner.setSelectedEvent}
          />
          <EventDetailsPanel event={planner.selectedEvent} />
        </section>

        {/* CBU SECTION: CBUs that fit in the current schedule option */}
        {hasSchedules && planner.currentSchedule && (
          <CbuPanel
            cbuState={cbuState}
            term={activeTerm}
            optionNumber={scheduleIndex + 1}
            schedule={planner.currentSchedule}
            isSectionSelected={planner.isSectionSelected}
            onToggleSection={planner.toggleSection}
          />
        )}
      </div>

      {plansOpen && (
        <PlansModal
          plans={savedPlans}
          onPlansChange={setSavedPlans}
          currentSnapshot={currentSnapshot}
          onLoad={loadPlan}
          onClose={() => setPlansOpen(false)}
        />
      )}
    </div>
  );
}
