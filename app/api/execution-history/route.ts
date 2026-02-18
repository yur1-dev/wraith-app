import { NextResponse } from "next/server";

/**
 * The execute route stores executions in its own in-memory map.
 * We fetch them by calling the execute route's GET handler directly
 * via internal fetch rather than importing the map (which causes
 * the "not exported" TS error and module boundary issues).
 */
export async function GET() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/execute`, {
      method: "GET",
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({ executions: [] });
    }

    const data = await res.json();
    return NextResponse.json({ executions: data.executions ?? [] });
  } catch {
    return NextResponse.json({ executions: [] });
  }
}
