"use client";

import { useEffect, useState } from "react";
import { COURSE_COLORS } from "@/lib/calendar-events";

// A small, self-running preview of the planner for the landing page: it
// flips between schedule options, and only the classes that change animate.

type Day = 0 | 1 | 2 | 3 | 4; // L M I J V
interface DemoClass {
  code: string;
  name: string;
  section: string;
  nrc: string;
  color: string;
  days: Day[];
  start: number; // hours, e.g. 9.5 = 9:30
  end: number;
}

const COURSES = {
  MATE: { code: "MATE1203", name: "Cálculo Diferencial", color: COURSE_COLORS[0] },
  ISIS: { code: "ISIS1221", name: "Intro. a la Programación", color: COURSE_COLORS[1] },
  FISI: { code: "FISI1018", name: "Física Mecánica", color: COURSE_COLORS[2] },
  CBU: { code: "CBUH1003", name: "Arte en Colombia", color: COURSE_COLORS[4] },
};

const cls = (
  c: keyof typeof COURSES,
  section: string,
  nrc: string,
  days: Day[],
  start: number,
  end: number,
): DemoClass => ({ ...COURSES[c], section, nrc, days, start, end });

// Three options for the same four courses; some sections repeat between them.
// Thursday/Friday afternoons stay free so the floating NRC card never hides a class.
const OPTIONS: DemoClass[][] = [
  [
    cls("MATE", "1", "36109", [0, 2, 4], 7, 8.33),
    cls("ISIS", "3", "41893", [1, 3], 9.5, 10.83),
    cls("FISI", "2", "80985", [0, 2], 11, 12.33),
    cls("CBU", "1", "77302", [1], 14, 15.33),
  ],
  [
    cls("MATE", "1", "36109", [0, 2, 4], 7, 8.33),
    cls("ISIS", "7", "41901", [0, 2], 14, 15.33),
    cls("FISI", "2", "80985", [0, 2], 11, 12.33),
    cls("CBU", "2", "77315", [1, 3], 9.5, 10.83),
  ],
  [
    cls("MATE", "10", "80880", [0, 1], 15.5, 16.83),
    cls("ISIS", "3", "41893", [1, 3], 9.5, 10.83),
    cls("FISI", "5", "81002", [0, 2], 8, 9.33),
    cls("CBU", "1", "77302", [1], 14, 15.33),
  ],
];

const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie"];
const START = 7;
const END = 17;
const ROW = 26; // px per hour
const TOTAL_OPTIONS = 14; // shown in the switcher; the demo cycles through the first three

const time = (h: number) => `${String(Math.floor(h)).padStart(2, "0")}:${String(Math.round((h % 1) * 60)).padStart(2, "0")}`;

export function HeroDemo() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % OPTIONS.length), 3200);
    return () => clearInterval(timer);
  }, [paused]);

  const option = OPTIONS[index];
  const go = (delta: number) => setIndex((i) => (i + delta + OPTIONS.length) % OPTIONS.length);

  return (
    <div
      className="relative mx-auto w-full max-w-[540px] text-left tabular-nums"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-label="Vista previa del planificador"
    >
      <div className="rounded-2xl border border-border bg-surface p-4 shadow-[0_24px_48px_rgba(26,26,46,0.16)] dark:shadow-[0_24px_48px_rgba(0,0,0,0.5)]">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-sm font-extrabold text-fg">Tu horario</div>
            <div className="text-2xs text-fg-muted">4 cursos · 13 créditos · 2027-10</div>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-border px-1 py-0.5 text-xs">
            <button type="button" onClick={() => go(-1)} aria-label="Opción anterior" className="px-1.5 text-fg-muted hover:text-fg">
              <i className="bi bi-chevron-left text-2xs" aria-hidden="true"></i>
            </button>
            <span className="min-w-[5.5rem] text-center text-fg-secondary">
              Opción{" "}
              <span key={index} className="inline-block animate-bump font-semibold text-fg">
                {index + 1}
              </span>{" "}
              de {TOTAL_OPTIONS}
            </span>
            <button type="button" onClick={() => go(1)} aria-label="Opción siguiente" className="px-1.5 text-fg-muted hover:text-fg">
              <i className="bi bi-chevron-right text-2xs" aria-hidden="true"></i>
            </button>
          </div>
        </div>

        <div className="flex">
          <div className="w-9 shrink-0 pt-5">
            {Array.from({ length: END - START }, (_, i) => (
              <div key={i} style={{ height: ROW }} className="text-2xs leading-none text-fg-muted">
                {START + i}:00
              </div>
            ))}
          </div>
          <div className="grid flex-1 grid-cols-5 gap-1">
            {DAYS.map((day, d) => (
              <div key={day}>
                <div className="mb-1 h-4 text-center text-2xs font-semibold text-fg-secondary">{day}</div>
                <div
                  className="relative rounded-md bg-[repeating-linear-gradient(to_bottom,transparent,transparent_25px,var(--border)_25px,var(--border)_26px)]"
                  style={{ height: (END - START) * ROW }}
                >
                  {/* Blocked lunch, always free */}
                  {(d === 1 || d === 3) && (
                    <div
                      className="absolute inset-x-0.5 rounded-md bg-[repeating-linear-gradient(-45deg,color-mix(in_srgb,var(--text-muted)_14%,transparent)_0_5px,transparent_5px_10px)]"
                      style={{ top: (12.5 - START) * ROW, height: ROW }}
                      title="Almuerzo"
                    />
                  )}
                  {option
                    .filter((c) => c.days.includes(d as Day))
                    .map((c) => (
                      <div
                        key={`${c.nrc}-${d}`}
                        className="absolute inset-x-0.5 animate-enter overflow-hidden rounded-md border-l-[3px] px-1 py-0.5"
                        style={{
                          top: (c.start - START) * ROW,
                          height: (c.end - c.start) * ROW - 2,
                          borderColor: c.color,
                          background: `color-mix(in srgb, ${c.color} var(--event-tint), var(--surface))`,
                        }}
                      >
                        <div className="truncate text-2xs leading-tight font-bold text-fg">{c.code}</div>
                        <div className="truncate text-2xs leading-tight text-fg-secondary">{time(c.start)}</div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* The option's NRCs, ready for Banner: floating on desktop, below the calendar on smaller screens */}
      <div className="mt-3 w-full rounded-xl border border-border bg-surface p-3 shadow-xl shadow-black/10 min-[992px]:absolute min-[992px]:-right-6 min-[992px]:-bottom-10 min-[992px]:mt-0 min-[992px]:w-56">
        <div className="text-xs font-semibold text-fg">NRCs listos para Banner</div>
        <ul className="mt-2 list-none space-y-1 p-0">
          {option.map((c) => (
            <li key={c.nrc} className="flex animate-enter items-center gap-2 text-2xs">
              <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
              <span className="flex-1 truncate text-fg-secondary">
                {c.code} · {c.section}
              </span>
              <span className="font-mono font-semibold text-fg">{c.nrc}</span>
            </li>
          ))}
        </ul>
        <div className="mt-2.5 flex items-center justify-center gap-1.5 rounded-lg bg-accent py-1 text-2xs font-semibold text-on-accent">
          <i className="bi bi-copy" aria-hidden="true"></i> Copiar todos
        </div>
      </div>
    </div>
  );
}
