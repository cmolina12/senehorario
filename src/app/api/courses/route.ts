import { NextResponse, type NextRequest } from "next/server";
import { searchCourses } from "@/lib/uniandes";

// GET /api/courses?q=<name, code or NRC>&professor=<optional>
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const q = params.get("q") ?? "";
  const professor = params.get("professor") ?? "";

  if (!q.trim() && !professor.trim()) {
    return NextResponse.json([]);
  }

  try {
    const { courses, truncated } = await searchCourses(q, professor);
    return NextResponse.json(courses, { headers: { "X-Results-Truncated": truncated ? "1" : "0" } });
  } catch (error) {
    console.error("Course search failed:", error);
    return NextResponse.json({ error: "Upstream catalog error" }, { status: 502 });
  }
}
