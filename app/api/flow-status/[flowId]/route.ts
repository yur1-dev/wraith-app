import { NextRequest, NextResponse } from "next/server";

/**
 * Returns status for a specific flow execution by ID.
 * Fetches from the execute route's GET endpoint rather than
 * importing the executions map directly (avoids TS2459 error).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { flowId: string } },
) {
  const { flowId } = params;

  if (!flowId) {
    return NextResponse.json({ error: "flowId is required" }, { status: 400 });
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/execute`, {
      method: "GET",
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Could not fetch executions" },
        { status: 500 },
      );
    }

    const data = await res.json();
    const executions: any[] = data.executions ?? [];
    const execution = executions.find((e: any) => e.id === flowId);

    if (!execution) {
      return NextResponse.json(
        { error: "Execution not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ execution });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch execution status" },
      { status: 500 },
    );
  }
}
