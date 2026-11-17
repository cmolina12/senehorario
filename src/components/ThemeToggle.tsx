"use client";

import { useTheme } from "@/lib/theme";

export function ThemeToggle() {
  const { theme, toggleTheme, themeLabel } = useTheme();
  return (
    <button type="button" className="theme-toggle" onClick={toggleTheme} aria-label={themeLabel}>
      <i className={`bi ${theme === "dark" ? "bi-brightness-high" : "bi-moon-stars"}`}></i>
    </button>
  );
}
