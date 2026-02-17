import { NextRequest, NextResponse } from "next/server";
import { executions } from "../../execute/route";

export async function GET(
  request: NextRequest,
  { params }: { params: { flowId: string } },
) {
  const execution = executions.get(params.flowId);

  if (!execution) {
    return NextResponse.json({ error: "Flow not found" }, { status: 404 });
  }

  return NextResponse.json(execution);
}
