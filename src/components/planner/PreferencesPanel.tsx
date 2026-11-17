"use client";

import { useState } from "react";
import { IconButton, Popover } from "@/components/ui";
import { cn, dayLabel, dayName, WEEK_DAYS } from "@/lib/format";
import {
  DEFAULT_PREFERENCES,
  SORT_OPTIONS,
  activeFilterCount,
  type Preferences,
} from "@/lib/preferences";
import type { DayOfWeek } from "@/lib/types";

// Half-hour steps from 06:00 to 22:00.
const TIMES = Array.from({ length: 33 }, (_, i) => {
  const minutes = 6 * 60 + i * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${minutes % 60 === 0 ? "00" : "30"}`;
});

const selectClass =
  "h-9 w-full appearance-none rounded-lg border border-border bg-surface px-2.5 text-sm text-fg focus:border-accent focus:outline-none";

function Select({
  value,
  onChange,
  children,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <span className="relative block">
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className={selectClass}>
        {children}
      </select>
      <i
        className="bi bi-chevron-down pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[0.6rem] text-fg-muted"
        aria-hidden="true"
      ></i>
    </span>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 text-xs font-semibold text-fg-muted">{children}</h3>;
}

export function PreferencesPanel({
  value,
  onChange,
}: {
  value: Preferences;
  onChange: (next: Preferences) => void;
}) {
  const [draft, setDraft] = useState({ day: "MONDAY" as DayOfWeek, start: "12:00", end: "13:00", label: "" });
  const update = (patch: Partial<Preferences>) => onChange({ ...value, ...patch });
  const filters = activeFilterCount(value);
  const draftValid = draft.start < draft.end;

  const toggleDay = (day: DayOfWeek) =>
    update({
      freeDays: value.freeDays.includes(day) ? value.freeDays.filter((d) => d !== day) : [...value.freeDays, day],
    });

  const addBlock = () => {
    if (!draftValid) return;
    update({
      blocks: [
        ...value.blocks,
        { id: `${Date.now()}`, day: draft.day, start: draft.start, end: draft.end, label: draft.label.trim() || undefined },
      ],
    });
    setDraft((d) => ({ ...d, label: "" }));
  };

  return (
    <Popover icon="bi-sliders" label="Preferencias" badge={filters} panelClassName="w-[22rem] max-h-[75dvh] overflow-y-auto">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Preferencias</p>
          {(filters > 0 || value.sort !== "default") && (
            <button
              type="button"
              onClick={() => onChange(DEFAULT_PREFERENCES)}
              className="text-xs font-medium text-fg-muted underline-offset-2 hover:text-fg hover:underline"
            >
              Restablecer
            </button>
          )}
        </div>

        <section>
          <Heading>Ordenar opciones por</Heading>
          <div className="flex flex-wrap gap-1.5">
            {SORT_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                aria-pressed={value.sort === o.value}
                onClick={() => update({ sort: o.value })}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-medium transition",
                  value.sort === o.value
                    ? "border-accent bg-accent text-on-accent"
                    : "border-border text-fg-secondary hover:border-border-strong hover:text-fg",
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        </section>

        <section>
          <Heading>Horario</Heading>
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1 text-xs text-fg-secondary">
              No antes de
              <Select
                label="No antes de"
                value={value.earliestStart ?? ""}
                onChange={(v) => update({ earliestStart: v || null })}
              >
                <option value="">Sin límite</option>
                {TIMES.filter((t) => t <= "12:00").map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </label>
            <label className="space-y-1 text-xs text-fg-secondary">
              No después de
              <Select
                label="No después de"
                value={value.latestEnd ?? ""}
                onChange={(v) => update({ latestEnd: v || null })}
              >
                <option value="">Sin límite</option>
                {TIMES.filter((t) => t >= "12:00").map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </label>
          </div>
        </section>

        <section>
          <Heading>Días libres</Heading>
          <div className="flex gap-1.5">
            {WEEK_DAYS.map((day) => {
              const active = value.freeDays.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  aria-pressed={active}
                  title={dayName(day)}
                  onClick={() => toggleDay(day)}
                  className={cn(
                    "h-9 flex-1 rounded-lg border text-xs font-semibold transition",
                    active
                      ? "border-accent bg-accent text-on-accent"
                      : "border-border text-fg-secondary hover:border-border-strong hover:text-fg",
                  )}
                >
                  {dayLabel(day)}
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <Heading>Bloques de tiempo</Heading>
          {value.blocks.length > 0 && (
            <ul className="mb-2 divide-y divide-border rounded-xl border border-border">
              {value.blocks.map((b) => (
                <li key={b.id} className="flex items-center gap-2 py-1.5 pr-1 pl-3 text-sm">
                  <span className="w-20 shrink-0 font-medium">{dayName(b.day)}</span>
                  <span className="text-fg-secondary">
                    {b.start}–{b.end}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs text-fg-muted">{b.label}</span>
                  <IconButton
                    icon="bi-x-lg"
                    label="Quitar bloque"
                    className="size-7 text-xs hover:text-danger"
                    onClick={() => update({ blocks: value.blocks.filter((x) => x.id !== b.id) })}
                  />
                </li>
              ))}
            </ul>
          )}
          <div className="space-y-2 rounded-xl bg-surface-alt p-2.5">
            <div className="grid grid-cols-3 gap-1.5">
              <Select label="Día" value={draft.day} onChange={(v) => setDraft((d) => ({ ...d, day: v as DayOfWeek }))}>
                {WEEK_DAYS.map((day) => (
                  <option key={day} value={day}>
                    {dayName(day)}
                  </option>
                ))}
              </Select>
              <Select label="Desde" value={draft.start} onChange={(v) => setDraft((d) => ({ ...d, start: v }))}>
                {TIMES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
              <Select label="Hasta" value={draft.end} onChange={(v) => setDraft((d) => ({ ...d, end: v }))}>
                {TIMES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={draft.label}
                onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && addBlock()}
                placeholder="Nombre (opcional): trabajo, almuerzo…"
                aria-label="Nombre del bloque"
                maxLength={30}
                className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-surface px-2.5 text-sm placeholder:text-fg-muted focus:border-accent focus:outline-none"
              />
              <button
                type="button"
                onClick={addBlock}
                disabled={!draftValid}
                className="h-9 shrink-0 rounded-lg bg-accent px-3 text-sm font-semibold text-on-accent transition hover:bg-accent-hover disabled:opacity-50"
              >
                Agregar
              </button>
            </div>
            {!draftValid && <p className="text-xs text-danger">La hora final debe ser después de la inicial.</p>}
          </div>
        </section>
      </div>
    </Popover>
  );
}
