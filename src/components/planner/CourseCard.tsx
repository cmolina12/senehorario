import { Menu, type MenuItem } from "@/components/ui";
import { cn, plural, titleCase } from "@/lib/format";

interface Props {
  code: string;
  title: string;
  credits: number;
  /** Extra detail after the credits, e.g. "3 secciones". */
  meta?: string;
  /** Course color for the side bar; a neutral bar when not selected. */
  color?: string;
  selectedCount?: number;
  expanded: boolean;
  onToggleExpanded: () => void;
  menu?: MenuItem[];
  children?: React.ReactNode;
}

/** Course card: colored side bar, code above a bold name, details below. */
export function CourseCard({
  code,
  title,
  credits,
  meta,
  color,
  selectedCount = 0,
  expanded,
  onToggleExpanded,
  menu,
  children,
}: Props) {
  return (
    <div className="flex rounded-xl bg-surface shadow-card ring-1 ring-border/70 transition hover:ring-border-strong dark:bg-surface-alt dark:ring-border-strong/70 dark:hover:ring-border-strong">
      <span
        className="w-2 shrink-0 rounded-l-xl"
        style={{ backgroundColor: color ?? "var(--border-strong)" }}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start">
          <button
            type="button"
            onClick={onToggleExpanded}
            aria-expanded={expanded}
            className="min-w-0 flex-1 rounded-r-xl py-3 pr-2 pl-3.5 text-left"
          >
            <p className="text-xs font-medium tracking-wide text-fg-muted">{code}</p>
            <p className="mt-0.5 line-clamp-2 leading-snug font-semibold">
              {title ? titleCase(title) : "No disponible"}
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-fg-secondary">
              <span>
                {credits} {plural(credits, "crédito", "créditos")}
              </span>
              {meta && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{meta}</span>
                </>
              )}
              {selectedCount > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-fg">
                    <i className="bi bi-check2" aria-hidden="true"></i>
                    {selectedCount} {plural(selectedCount, "seleccionada", "seleccionadas")}
                  </span>
                </>
              )}
              <i
                className={cn("bi bi-chevron-down ml-0.5 text-2xs text-fg-muted transition", expanded && "rotate-180")}
                aria-hidden="true"
              ></i>
            </p>
          </button>
          {menu && (
            <div className="pt-2 pr-1.5">
              <Menu label={`Opciones de ${code}`} items={menu} />
            </div>
          )}
        </div>
        {expanded && <div className="border-t border-border px-3.5">{children}</div>}
      </div>
    </div>
  );
}
