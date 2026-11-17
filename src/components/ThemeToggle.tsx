"use client";

import { IconButton } from "@/components/ui";
import { useTheme } from "@/lib/theme";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme, themeLabel } = useTheme();
  return (
    <IconButton
      icon={theme === "dark" ? "bi-sun" : "bi-moon-stars"}
      label={themeLabel}
      className={className}
      onClick={toggleTheme}
    />
  );
}
