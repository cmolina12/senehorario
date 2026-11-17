"use client";

import { useCallback, useRef, useState } from "react";
import * as api from "@/lib/api";
import type { Course } from "@/lib/types";

const SEARCH_ERROR =
  "La base de datos de la Universidad de los Andes tiene errores en los valores de los cursos. Por favor, inténtalo de nuevo más tarde.";

export function useCourseSearch() {
  const [query, setQuery] = useState("");
  const [professor, setProfessor] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [empty, setEmpty] = useState(false);
  const [error, setError] = useState("");
  const [truncated, setTruncated] = useState(false);
  const requestId = useRef(0);

  const search = useCallback(async (q: string, prof: string) => {
    const id = ++requestId.current;
    if (!q.trim() && !prof.trim()) {
      setCourses([]);
      setTruncated(false);
      setEmpty(false);
      setError("");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await api.searchCourses(q, prof);
      if (id !== requestId.current) return;
      setCourses(result.courses);
      setTruncated(result.truncated);
      setEmpty(result.courses.length === 0);
      setError("");
    } catch (e) {
      if (id !== requestId.current) return;
      console.error("Error fetching courses:", e);
      setCourses([]);
      setTruncated(false);
      setEmpty(false);
      setError(SEARCH_ERROR);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  /** Search for an exact course code (used from "Mis cursos"). */
  const searchFor = useCallback(
    (code: string) => {
      setQuery(code);
      void search(code, professor);
    },
    [search, professor],
  );

  return {
    query,
    setQuery,
    professor,
    setProfessor,
    courses,
    loading,
    empty,
    error,
    truncated,
    submit: () => void search(query, professor),
    searchFor,
  };
}

export type CourseSearch = ReturnType<typeof useCourseSearch>;
