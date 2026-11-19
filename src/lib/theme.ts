"use client";

// Light/dark theme applied as <html data-theme>. With no saved choice it
// follows the system setting, live (e.g. when the OS switches to dark at
// night). A choice is saved only when it differs from the system; toggling
// back to the system's theme clears it, so nobody gets stuck in light mode
// at night. The initial value is applied before paint by THEME_INIT_SCRIPT.

import { useCallback, useSyncExternalStore } from "react";
import { THEME_STORAGE_KEY as STORAGE_KEY } from "./theme-script";

export type ThemeMode = "light" | "dark";

/** What toggling does: the theme to show and the choice to save (null: follow the system). */
export function nextThemeChoice(current: ThemeMode, system: ThemeMode): { theme: ThemeMode; saved: ThemeMode | null } {
  const theme: ThemeMode = current === "dark" ? "light" : "dark";
  return { theme, saved: theme === system ? null : theme };
}

const listeners = new Set<() => void>();
const DARK_QUERY = "(prefers-color-scheme: dark)";

function getTheme(): ThemeMode {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

const systemTheme = (): ThemeMode => (window.matchMedia?.(DARK_QUERY).matches ? "dark" : "light");

function savedTheme(): ThemeMode | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "dark" || value === "light" ? value : null;
  } catch {
    return null;
  }
}

function apply(theme: ThemeMode) {
  document.documentElement.setAttribute("data-theme", theme);
  listeners.forEach((l) => l());
}

/** Re-applies the saved choice, or the system theme when there is none. */
const sync = () => apply(savedTheme() ?? systemTheme());

function subscribe(listener: () => void) {
  if (listeners.size === 0) {
    window.matchMedia?.(DARK_QUERY).addEventListener("change", sync);
    // Another tab toggled the theme.
    window.addEventListener("storage", sync);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.matchMedia?.(DARK_QUERY).removeEventListener("change", sync);
      window.removeEventListener("storage", sync);
    }
  };
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getTheme, () => "light" as ThemeMode);

  const toggleTheme = useCallback(() => {
    const { theme: next, saved } = nextThemeChoice(getTheme(), systemTheme());
    try {
      if (saved) localStorage.setItem(STORAGE_KEY, saved);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage unavailable (private mode); the theme still applies for this visit.
    }
    apply(next);
  }, []);

  return { theme, toggleTheme, themeLabel: theme === "dark" ? "Modo claro" : "Modo oscuro" };
}
