import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ flowId: string }> },
) {
  const { flowId } = await params;

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
