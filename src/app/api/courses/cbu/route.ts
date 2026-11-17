import { NextResponse } from "next/server";
import { getCBUCourses } from "@/lib/uniandes";

export const dynamic = "force-dynamic";

// GET /api/courses/cbu -> all CBU courses with sections (each with attrs)
export async function GET() {
  try {
    return NextResponse.json(await getCBUCourses());
  } catch (error) {
    console.error("CBU fetch failed:", error);
    return NextResponse.json({ error: "Upstream catalog error" }, { status: 502 });
  }
}
