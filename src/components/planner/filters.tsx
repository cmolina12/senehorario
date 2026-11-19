import { cn } from "@/lib/format";

const chipClass = (active: boolean) =>
  cn(
    "rounded-full border px-2.5 py-1 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
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

/** A chip-styled select; the empty value shows `label` and means "any". */
export function FilterSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T | "";
  options: { value: T; label: string }[];
  onChange: (value: T | "") => void;
}) {
  return (
    <span className="relative inline-flex items-center">
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value as T | "")}
        className={cn(chipClass(!!value), "appearance-none pr-6")}
      >
        <option value="">{label}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <i
        className={cn(
          "bi bi-chevron-down pointer-events-none absolute right-2 text-2xs",
          value ? "text-on-accent" : "text-fg-muted",
        )}
        aria-hidden="true"
      ></i>
    </span>
  );
}
