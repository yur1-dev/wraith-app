// app/api/flows/route.ts
import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

const FLOWS_INDEX = "flows:index";
const flowKey = (id: string) => `flows:data:${id}`;

// ── GET — list all flows OR load one ─────────────────────────────────────────
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  try {
    if (id) {
      const data = await redis.get(flowKey(id));
      if (!data)
        return NextResponse.json({ error: "Flow not found" }, { status: 404 });
      return NextResponse.json(data);
    }

    // List — sorted set gives newest first
    const ids = await redis.zrange(FLOWS_INDEX, 0, 49, { rev: true });
    if (!ids.length) return NextResponse.json({ flows: [] });

    const flows = await Promise.all(
      ids.map(async (flowId) => {
        const data = await redis.get<{
          name: string;
          nodes: unknown[];
          edges: unknown[];
          savedAt: string;
        }>(flowKey(String(flowId)));
        if (!data) return null;
        return {
          id: flowId,
          name: data.name,
          nodeCount: data.nodes?.length ?? 0,
          edgeCount: data.edges?.length ?? 0,
          savedAt: data.savedAt,
        };
      }),
    );

    return NextResponse.json({ flows: flows.filter(Boolean) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}

// ── POST — save a flow ────────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, name, nodes, edges } = body;

    if (!id || !name) {
      return NextResponse.json(
        { error: "id and name required" },
        { status: 400 },
      );
    }

    const savedAt = new Date().toISOString();

    // Store full flow data
    await redis.set(flowKey(id), { id, name, nodes, edges, savedAt });
    // Add to index with timestamp score for ordering
    await redis.zadd(FLOWS_INDEX, { score: Date.now(), member: id });

    return NextResponse.json({ ok: true, id, savedAt });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}

// ── DELETE — delete a flow ────────────────────────────────────────────────────
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    await redis.del(flowKey(id));
    await redis.zrem(FLOWS_INDEX, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
