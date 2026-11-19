import { describe, expect, it } from "vitest";
import { nextThemeChoice } from "./theme";

describe("nextThemeChoice", () => {
  it("saves a choice that differs from the system", () => {
    expect(nextThemeChoice("dark", "dark")).toEqual({ theme: "light", saved: "light" });
    expect(nextThemeChoice("light", "light")).toEqual({ theme: "dark", saved: "dark" });
  });

  it("goes back to following the system when toggling to its theme", () => {
    expect(nextThemeChoice("light", "dark")).toEqual({ theme: "dark", saved: null });
    expect(nextThemeChoice("dark", "light")).toEqual({ theme: "light", saved: null });
  });
});
