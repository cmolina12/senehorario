import { Injectable, Inject, signal } from "@angular/core";
import { DOCUMENT } from "@angular/common";

type ThemeMode = "light" | "dark";

@Injectable({
  providedIn: "root",
})
export class ThemeService {
  private readonly storageKey = "senehorario-theme";
  readonly theme = signal<ThemeMode>("light");

  constructor(@Inject(DOCUMENT) private document: Document) {
    const initial = this.getInitialTheme();
    this.theme.set(initial);
    this.applyTheme(initial);
  }

  toggleTheme(): void {
    const next: ThemeMode = this.theme() === "dark" ? "light" : "dark";
    this.setTheme(next);
  }

  setTheme(mode: ThemeMode): void {
    this.theme.set(mode);
    this.persistTheme(mode);
    this.applyTheme(mode);
  }

  private getInitialTheme(): ThemeMode {
    const stored = this.readStoredTheme();
    if (stored) return stored;

    const prefersDark =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    return prefersDark ? "dark" : "light";
  }

  private readStoredTheme(): ThemeMode | null {
    if (typeof localStorage === "undefined") return null;
    const stored = localStorage.getItem(this.storageKey);
    return stored === "dark" || stored === "light" ? stored : null;
  }

  private persistTheme(mode: ThemeMode): void {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(this.storageKey, mode);
  }

  private applyTheme(mode: ThemeMode): void {
    this.document.documentElement.setAttribute("data-theme", mode);
  }
}
