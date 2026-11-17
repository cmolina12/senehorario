import { Chip } from "@/components/ui";
import { cn, plural, titleCase } from "@/lib/format";
import type { Course } from "@/lib/types";

interface Props {
  course: Course;
  expanded: boolean;
  onToggleExpanded: () => void;
  selectedCount: number;
  /** Extra text after the credits, e.g. "3 secciones". */
  meta?: string;
  children?: React.ReactNode;
}

export function CourseCard({ course, expanded, onToggleExpanded, selectedCount, meta, children }: Props) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-surface transition",
        selectedCount > 0 ? "border-accent ring-1 ring-accent/30" : "border-border",
      )}
    >
      <button
        type="button"
        onClick={onToggleExpanded}
        aria-expanded={expanded}
        className="flex w-full items-start gap-3 rounded-xl px-4 py-3 text-left transition hover:bg-surface-hover/60"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{course.code}</span>
            <span className="text-xs text-fg-muted">
              {course.credits} {plural(course.credits, "crédito", "créditos")}
              {meta && ` · ${meta}`}
            </span>
            {selectedCount > 0 && (
              <Chip className="bg-accent-soft text-fg">
                <i className="bi bi-check2" aria-hidden="true"></i>
                {selectedCount} {plural(selectedCount, "seleccionada", "seleccionadas")}
              </Chip>
            )}
          </div>
          <p className="mt-0.5 text-sm text-fg-secondary">{titleCase(course.title)}</p>
        </div>
        <i
          className={cn("bi bi-chevron-down mt-1 text-xs text-fg-muted transition", expanded && "rotate-180")}
          aria-hidden="true"
        ></i>
      </button>
      {expanded && <div className="border-t border-border px-4">{children}</div>}
    </div>
  );
}
