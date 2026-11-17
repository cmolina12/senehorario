"use client";

// Small shared UI primitives.

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/format";
import { usePresence } from "@/lib/use-presence";

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
        "inline-flex items-center gap-1 rounded-md bg-surface-inset px-1.5 py-0.5 text-xs whitespace-nowrap text-fg-secondary tabular-nums",
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * Open/closed state that closes on outside click or Escape. `inside` is
 * another element that counts as inside (a panel rendered in a portal).
 */
function useDismissable(inside?: React.RefObject<HTMLElement | null>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!ref.current?.contains(target) && !inside?.current?.contains(target)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, inside]);

  const { rendered, closing } = usePresence(open ? true : null, 140);
  return { open, setOpen, ref, rendered: !!rendered, closing };
}

export interface MenuItem {
  label: string;
  icon: string;
  onSelect: () => void;
  danger?: boolean;
}

/** "⋯" button with a small dropdown of actions. */
export function Menu({ label, items }: { label: string; items: MenuItem[] }) {
  const { open, setOpen, ref, rendered, closing } = useDismissable();

  return (
    <div ref={ref} className="relative">
      <IconButton
        icon="bi-three-dots"
        label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        className="size-8"
        onClick={() => setOpen((o) => !o)}
      />
      {rendered && (
        <div
          role="menu"
          className={cn(
            "absolute top-full right-0 z-20 mt-1 min-w-52 origin-top-right rounded-xl border border-border bg-surface py-1 shadow-lg shadow-black/10",
            closing ? "pointer-events-none animate-pop-out" : "animate-pop-in",
          )}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className={cn(
                "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm whitespace-nowrap transition hover:bg-surface-hover",
                item.danger ? "text-danger" : "text-fg",
              )}
            >
              <i className={`bi ${item.icon} w-4 text-center opacity-80`} aria-hidden="true"></i>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const VIEWPORT_MARGIN = 16;

/**
 * Button that opens a floating panel below it. The panel is rendered at the
 * page root (scrolling columns would clip it) and placed with its right edge
 * on the button's, shifted as needed to stay on screen.
 */
export function Popover({
  icon,
  label,
  className,
  panelClassName,
  badge,
  children,
}: {
  icon: string;
  label: string;
  badge?: number;
  className?: string;
  panelClassName?: string;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { open, setOpen, ref, rendered, closing } = useDismissable(panelRef);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!rendered) return;
    const place = () => {
      const button = ref.current?.getBoundingClientRect();
      const panel = panelRef.current;
      if (!button || !panel) return;
      const width = panel.offsetWidth;
      const maxLeft = document.documentElement.clientWidth - width - VIEWPORT_MARGIN;
      const left = Math.max(VIEWPORT_MARGIN, Math.min(button.right - width, maxLeft));
      setPosition({ top: button.bottom + 8, left });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true); // any scrolling column moves the button
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      setPosition(null);
    };
  }, [rendered, ref]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-surface px-3 text-sm font-semibold transition hover:border-border-strong",
          open && "border-accent",
          className,
        )}
      >
        <i className={`bi ${icon}`} aria-hidden="true"></i>
        {label}
        {!!badge && (
          <span className="rounded-full bg-accent px-1.5 text-2xs leading-4 font-extrabold text-on-accent tabular-nums">{badge}</span>
        )}
      </button>
      {rendered &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label={label}
            style={{
              top: position?.top ?? 0,
              left: position?.left ?? 0,
              // Measured first, shown once placed.
              visibility: position ? undefined : "hidden",
              maxHeight: position ? `calc(100dvh - ${position.top + VIEWPORT_MARGIN}px)` : undefined,
            }}
            className={cn(
              "fixed z-50 w-80 max-w-[calc(100vw-2rem)] origin-top-right overflow-y-auto rounded-2xl border border-border bg-surface p-4 text-fg shadow-xl shadow-black/10",
              closing ? "pointer-events-none animate-pop-out" : "animate-pop-in",
              panelClassName,
            )}
          >
            {children}
          </div>,
          document.body,
        )}
    </div>
  );
}

/** Placeholder course cards shown while results load. */
export function CardSkeletons({ count = 3, label }: { count?: number; label: string }) {
  return (
    <div className="space-y-2.5" role="status" aria-label={label}>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="flex animate-pulse rounded-xl bg-surface shadow-card ring-1 ring-border/70 dark:bg-surface-alt"
          style={{ animationDelay: `${i * 120}ms` }}
        >
          <span className="w-2 shrink-0 rounded-l-xl bg-border" />
          <div className="flex-1 space-y-2 px-3.5 py-3.5">
            <div className="h-2.5 w-16 rounded-full bg-border" />
            <div className="h-3.5 w-3/4 rounded-full bg-border" />
            <div className="h-2.5 w-28 rounded-full bg-border" />
          </div>
        </div>
      ))}
    </div>
  );
}
