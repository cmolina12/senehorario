import { courseColor } from "@/lib/calendar-events";
import { dayName, formatLocation, shortTime, titleCase, WEEK_DAYS } from "@/lib/format";
import { toMinutes } from "@/lib/scheduler";
import type { Meeting, ScheduledSection } from "@/lib/types";
import type { SelectedEventInfo } from "./usePlanner";

/** Day-by-day list of a schedule, used instead of the week grid on phones. */
export function AgendaView({
  schedule,
  onSelect,
  courseOrder,
}: {
  schedule: ScheduledSection[];
  onSelect: (info: SelectedEventInfo) => void;
  courseOrder: string[];
}) {
  const codes = courseOrder;
  const days = [...WEEK_DAYS, "SUNDAY" as const].map((day) => ({
    day,
    items: schedule
      .flatMap((section) =>
        section.meetings.filter((m) => m.day === day).map((meeting) => ({ section, meeting })),
      )
      .sort((a, b) => toMinutes(a.meeting.start) - toMinutes(b.meeting.start)),
  })).filter((d) => d.items.length > 0);

  return (
    <div className="divide-y divide-border">
      {days.map(({ day, items }) => (
        <section key={day} className="px-4 py-3">
          <h3 className="mb-2 text-xs font-semibold tracking-wide text-fg-muted uppercase">{dayName(day)}</h3>
          <ul className="space-y-2">
            {items.map(({ section, meeting }) => (
              <li key={`${section.term}-${section.nrc}-${meeting.day}-${meeting.start}`} className="animate-enter">
                <AgendaItem
                  section={section}
                  meeting={meeting}
                  color={courseColor(codes, section.courseCode)}
                  onSelect={onSelect}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function AgendaItem({
  section,
  meeting,
  color,
  onSelect,
}: {
  section: ScheduledSection;
  meeting: Meeting;
  color: string;
  onSelect: (info: SelectedEventInfo) => void;
}) {
  return (
    <button
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
      className="flex w-full gap-3 rounded-lg border-l-[3px] py-2 pr-3 pl-3 text-left transition hover:brightness-[0.97]"
      style={{
        borderColor: color,
        background: `color-mix(in srgb, ${color} var(--event-tint), var(--surface))`,
      }}
    >
      <div className="w-12 shrink-0 text-xs leading-5 text-fg-secondary">
        <div className="font-semibold text-fg">{shortTime(meeting.start)}</div>
        <div>{shortTime(meeting.end)}</div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">
          {section.courseCode} · {section.sectionId}
          {(section.ptrm === "8A" || section.ptrm === "8B") && (
            <span className="ml-1.5 text-xs text-fg-secondary">
              <span className="sr-only">· ciclo </span>
              {section.ptrm}
            </span>
          )}
        </div>
        <div className="truncate text-xs text-fg-secondary">{titleCase(section.courseTitle ?? "")}</div>
        <div className="truncate text-xs text-fg-muted">{formatLocation(meeting.location)}</div>
      </div>
    </button>
  );
}
