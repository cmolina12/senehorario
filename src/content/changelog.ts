// "Novedades" on the landing page. Add an entry when you ship something
// students would notice; the page shows the newest three.

export interface ChangelogEntry {
  /** "YYYY-MM" */
  date: string;
  tag: "Nuevo" | "Mejora";
  text: string;
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    date: "2026-11",
    tag: "Nuevo",
    text: "Grupos «elige uno»: agrupa electivas o CBUs y cada horario incluye solo uno.",
  },
  {
    date: "2026-11",
    tag: "Nuevo",
    text: "Comparte tu plan con un enlace o agrégalo a tu calendario de Google, Apple u Outlook.",
  },
  {
    date: "2026-11",
    tag: "Mejora",
    text: "La búsqueda muestra todas las secciones de cada curso, incluidos los complementarios.",
  },
  {
    date: "2026-11",
    tag: "Nuevo",
    text: "Preferencias: ordena las opciones, deja días libres y bloquea horas para almorzar o trabajar.",
  },
  {
    date: "2026-11",
    tag: "Nuevo",
    text: "Copia los NRCs de tu opción para inscribirlos en Banner.",
  },
];

const MONTHS = ["ene.", "feb.", "mar.", "abr.", "may.", "jun.", "jul.", "ago.", "sep.", "oct.", "nov.", "dic."];

/** "2026-11" -> "nov. 2026" */
export function formatMonth(date: string): string {
  const [year, month] = date.split("-").map(Number);
  return `${MONTHS[month - 1] ?? ""} ${year}`.trim();
}
