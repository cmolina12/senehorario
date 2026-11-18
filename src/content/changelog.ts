// Senéhorario's changelog, written for students. It feeds both the /novedades
// page (grouped by month) and the three newest items on the landing page.
//
// Add new entries at the TOP. Keep them short, about what changed for the
// student (not how it was built), and skip purely internal work.

export type ChangelogTag = "Hito" | "Nuevo" | "Mejora" | "Corrección";

export interface ChangelogEntry {
  /** "YYYY-MM" */
  date: string;
  tag: ChangelogTag;
  text: string;
}

export const CHANGELOG: ChangelogEntry[] = [
  // ---- noviembre 2026 ----
  {
    date: "2026-11",
    tag: "Mejora",
    text: "Las clases virtuales se marcan como «Virtual» en el calendario, y los cursos sin horario fijo (prácticas, créditos de investigación) aparecen debajo de la semana.",
  },
  {
    date: "2026-11",
    tag: "Nuevo",
    text: "Ordena las opciones por más cupos libres, para empezar por los horarios con menos riesgo de llenarse.",
  },
  {
    date: "2026-11",
    tag: "Corrección",
    text: "Los paneles de Preferencias, NRCs y Compartir ya no se cortan en ventanas angostas.",
  },
  {
    date: "2026-11",
    tag: "Nuevo",
    text: "Fija una sección: elige exactamente la que quieres de un curso y el resto de tu horario sigue variando.",
  },
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
    tag: "Corrección",
    text: "La búsqueda muestra todas las secciones de cada curso (antes solo las primeras 25), incluidos los cursos complementarios.",
  },
  {
    date: "2026-11",
    tag: "Nuevo",
    text: "Preferencias: ordena las opciones (menos huecos, menos días, entrar tarde o salir temprano), deja días libres y bloquea horas para almorzar o trabajar.",
  },
  {
    date: "2026-11",
    tag: "Nuevo",
    text: "Copia los NRCs de tu opción para inscribirlos en Banner.",
  },
  {
    date: "2026-11",
    tag: "Mejora",
    text: "Tus planes guardados se revisan contra la oferta al abrirlos: te avisamos si una sección se llenó, cambió de horario o ya no existe.",
  },
  {
    date: "2026-11",
    tag: "Nuevo",
    text: "Selector de periodo: cuando la oferta publica dos semestres a la vez, eliges uno y los horarios no los mezclan.",
  },
  {
    date: "2026-11",
    tag: "Mejora",
    text: "Planificador rediseñado: calendario grande junto a la búsqueda, vista por días en el celular, detalles de cada clase en un panel lateral y textos más legibles.",
  },
  {
    date: "2026-11",
    tag: "Mejora",
    text: "En lugar de bloquear el horario por laboratorios, un recordatorio te avisa que revises si tus cursos tienen laboratorio o complementario.",
  },
  {
    date: "2026-11",
    tag: "Corrección",
    text: "Secciones con el mismo NRC en distintos periodos ya no se confunden, y se detectan choques con secciones de todos los ciclos.",
  },
  {
    date: "2026-11",
    tag: "Hito",
    text: "Senéhorario se muda a senehorario.cmolina.xyz: carga más rápido, sin esperar a un servidor, y tus planes se trasladaron automáticamente.",
  },

  // ---- julio 2026 ----
  {
    date: "2026-07",
    tag: "Mejora",
    text: "Los CBUs se filtran por área (Culturas y Humanidades o Ciencia y Tecnología).",
  },

  // ---- junio 2026 ----
  {
    date: "2026-06",
    tag: "Nuevo",
    text: "CBUs que encajan: ve qué CBUs caben en los huecos de tu horario y fíltralos por tipo (E, Épsilon, inglés, virtual…).",
  },
  {
    date: "2026-06",
    tag: "Nuevo",
    text: "Mis planes: guarda varios horarios, descárgalos e impórtalos cuando quieras.",
  },
  {
    date: "2026-06",
    tag: "Nuevo",
    text: "Busca por profesor y abre su perfil en Los Estudiantes desde cada sección.",
  },
  {
    date: "2026-06",
    tag: "Mejora",
    text: "Las secciones de ocho semanas (8A y 8B) se combinan en una sola vista semanal.",
  },

  // ---- enero 2026 ----
  {
    date: "2026-01",
    tag: "Nuevo",
    text: "Agrega todas las secciones de un curso, o solo las que tienen cupos, con un clic.",
  },
  {
    date: "2026-01",
    tag: "Nuevo",
    text: "Barra de cupos disponibles por sección, con colores según qué tan llena está.",
  },
  {
    date: "2026-01",
    tag: "Mejora",
    text: "Total de cursos y créditos de tu selección, y un color por curso que coincide con el calendario.",
  },

  // ---- diciembre 2025 ----
  {
    date: "2025-12",
    tag: "Nuevo",
    text: "Modo oscuro.",
  },
  {
    date: "2025-12",
    tag: "Nuevo",
    text: "Tu selección se guarda en el navegador, así que puedes volver más tarde.",
  },
  {
    date: "2025-12",
    tag: "Nuevo",
    text: "Créditos de cada curso y cupos disponibles de cada sección.",
  },
  {
    date: "2025-12",
    tag: "Mejora",
    text: "Nuevo diseño de la página principal y del planificador, todo en español y con preguntas frecuentes.",
  },
  {
    date: "2025-12",
    tag: "Mejora",
    text: "Colores de cursos como los de Banner, días abreviados en pantallas pequeñas y opción para quitar secciones una por una.",
  },

  // ---- agosto 2025 ----
  {
    date: "2025-08",
    tag: "Corrección",
    text: "El calendario vuelve a mostrar las clases correctamente.",
  },

  // ---- julio 2025 ----
  {
    date: "2025-07",
    tag: "Hito",
    text: "Lanzamiento de Senéhorario: busca tus cursos, elige secciones y recorre todos los horarios sin choques en un calendario semanal.",
  },
  {
    date: "2025-07",
    tag: "Nuevo",
    text: "Haz clic en una clase del calendario para ver su sección, NRC, profesor y salón.",
  },

  // ---- junio 2025 ----
  {
    date: "2025-06",
    tag: "Hito",
    text: "Empieza el desarrollo: el motor que encuentra todas las combinaciones de secciones sin choques.",
  },
];

const MONTHS_SHORT = ["ene.", "feb.", "mar.", "abr.", "may.", "jun.", "jul.", "ago.", "sep.", "oct.", "nov.", "dic."];
const MONTHS_LONG = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

/** "2026-11" -> "nov. 2026" */
export function formatMonth(date: string): string {
  const [year, month] = date.split("-").map(Number);
  return `${MONTHS_SHORT[month - 1] ?? ""} ${year}`.trim();
}

/** "2026-11" -> "Noviembre 2026" */
export function formatMonthLong(date: string): string {
  const [year, month] = date.split("-").map(Number);
  return `${MONTHS_LONG[month - 1] ?? ""} ${year}`.trim();
}

/** Entries grouped by month, newest month first, keeping file order within a month. */
export function changelogByMonth(entries: ChangelogEntry[] = CHANGELOG): { month: string; entries: ChangelogEntry[] }[] {
  const months = new Map<string, ChangelogEntry[]>();
  for (const entry of entries) {
    const list = months.get(entry.date) ?? [];
    list.push(entry);
    months.set(entry.date, list);
  }
  return [...months.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([month, list]) => ({ month, entries: list }));
}
