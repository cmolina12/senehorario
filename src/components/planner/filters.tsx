import { useDismissable } from "@/components/ui";
import { cn } from "@/lib/format";

// Fixed height and leading so buttons and menu chips line up and center.
const chipClass = (active: boolean) =>
  cn(
    "inline-flex h-7 items-center gap-1 rounded-full border px-3 text-xs leading-none font-semibold whitespace-nowrap transition disabled:cursor-not-allowed disabled:opacity-50",
    active
      ? "border-accent bg-accent text-on-accent"
      : "border-border bg-surface text-fg-secondary enabled:hover:border-border-strong enabled:hover:text-fg",
  );

export function FilterChip({
  active,
  onClick,
  disabled,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} disabled={disabled} title={title} className={chipClass(active)}>
      {children}
    </button>
  );
}

/**
 * Chip that opens a short list of choices. Shows `label` while nothing is
 * picked and the chosen option's label otherwise; `anyLabel` resets it.
 */
export function FilterMenu<T extends string>({
  label,
  anyLabel,
  value,
  options,
  onChange,
}: {
  label: string;
  anyLabel: string;
  value: T | "";
  options: { value: T; label: string }[];
  onChange: (value: T | "") => void;
}) {
  const { open, setOpen, ref, rendered, closing } = useDismissable();
  const current = options.find((o) => o.value === value);
  const choices: { value: T | ""; label: string }[] = [{ value: "", label: anyLabel }, ...options];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={current ? `${label}: ${current.label}` : label}
        onClick={() => setOpen((o) => !o)}
        className={chipClass(!!current)}
      >
        {current?.label ?? label}
        <i className={cn("bi bi-chevron-down text-2xs transition-transform", open && "rotate-180")} aria-hidden="true"></i>
      </button>
      {rendered && (
        <div
          role="listbox"
          aria-label={label}
          className={cn(
            "absolute top-full left-0 z-20 mt-1 min-w-40 origin-top-left rounded-xl border border-border bg-surface py-1 shadow-lg shadow-black/10",
            closing ? "pointer-events-none animate-pop-out" : "animate-pop-in",
          )}
        >
          {choices.map((o) => (
            <button
              key={o.value || "any"}
              type="button"
              role="option"
              aria-selected={o.value === value}
              onClick={() => {
                setOpen(false);
                onChange(o.value);
              }}
              className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm whitespace-nowrap text-fg transition hover:bg-surface-hover"
            >
              {o.label}
              {o.value === value && <i className="bi bi-check-lg text-fg-secondary" aria-hidden="true"></i>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
