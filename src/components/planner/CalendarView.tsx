"use client";

import type { EventInput } from "@fullcalendar/core";
import dynamic from "next/dynamic";
import { EmptyState, IconButton, Spinner } from "@/components/ui";
import { courseColor, type VisibleRange } from "@/lib/calendar-events";
import { cn, plural, titleCase } from "@/lib/format";
import { usePresence } from "@/lib/use-presence";
import type { Preferences } from "@/lib/preferences";

import { MAX_SCHEDULES } from "@/lib/scheduler";
import { formatTerm } from "@/lib/terms";
import type { ScheduledSection } from "@/lib/types";
import { AgendaView } from "./AgendaView";
import { NrcList } from "./NrcList";
import { PreferencesPanel } from "./PreferencesPanel";
import { SharePanel } from "./SharePanel";
import type { PlanNotice, SelectedEventInfo } from "./usePlanner";

// FullCalendar measures the DOM, so render it only in the browser.
const ScheduleCalendar = dynamic(() => import("./ScheduleCalendar"), { ssr: false });

interface Props {
  courseCount: number;
  /** Selected course codes in order; decides each course's color. */
  courseOrder: string[];
  totalCredits: number;
  term: string | null;
  optionCount: number;
  optionIndex: number;
  truncated: boolean;
  onOptionChange: (index: number) => void;
  schedule: ScheduledSection[] | null;
  events: EventInput[];
  range: VisibleRange;
  error: string;
  onEventClick: (info: SelectedEventInfo) => void;
  onGoToSearch: () => void;
  refreshing: boolean;
  notice: PlanNotice | null;
  onDismissNotice: () => void;
  /** Query string that reproduces the current plan, or null when there's nothing to share. */
  shareQuery: string | null;
  preferences: Preferences;
  onPreferencesChange: (next: Preferences) => void;
}

export function CalendarView({
  courseCount,
  courseOrder,
  totalCredits,
  term,
  optionCount,
  optionIndex,
  truncated,
  onOptionChange,
  schedule,
  events,
  range,
  error,
  onEventClick,
  onGoToSearch,
  refreshing,
  notice,
  onDismissNotice,
  shareQuery,
  preferences,
  onPreferencesChange,
}: Props) {
  const { rendered: shownNotice, closing: noticeClosing } = usePresence(notice);
  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 p-4 lg:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">Tu horario</h1>
          <p className="text-sm text-fg-secondary">
            {courseCount === 0
              ? "Aún no has agregado cursos"
              : `${courseCount} ${plural(courseCount, "curso", "cursos")} · ${totalCredits} ${plural(totalCredits, "crédito", "créditos")}${term ? ` · ${formatTerm(term)}` : ""}`}
          </p>
          {refreshing && (
            <p className="mt-1 inline-flex items-center gap-2 text-xs text-fg-muted">
              <Spinner className="size-3" /> Verificando cupos con la oferta actual…
            </p>
          )}
        </div>

        {courseCount > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <PreferencesPanel value={preferences} onChange={onPreferencesChange} />
            {schedule && <NrcList schedule={schedule} optionNumber={optionIndex + 1} courseOrder={courseOrder} />}
            {schedule && shareQuery && term && (
              <SharePanel shareQuery={shareQuery} schedule={schedule} term={term} optionNumber={optionIndex + 1} />
            )}
            {optionCount > 0 && (
              <div className="flex items-center gap-1 rounded-xl border border-border bg-surface p-1">
                <IconButton
                  icon="bi-chevron-left"
                  label="Opción anterior"
                  className="size-8"
                  disabled={optionIndex === 0}
                  onClick={() => onOptionChange(optionIndex - 1)}
                />
                <span
                  className="min-w-28 px-1 text-center text-sm"
                  title={truncated ? `Se muestran las primeras ${MAX_SCHEDULES} combinaciones` : undefined}
                >
                  Opción{" "}
                  <span key={optionIndex} className="inline-block animate-bump font-extrabold">
                    {optionIndex + 1}
                  </span>{" "}
                  de {optionCount}
                  {truncated && "+"}
                </span>
                <IconButton
                  icon="bi-chevron-right"
                  label="Opción siguiente"
                  className="size-8"
                  disabled={optionIndex >= optionCount - 1}
                  onClick={() => onOptionChange(optionIndex + 1)}
                />
              </div>
            )}
          </div>
        )}
      </header>

      {shownNotice && (
        <div
          role="status"
          className={cn(
            "flex gap-3 rounded-2xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm",
            noticeClosing ? "animate-fade-out" : "animate-notice-in",
          )}
        >
          <i className="bi bi-arrow-repeat mt-0.5 text-warning" aria-hidden="true"></i>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{shownNotice.title}</p>
            {shownNotice.lines.length > 0 && (
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-fg-secondary">
                {shownNotice.lines.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            )}
          </div>
          <IconButton icon="bi-x-lg" label="Cerrar aviso" className="-mt-1.5 -mr-2 size-8 text-xs" onClick={onDismissNotice} />
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_1px_2px_hsl(var(--shadow-color)/0.04)]">
        {error ? (
          <EmptyState icon="bi-exclamation-triangle" tone="danger" title="No hay horarios compatibles">
            {error}
          </EmptyState>
        ) : courseCount === 0 || !schedule ? (
          <EmptyState icon="bi-calendar-week" title="Tu semana aparecerá aquí">
            <p>Busca tus cursos y agrega las secciones que te sirvan; generamos todas las combinaciones sin choques.</p>
            <button
              type="button"
              onClick={onGoToSearch}
              className="mt-3 rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-on-accent hover:bg-accent-hover lg:hidden"
            >
              Buscar cursos
            </button>
          </EmptyState>
        ) : (
          <>
            <div className="hidden p-2 sm:block sm:p-3">
              <ScheduleCalendar events={events} range={range} onEventClick={onEventClick} />
            </div>
            <div className="sm:hidden">
              <AgendaView schedule={schedule} onSelect={onEventClick} courseOrder={courseOrder} />
            </div>
            <UnscheduledList schedule={schedule} courseOrder={courseOrder} onSelect={onEventClick} />
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Sections without a weekly time (theses, practicums) never show up on the
 * grid, so list them under it to keep the whole schedule visible.
 */
function UnscheduledList({
  schedule,
  courseOrder,
  onSelect,
}: {
  schedule: ScheduledSection[];
  courseOrder: string[];
  onSelect: (info: SelectedEventInfo) => void;
}) {
  const unscheduled = schedule.filter((s) => s.meetings.length === 0);
  if (unscheduled.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3 text-sm">
      <span className="inline-flex items-center gap-1.5 text-fg-secondary">
        <i className="bi bi-clock-history" aria-hidden="true"></i>
        Sin horario fijo:
      </span>
      {unscheduled.map((section) => {
        const color = courseColor(courseOrder, section.courseCode);
        return (
          <button
            key={`${section.term}-${section.nrc}`}
            type="button"
            onClick={() =>
              onSelect({
                section,
                courseCode: section.courseCode,
                courseTitle: section.courseTitle,
                courseCredits: section.courseCredits,
                color,
              })
            }
            className="inline-flex max-w-full items-center gap-1.5 rounded-lg border-l-[3px] px-2.5 py-1 text-left text-xs transition hover:brightness-[0.97]"
            style={{
              borderColor: color,
              background: `color-mix(in srgb, ${color} var(--event-tint), var(--surface))`,
            }}
          >
            <span className="font-semibold">
              {section.courseCode} · {section.sectionId}
            </span>
            <span className="truncate text-fg-secondary">{titleCase(section.courseTitle ?? "")}</span>
          </button>
        );
      })}
    </div>
  );
}
