// Display helpers used across the planner UI.

import type { Section } from "./types";

const DAY_LABELS: Record<string, string> = {
  mon: "Lun",
  tue: "Mar",
  wed: "Mie",
  thu: "Jue",
  fri: "Vie",
  sat: "Sab",
  sun: "Dom",
};

export function dayLabel(day: string): string {
  const key = (day || "").toLowerCase().slice(0, 3);
  return DAY_LABELS[key] ?? day?.slice(0, 3) ?? "";
}

/** "06:30:00" -> "06:30" */
export const shortTime = (time: string) => time.slice(0, 5);

export function cicloLabel(section: Pick<Section, "ptrm">): string {
  if (section.ptrm === "8A") return "Primer Ciclo - 8A";
  if (section.ptrm === "8B") return "Segundo Ciclo - 8B";
  if (section.ptrm === "1") return "16 Semanas";
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

/** Same behavior as Angular's `titlecase` pipe. */
export function titleCase(text: string): string {
  return text.replace(
    /[\p{L}\p{N}]+/gu,
    (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
  );
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
