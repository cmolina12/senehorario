"use client";

import { useEffect, useRef, useState } from "react";
import * as api from "@/lib/api";
import type { Course } from "@/lib/types";

/** Loads the CBU catalog once `enabled` becomes true and keeps it for the session. */
export function useCbus(enabled: boolean) {
  const [cbus, setCbus] = useState<Course[] | null>(null);
  const [error, setError] = useState("");
  const requested = useRef(false);

  useEffect(() => {
    if (!enabled || requested.current) return;
    requested.current = true;
    api
      .getCBUs()
      .then(setCbus)
      .catch(() => setError("No se pudieron cargar los CBUs. Por favor, intenta de nuevo."));
  }, [enabled]);

  return { cbus: cbus ?? [], loading: enabled && cbus === null && !error, error };
}

export type CbuState = ReturnType<typeof useCbus>;
