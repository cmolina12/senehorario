// Small shared UI primitives.

import { cn } from "@/lib/format";

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Cargando"
      className={cn(
        "inline-block size-4 animate-spin rounded-full border-2 border-border-strong border-t-accent",
        className,
      )}
    />
  );
}

export function EmptyState({
  icon,
  title,
  children,
  tone = "muted",
}: {
  icon: string;
  title?: string;
  children?: React.ReactNode;
  tone?: "muted" | "danger";
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      <span
        className={cn(
          "grid size-11 place-items-center rounded-full text-lg",
          tone === "danger" ? "bg-danger/10 text-danger" : "bg-surface-alt text-fg-muted",
        )}
      >
        <i className={`bi ${icon}`} aria-hidden="true"></i>
      </span>
      {title && <p className="text-sm font-semibold text-fg">{title}</p>}
      {children && <div className="max-w-sm text-sm text-fg-secondary">{children}</div>}
    </div>
  );
}

export function IconButton({
  icon,
  label,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { icon: string; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-lg text-fg-secondary transition hover:bg-surface-hover hover:text-fg disabled:pointer-events-none disabled:opacity-40",
        className,
      )}
      {...props}
    >
      <i className={`bi ${icon}`} aria-hidden="true"></i>
    </button>
  );
}

/** Chip for a meeting time, credits, etc. */
export function Chip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md bg-surface-alt px-1.5 py-0.5 text-[0.72rem] font-medium whitespace-nowrap text-fg-secondary",
        className,
      )}
    >
      {children}
    </span>
  );
}
