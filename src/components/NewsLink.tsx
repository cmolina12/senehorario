"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";
import { initChangelogSeen, markChangelogSeen, unseenChangelogCount } from "@/lib/changelog-seen";

const noSubscription = () => () => {};

/** Link to Novedades with a dot when there are entries this browser hasn't seen. */
export function NewsLink() {
  // Read from localStorage on the client; the server render shows no dot.
  const unseen = useSyncExternalStore(noSubscription, unseenChangelogCount, () => 0);
  useEffect(initChangelogSeen, []);

  const label = unseen > 0 ? `Novedades (${unseen} ${unseen === 1 ? "nueva" : "nuevas"})` : "Novedades";
  return (
    <Link
      href="/novedades"
      onClick={markChangelogSeen}
      aria-label={label}
      title={label}
      className="relative inline-flex h-9 items-center gap-2 rounded-lg px-2.5 text-sm font-semibold text-fg-secondary transition hover:bg-surface-hover hover:text-fg"
    >
      <i className="bi bi-megaphone" aria-hidden="true"></i>
      <span className="hidden md:inline">Novedades</span>
      {unseen > 0 && (
        <span className="absolute top-1.5 left-6 size-2 rounded-full bg-accent ring-2 ring-surface" aria-hidden="true"></span>
      )}
    </Link>
  );
}
