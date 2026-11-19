import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CHANGELOG } from "@/content/changelog";
import { initChangelogSeen, markChangelogSeen, unseenChangelogCount } from "./changelog-seen";

describe("changelog seen", () => {
  let store: Record<string, string>;
  beforeEach(() => {
    store = {};
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => void (store[k] = v),
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("shows nothing on a first visit, then counts entries added later", () => {
    expect(unseenChangelogCount()).toBe(0);
    initChangelogSeen();
    expect(unseenChangelogCount()).toBe(0);
    store.seenChangelog = String(CHANGELOG.length - 2);
    expect(unseenChangelogCount()).toBe(2);
    markChangelogSeen();
    expect(unseenChangelogCount()).toBe(0);
  });

  it("doesn't overwrite an earlier visit", () => {
    store.seenChangelog = "1";
    initChangelogSeen();
    expect(store.seenChangelog).toBe("1");
  });
});
