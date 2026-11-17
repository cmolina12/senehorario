import { dayLabel, shortTime } from "@/lib/format";
import type { Meeting } from "@/lib/types";

export function MeetingBadges({ meetings }: { meetings: Meeting[] }) {
  return meetings.map((m, i) => (
    <span key={i} className="meeting-badge">
      {dayLabel(m.day)} {shortTime(m.start)}–{shortTime(m.end)}
    </span>
  ));
}
