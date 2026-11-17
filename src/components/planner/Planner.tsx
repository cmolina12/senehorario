"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { blockEvents, courseColor, visibleRange } from "@/lib/calendar-events";
import { cn } from "@/lib/format";
import { loadSavedPlans, toSnapshot, type PlanSnapshot, type SavedPlans } from "@/lib/storage";
import { coursesInTerm, sortTerms, termsOfCourses } from "@/lib/terms";
import { CalendarView } from "./CalendarView";
import { CbuTab } from "./CbuTab";
import { CoursesTab } from "./CoursesTab";
import { DetailsDrawer } from "./DetailsDrawer";
import { PlansModal } from "./PlansModal";
import { SearchTab } from "./SearchTab";
import { useCbus } from "./useCbus";
import { useCourseSearch } from "./useCourseSearch";
import { usePlanner } from "./usePlanner";

type SidebarTab = "search" | "courses" | "cbus";

const SIDEBAR_TABS: { id: SidebarTab; label: string; icon: string }[] = [
  { id: "search", label: "Buscar", icon: "bi-search" },
  { id: "courses", label: "Mis cursos", icon: "bi-bookmark-check" },
  { id: "cbus", label: "CBUs", icon: "bi-stars" },
];

/**
 * Desktop: sidebar (search / my courses / CBUs) next to a large calendar.
 * Phones: one view at a time, switched from a bottom tab bar.
 */
export function Planner() {
  const planner = usePlanner();
  const search = useCourseSearch();
  const cbuState = useCbus(planner.schedules.length > 0);
  const [tab, setTab] = useState<SidebarTab>("search");
  const [mobileCalendar, setMobileCalendar] = useState(false);
  const [plansOpen, setPlansOpen] = useState(false);
  const [savedPlans, setSavedPlans] = useState<SavedPlans>({});
  const [chosenTerm, setChosenTerm] = useState<string | null>(null);

  const { schedules, scheduleIndex, goToSchedule, selection, setSelectedEvent } = planner;
  const courseCount = planner.selectedCodes.length;

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

  // Fit the calendar to every candidate section so switching options doesn't resize it.
  const { preferences } = planner;
  const range = useMemo(
    () =>
      visibleRange(
        Object.values(selection.sections).flat(),
        preferences.blocks.map((b) => ({ day: b.day, start: b.start, end: b.end, location: "" })),
      ),
    [selection, preferences.blocks],
  );
  const events = useMemo(
    () => [...planner.events, ...blockEvents(preferences.blocks)],
    [planner.events, preferences.blocks],
  );

  const selectedCount = useCallback(
    (code: string) => selection.sections[code]?.length ?? 0,
    [selection],
  );
  const colorFor = useCallback(
    (code: string) => (selection.sections[code] ? courseColor(Object.keys(selection.sections), code) : undefined),
    [selection],
  );

  const showTab = (next: SidebarTab) => {
    setTab(next);
    setMobileCalendar(false);
  };

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
    setMobileCalendar(true);
  };

  const closeDetails = useCallback(() => setSelectedEvent(null), [setSelectedEvent]);

  const sidebarContent = {
    search: (
      <SearchTab
        search={search}
        courses={visibleCourses}
        term={{
          terms: knownTerms,
          active: activeTerm,
          onChange: setChosenTerm,
          locked: courseCount > 0,
        }}
        selectedCount={selectedCount}
        colorFor={colorFor}
        isSectionSelected={planner.isSectionSelected}
        onToggleSection={planner.toggleSection}
        onAddSections={planner.addSections}
        onRemoveCourse={planner.removeCourse}
      />
    ),
    courses: (
      <CoursesTab
        selection={selection}
        totalCredits={planner.totalCredits}
        term={planner.selectionTerm}
        onSearchFor={(code) => {
          search.searchFor(code);
          showTab("search");
        }}
        onRemoveSection={planner.removeSection}
        onRemoveCourse={planner.removeCourse}
        onGoToSearch={() => showTab("search")}
      />
    ),
    cbus: (
      <CbuTab
        cbuState={cbuState}
        term={activeTerm}
        optionNumber={scheduleIndex + 1}
        schedule={planner.currentSchedule}
        selectedCount={selectedCount}
        colorFor={colorFor}
        isSectionSelected={planner.isSectionSelected}
        onToggleSection={planner.toggleSection}
      />
    ),
  }[tab];

  const tabBadge = (id: SidebarTab) => (id === "courses" && courseCount > 0 ? courseCount : null);

  return (
    <div className="flex h-dvh flex-col bg-bg">
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b-[3px] border-accent bg-surface px-3 sm:px-4">
        <Link href="/" className="flex items-center gap-2 rounded-lg px-1.5 py-1 transition hover:bg-surface-hover">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/peluche.png" alt="" className="size-7" />
          <span className="font-bold tracking-tight">Senéhorario</span>
        </Link>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={openPlans}
            className="inline-flex h-9 items-center gap-2 rounded-lg px-2.5 text-sm font-medium text-fg-secondary transition hover:bg-surface-hover hover:text-fg"
          >
            <i className="bi bi-bookmark-star" aria-hidden="true"></i>
            <span className="hidden sm:inline">Mis planes</span>
          </button>
          <ThemeToggle />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Sidebar */}
        <aside
          className={cn(
            "min-h-0 w-full flex-col border-border bg-surface lg:flex lg:w-[400px] lg:shrink-0 lg:border-r",
            mobileCalendar ? "hidden" : "flex",
          )}
        >
          <nav className="hidden shrink-0 gap-1 border-b border-border p-2 lg:flex" aria-label="Secciones del planificador">
            {SIDEBAR_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => showTab(t.id)}
                aria-current={tab === t.id ? "page" : undefined}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium whitespace-nowrap transition",
                  tab === t.id ? "bg-accent-soft font-semibold text-fg" : "text-fg-secondary hover:bg-surface-hover hover:text-fg",
                )}
              >
                <i className={`bi ${t.icon}`} aria-hidden="true"></i>
                {t.label}
                {tabBadge(t.id) && (
                  <span className="rounded-full bg-accent px-1.5 text-[0.65rem] leading-4 font-bold text-on-accent">
                    {tabBadge(t.id)}
                  </span>
                )}
              </button>
            ))}
          </nav>
          <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto pb-20 lg:pb-0">{sidebarContent}</div>
        </aside>

        {/* Calendar */}
        <main
          className={cn(
            "scrollbar-thin min-w-0 flex-1 overflow-y-auto pb-20 lg:block lg:pb-0",
            mobileCalendar ? "block" : "hidden",
          )}
        >
          <CalendarView
            courseCount={courseCount}
            totalCredits={planner.totalCredits}
            term={planner.selectionTerm}
            optionCount={schedules.length}
            optionIndex={scheduleIndex}
            truncated={planner.truncated}
            onOptionChange={goToSchedule}
            schedule={planner.currentSchedule}
            events={events}
            range={range}
            error={planner.scheduleError}
            onEventClick={setSelectedEvent}
            onGoToSearch={() => showTab("search")}
            refreshing={planner.refreshing}
            planChanges={planner.planChanges}
            onDismissChanges={planner.dismissPlanChanges}
            preferences={preferences}
            onPreferencesChange={planner.setPreferences}
          />
        </main>
      </div>

      {/* Phone tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
        aria-label="Secciones del planificador"
      >
        <MobileTab icon="bi-search" label="Buscar" active={!mobileCalendar && tab === "search"} onClick={() => showTab("search")} />
        <MobileTab
          icon="bi-bookmark-check"
          label="Mis cursos"
          badge={tabBadge("courses")}
          active={!mobileCalendar && tab === "courses"}
          onClick={() => showTab("courses")}
        />
        <MobileTab
          icon="bi-calendar-week"
          label="Horario"
          badge={schedules.length > 0 ? schedules.length : null}
          active={mobileCalendar}
          onClick={() => setMobileCalendar(true)}
        />
        <MobileTab icon="bi-stars" label="CBUs" active={!mobileCalendar && tab === "cbus"} onClick={() => showTab("cbus")} />
      </nav>

      <DetailsDrawer event={planner.selectedEvent} onClose={closeDetails} />

      {plansOpen && (
        <PlansModal
          plans={savedPlans}
          onPlansChange={setSavedPlans}
          currentSnapshot={currentSnapshot}
          canSave={courseCount > 0}
          onLoad={loadPlan}
          onClose={() => setPlansOpen(false)}
        />
      )}
    </div>
  );
}

function MobileTab({
  icon,
  label,
  active,
  badge,
  onClick,
}: {
  icon: string;
  label: string;
  active: boolean;
  badge?: number | null;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex flex-col items-center gap-0.5 py-2 text-[0.68rem] font-medium transition",
        active ? "text-fg" : "text-fg-muted",
      )}
    >
      <span className={cn("grid h-7 w-12 place-items-center rounded-full text-base transition", active && "bg-accent-soft")}>
        <i className={`bi ${icon}`} aria-hidden="true"></i>
      </span>
      {label}
      {badge != null && (
        <span className="absolute top-1 left-1/2 ml-2 rounded-full bg-accent px-1.5 text-[0.6rem] leading-4 font-bold text-on-accent">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </button>
  );
}
