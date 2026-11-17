// Calendar export (.ics) for one schedule option: one weekly repeating event
// per class meeting, in Bogotá time, between the meeting's first and last day.

import { dayName, formatLocation, titleCase } from "./format";
import type { DayOfWeek, ScheduledSection } from "./types";

const TZ = "America/Bogota";
const WEEKDAY_INDEX: Record<DayOfWeek, number> = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};

/** Escapes TEXT values (RFC 5545 §3.3.11). */
function escapeText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Folds a content line to 75 octets, continuing with a leading space. */
function fold(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  let size = 0;
  for (const char of line) {
    const charSize = encoder.encode(char).length;
    const limit = parts.length === 0 ? 75 : 74; // continuation lines start with a space
    if (size + charSize > limit) {
      parts.push(current);
      current = "";
      size = 0;
    }
    current += char;
    size += charSize;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

const compactDate = (iso: string) => iso.replace(/-/g, "");
const compactTime = (time: string) => {
  const [h, m] = time.split(":");
  return `${h.padStart(2, "0")}${(m ?? "00").padStart(2, "0")}00`;
};

/** First date on or after `startDate` that falls on `day` ("YYYY-MM-DD"). */
export function firstOccurrence(startDate: string, day: DayOfWeek): string {
  const d = new Date(`${startDate}T00:00:00Z`);
  const shift = (WEEKDAY_INDEX[day] - d.getUTCDay() + 7) % 7;
  d.setUTCDate(d.getUTCDate() + shift);
  return d.toISOString().slice(0, 10);
}

/** UNTIL for a weekly rule: the end of `endDate` in Bogotá (UTC−5), expressed in UTC. */
function untilUtc(endDate: string): string {
  const d = new Date(`${endDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return `${compactDate(d.toISOString().slice(0, 10))}T045959Z`;
}

function utcStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export interface IcsResult {
  content: string;
  /** Meetings left out because the catalog gave no dates for them. */
  skipped: number;
}

export function buildIcs(schedule: ScheduledSection[], calendarName: string, now = new Date()): IcsResult {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Senehorario//Horario//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(calendarName)}`,
    `X-WR-TIMEZONE:${TZ}`,
    "BEGIN:VTIMEZONE",
    `TZID:${TZ}`,
    "BEGIN:STANDARD",
    "DTSTART:19700101T000000",
    "TZOFFSETFROM:-0500",
    "TZOFFSETTO:-0500",
    "TZNAME:-05",
    "END:STANDARD",
    "END:VTIMEZONE",
  ];
  let skipped = 0;

  for (const section of schedule) {
    for (const m of section.meetings) {
      if (!m.startDate || !m.endDate) {
        skipped++;
        continue;
      }
      const first = firstOccurrence(m.startDate, m.day);
      if (first > m.endDate) continue; // the range never includes that weekday

      const title = `${section.courseCode} · ${titleCase(section.courseTitle ?? "")}`.trim();
      const description = [
        `Sección ${section.sectionId} · NRC ${section.nrc}`,
        section.professors?.length ? `Profesor: ${titleCase(section.professors.join(", "))}` : "",
        `${dayName(m.day)} ${m.start.slice(0, 5)}–${m.end.slice(0, 5)}`,
      ]
        .filter(Boolean)
        .join("\n");

      lines.push(
        "BEGIN:VEVENT",
        `UID:${section.term}-${section.nrc}-${m.day}-${compactTime(m.start)}@senehorario.cmolina.xyz`,
        `DTSTAMP:${utcStamp(now)}`,
        `DTSTART;TZID=${TZ}:${compactDate(first)}T${compactTime(m.start)}`,
        `DTEND;TZID=${TZ}:${compactDate(first)}T${compactTime(m.end)}`,
      );
      // A one-day row is a single session, not a weekly class.
      if (m.endDate > first) lines.push(`RRULE:FREQ=WEEKLY;UNTIL=${untilUtc(m.endDate)}`);
      lines.push(
        `SUMMARY:${escapeText(title)}`,
        `LOCATION:${escapeText(formatLocation(m.location))}`,
        `DESCRIPTION:${escapeText(description)}`,
        "END:VEVENT",
      );
    }
  }

  lines.push("END:VCALENDAR");
  return { content: lines.map(fold).join("\r\n") + "\r\n", skipped };
}
