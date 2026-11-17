"use client";

import { useState } from "react";
import { Popover } from "@/components/ui";
import { courseColor } from "@/lib/calendar-events";
import { copyText } from "@/lib/clipboard";
import { cn, titleCase } from "@/lib/format";
import type { ScheduledSection } from "@/lib/types";

/** NRCs of the option on screen, ready to type into Banner. */
export function NrcList({
  schedule,
  optionNumber,
  courseOrder,
}: {
  schedule: ScheduledSection[];
  optionNumber: number;
  courseOrder: string[];
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const codes = courseOrder;

  const copy = async (key: string, text: string) => {
    if (await copyText(text)) {
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
    }
  };

  const allText = schedule
    .map((s) => `${s.courseCode} · Sección ${s.sectionId}${s.ptrm === "8A" || s.ptrm === "8B" ? ` (${s.ptrm})` : ""}: ${s.nrc}`)
    .join("\n");

  return (
    <Popover icon="bi-clipboard-check" label="NRCs">
      <p className="text-sm font-semibold">NRCs de la opción {optionNumber}</p>
      <p className="mt-0.5 text-xs text-fg-muted">Cópialos para inscribirlos en Banner.</p>
      <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
        {schedule.map((s) => {
          const key = `${s.term}-${s.nrc}`;
          return (
            <li key={key} className="flex items-center gap-2.5 py-2 pr-1.5 pl-3">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: courseColor(codes, s.courseCode) }}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {s.courseCode} · Sección {s.sectionId}
                  {(s.ptrm === "8A" || s.ptrm === "8B") && (
                    <span className="ml-1 text-xs text-fg-muted">{s.ptrm}</span>
                  )}
                </p>
                <p className="truncate text-xs text-fg-muted">{titleCase(s.courseTitle ?? "")}</p>
              </div>
              <button
                type="button"
                onClick={() => copy(key, s.nrc)}
                title="Copiar NRC"
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-mono text-sm font-semibold transition",
                  copied === key ? "bg-success/15 text-success" : "hover:bg-surface-hover",
                )}
              >
                {s.nrc}
                <i
                  key={copied === key ? "done" : "idle"}
                  className={cn("bi inline-block text-xs", copied === key ? "bi-check-lg animate-bump" : "bi-copy text-fg-muted")}
                  aria-hidden="true"
                ></i>
              </button>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={() => copy("all", allText)}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-on-accent transition hover:bg-accent-hover"
      >
        <i className={cn("bi", copied === "all" ? "bi-check-lg" : "bi-copy")} aria-hidden="true"></i>
        {copied === "all" ? "¡Copiados!" : "Copiar todos"}
      </button>
    </Popover>
  );
}
