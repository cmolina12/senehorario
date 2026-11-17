"use client";

// Light/dark theme stored in localStorage and applied as <html data-theme>.
// The initial value is applied before paint by THEME_INIT_SCRIPT (see theme-script.ts).

import { useCallback, useSyncExternalStore } from "react";
import { THEME_STORAGE_KEY as STORAGE_KEY } from "./theme-script";

export type ThemeMode = "light" | "dark";

const listeners = new Set<() => void>();

function getTheme(): ThemeMode {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getTheme, () => "light" as ThemeMode);

  const toggleTheme = useCallback(() => {
    const next: ThemeMode = getTheme() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage unavailable (private mode); the theme still applies for this visit.
    }
    listeners.forEach((l) => l());
  }, []);

  return { theme, toggleTheme, themeLabel: theme === "dark" ? "Modo claro" : "Modo oscuro" };
}
