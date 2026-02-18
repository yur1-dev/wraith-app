import { NextRequest, NextResponse } from "next/server";
import { executions } from "../../execute/route";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ flowId: string }> },
) {
  const { flowId } = await params;
  const execution = executions.get(flowId);

  if (!execution) {
    return NextResponse.json({ error: "Flow not found" }, { status: 404 });
  }

  return NextResponse.json(execution);
}
