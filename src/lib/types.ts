// Domain types shared by the API routes and the UI.
// JSON shape is identical to what the Spring Boot backend returned, so plans
// exported from the Angular app can still be imported.

export type DayOfWeek =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

export interface Meeting {
  day: DayOfWeek;
  start: string; // "HH:mm:ss" (older saved plans may contain "HH:mm")
  end: string;
  location: string; // building + classroom
}

export interface Section {
  nrc: string; // e.g. "11060"
  sectionId: string; // e.g. "1", "A"
  term: string; // e.g. "202519"
  ptrm: string; // "1" (16 weeks), "8A" or "8B"
  campus: string;
  meetings: Meeting[];
  professors: string[];
  availableSeats: number;
  totalSeats: number;
  attrs: string[]; // e.g. ["ECUR", "VIRT"]
}

export interface Course {
  code: string; // e.g. "IIND2201"
  title: string;
  credits: number;
  sections: Section[];
}

/** A section tagged with the course it belongs to, as used in generated schedules. */
export interface ScheduledSection extends Section {
  courseCode: string;
  courseTitle?: string;
  courseCredits?: number;
}

export interface CourseMeta {
  title: string;
  credits: number;
}

/** NRCs repeat across terms, so a section is identified by term + NRC. */
export const sectionKey = (s: Pick<Section, "term" | "nrc">) => `${s.term}-${s.nrc}`;

export type SelectedSections = Record<string, Section[]>;
export type SelectedMeta = Record<string, CourseMeta>;
