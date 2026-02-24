// app/api/solana-fees/route.ts
// Server-side proxy for Solana RPC calls — no CORS issues since this runs on the server

import { NextResponse } from "next/server";

const ENDPOINTS = [
  "https://api.mainnet-beta.solana.com",
  "https://solana-api.projectserum.com",
  "https://rpc.ankr.com/solana",
];

async function rpcCall(
  endpoint: string,
  method: string,
  params: unknown[] = [],
) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.result;
}

async function tryEndpoints(method: string, params: unknown[] = []) {
  for (const endpoint of ENDPOINTS) {
    try {
      return await rpcCall(endpoint, method, params);
    } catch {
      continue;
    }
  }
  throw new Error("All RPC endpoints failed");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "fees";

  try {
    if (type === "fees") {
      // getRecentPrioritizationFees — returns real microlamport fee samples
      const result = await tryEndpoints("getRecentPrioritizationFees");

      if (!Array.isArray(result)) {
        return NextResponse.json(
          { error: "Invalid RPC response" },
          { status: 500 },
        );
      }

      const fees: number[] = result
        .map((f: { prioritizationFee: number }) => f.prioritizationFee)
        .filter((f: number) => typeof f === "number" && f >= 0)
        .sort((a: number, b: number) => a - b);

      if (fees.length === 0) {
        return NextResponse.json(
          { error: "No fee samples returned" },
          { status: 500 },
        );
      }

      const p25 = fees[Math.floor(fees.length * 0.25)] ?? fees[0];
      const p50 = fees[Math.floor(fees.length * 0.5)] ?? fees[0];
      const p75 =
        fees[fees.length - 1 - Math.floor(fees.length * 0.25)] ??
        fees[fees.length - 1];
      const avg = Math.round(fees.reduce((a, b) => a + b, 0) / fees.length);

      return NextResponse.json({
        low: p25,
        medium: p50,
        high: p75,
        avg,
        samples: fees.length,
      });
    }

    if (type === "balance") {
      const address = searchParams.get("address");
      if (!address) {
        return NextResponse.json(
          { error: "address required" },
          { status: 400 },
        );
      }

      const result = await tryEndpoints("getBalance", [address]);
      // result.value is lamports
      const lamports = result?.value ?? 0;
      const sol = lamports / 1e9;

      return NextResponse.json({ lamports, sol });
    }

    return NextResponse.json({ error: "Unknown type" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
