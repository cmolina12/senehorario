"use client";

import { useEffect } from "react";
import { markChangelogSeen } from "@/lib/changelog-seen";

/** Rendered on Novedades: opening the page clears the planner's "new" dot. */
export function MarkChangelogSeen() {
  useEffect(markChangelogSeen, []);
  return null;
}
