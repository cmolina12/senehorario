// Browser-side client for this app's own API routes.

import type { Course } from "./types";

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request to ${url} failed with ${res.status}`);
  return res.json() as Promise<T>;
}

export function searchCourses(query: string, professor = ""): Promise<Course[]> {
  const params = new URLSearchParams({ q: query });
  if (professor.trim()) params.set("professor", professor.trim());
  return getJson<Course[]>(`/api/courses?${params}`);
}

export function getCBUs(): Promise<Course[]> {
  return getJson<Course[]>("/api/courses/cbu");
}
