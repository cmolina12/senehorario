"use client";

import { useEffect, useState } from "react";

/**
 * Keeps the last non-null value on screen for `duration` ms after it becomes
 * null, so closing animations can play before unmounting.
 */
export function usePresence<T>(value: T | null, duration = 180) {
  const [rendered, setRendered] = useState<T | null>(value);
  const [previous, setPrevious] = useState<T | null>(value);

  // Adjust state while rendering when the input changes (React's recommended
  // pattern for derived state, instead of an effect).
  if (value !== previous) {
    setPrevious(value);
    if (value !== null) setRendered(value);
  }

  const closing = value === null && rendered !== null;

  useEffect(() => {
    if (!closing) return;
    const timer = setTimeout(() => setRendered(null), duration);
    return () => clearTimeout(timer);
  }, [closing, duration]);

  return { rendered, closing };
}
