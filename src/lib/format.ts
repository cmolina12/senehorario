// Display helpers used across the planner UI.

import type { DayOfWeek, Section } from "./types";

const DAY_LABELS: Record<string, string> = {
  mon: "Lun",
  tue: "Mar",
  wed: "Mié",
  thu: "Jue",
  fri: "Vie",
  sat: "Sáb",
  sun: "Dom",
};

export function dayLabel(day: string): string {
  const key = (day || "").toLowerCase().slice(0, 3);
  return DAY_LABELS[key] ?? day?.slice(0, 3) ?? "";
}

export const WEEK_DAYS: DayOfWeek[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

const DAY_NAMES: Record<DayOfWeek, string> = {
  MONDAY: "Lunes",
  TUESDAY: "Martes",
  WEDNESDAY: "Miércoles",
  THURSDAY: "Jueves",
  FRIDAY: "Viernes",
  SATURDAY: "Sábado",
  SUNDAY: "Domingo",
};

export const dayName = (day: DayOfWeek) => DAY_NAMES[day] ?? day;

/** Online classes come as ".VIRTUAL .VIRT" instead of a building and room. */
const isVirtualPart = (location: string) => /(^|[\s.])VIRT/i.test(location);

// Overlapping meetings merged into one block keep each location, " / "-separated.
const locationParts = (location: string) => location.split(" / ");

export type Delivery = "Virtual" | "Híbrida";

/** Whether a meeting is online, partly online (merged blocks) or in person (null). */
export function meetingDelivery(location: string): Delivery | null {
  const parts = locationParts(location);
  const online = parts.filter(isVirtualPart).length;
  if (online === 0) return null;
  return online === parts.length ? "Virtual" : "Híbrida";
}

/** "Virtual" when every meeting is online, "Híbrida" when only some are. */
export function deliveryLabel(section: Pick<Section, "attrs" | "campus" | "meetings">): Delivery | null {
  const kinds = section.meetings.map((m) => meetingDelivery(m.location));
  if (kinds.length > 0 && kinds.every((k) => k === "Virtual")) return "Virtual";
  if (kinds.some((k) => k !== null)) return "Híbrida";
  if (campusOnlyHybrid(section)) return "Híbrida";
  if (section.campus?.toUpperCase() === "VIRTUAL" || section.attrs?.includes("VIRT")) return "Virtual";
  return null;
}

/**
 * The catalog labels the campus "…PRESENCIAL/VIRTUAL" but no room is online,
 * so we can't tell which sessions are virtual.
 */
function campusOnlyHybrid(section: Pick<Section, "campus" | "meetings">): boolean {
  if (!section.campus?.toUpperCase().endsWith("/VIRTUAL")) return false;
  return section.meetings.every((m) => meetingDelivery(m.location) === null);
}

/** Caveat to show next to a delivery label that only comes from the campus field. */
export function deliveryNote(section: Pick<Section, "campus" | "meetings">): string | null {
  return campusOnlyHybrid(section)
    ? "La oferta la marca como presencial/virtual, pero no dice qué sesiones son virtuales. Confírmalo con el profesor."
    : null;
}

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** "2026-08-22" -> "22 ago" */
export function shortDate(iso: string): string {
  const [, month, day] = iso.split("-").map(Number);
  return `${day} ${MONTHS[month - 1] ?? ""}`.trim();
}

/** The catalog fills unassigned rooms with dashes. */
export function formatLocation(location: string): string {
  const parts = locationParts(location).map((part) => {
    if (isVirtualPart(part)) return "Virtual";
    return /[\p{L}\p{N}]/u.test(part) ? part.trim() : "Salón por asignar";
  });
  return [...new Set(parts)].join(" / ");
}

/** Joins class names, skipping falsy values. */
export const cn = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ");

/** "06:30:00" -> "06:30" */
export const shortTime = (time: string) => time.slice(0, 5);

export function cicloLabel(section: Pick<Section, "ptrm">): string {
  if (section.ptrm === "8A") return "Primer ciclo (8A)";
  if (section.ptrm === "8B") return "Segundo ciclo (8B)";
  if (section.ptrm === "1") return "16 semanas";
  return section.ptrm;
}

export function termLabel(section: Pick<Section, "term">): string {
  if (section.term === "202519" || section.term === "202619") return "Intersemestral";
  return section.term;
}

export function professorUrl(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  return `https://losestudiantes.com/uniandes/professors/${slug}`;
}

// Spanish connectors stay lowercase unless they start the text.
const MINOR_WORDS = new Set(["a", "al", "con", "de", "del", "el", "en", "la", "las", "lo", "los", "para", "por", "un", "una", "y"]);

/** "MODELOS DE CONTROL" -> "Modelos de Control"; Roman numerals stay upper-case. */
export function titleCase(text: string): string {
  let first = true;
  return text.replace(/[\p{L}\p{N}]+/gu, (w) => {
    const lower = w.toLowerCase();
    const isFirst = first;
    first = false;
    if (/^[ivx]+$/.test(lower) && lower.length <= 4 && !isFirst) return w.toUpperCase();
    if (!isFirst && MINOR_WORDS.has(lower)) return lower;
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  });
}

export const CBU_ATTR_FILTERS = [
  { code: "ECUR", label: "Tipo E" },
  { code: "EPSI", label: "Epsilon" },
  { code: "INGL", label: "Inglés" },
  { code: "VIRT", label: "Virtual" },
  { code: "SEMP", label: "Semi-presencial" },
];

export const CBU_AREA_FILTERS = [
  { value: "H", label: "Culturas y Humanidades" },
  { value: "T", label: "Ciencia y Tecnología" },
];

export function cbuAttrLabel(attr: string): string {
  return CBU_ATTR_FILTERS.find((f) => f.code === attr)?.label ?? attr;
}

export type SeatLevel = "available" | "low" | "full";

export function seatLevel(section: Pick<Section, "availableSeats" | "totalSeats">): SeatLevel {
  const ratio = section.availableSeats / section.totalSeats;
  if (ratio > 0.5) return "available";
  if (ratio > 0.1) return "low";
  return "full";
}

export const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);
