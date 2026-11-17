// Browser-side client for this app's own API routes.

import type { Course } from "./types";

async function get(url: string): Promise<Response> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request to ${url} failed with ${res.status}`);
  return res;
}

export interface SearchResult {
  courses: Course[];
  /** The catalog hit its row limit; a more specific search may show more. */
  truncated: boolean;
}

export async function searchCourses(query: string, professor = ""): Promise<SearchResult> {
  const params = new URLSearchParams({ q: query });
  if (professor.trim()) params.set("professor", professor.trim());
  const res = await get(`/api/courses?${params}`);
  return { courses: (await res.json()) as Course[], truncated: res.headers.get("X-Results-Truncated") === "1" };
}

export async function getCBUs(): Promise<Course[]> {
  return (await get("/api/courses/cbu")).json() as Promise<Course[]>;
}
