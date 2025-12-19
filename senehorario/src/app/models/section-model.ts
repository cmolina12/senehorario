import { MeetingModel } from "./meeting-model";

export interface SectionModel {
  nrc: string; // Unique identifier for the section
  sectionId: string; // Section identifier, e.g., "A", "B"
  term: string; // Term identifier, e.g., "2023-1"
  ptrm: string; // PTRM identifier, e.g., "2023-1"
  campus: string; // Campus where the section is held
  meetings: MeetingModel[]; // List of meetings for this section
  professors: string[]; // List of professors teaching this section
  availableSeats: number; // Number of available seats
  totalSeats: number; // Total number of seats
}
