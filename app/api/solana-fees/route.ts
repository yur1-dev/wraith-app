// app/api/solana-fees/route.ts
// Server-side proxy for Solana RPC calls with in-memory cache
// Cache prevents hammering RPC endpoints when multiple nodes poll simultaneously

import { NextResponse } from "next/server";

const ENDPOINTS = [
  "https://api.mainnet-beta.solana.com",
  "https://solana-api.projectserum.com",
  "https://rpc.ankr.com/solana",
];

// ── In-memory cache ───────────────────────────────────────────────────────────
// Fees: 8s TTL — nodes poll every 10s, so max 1 real RPC call per 8s regardless
// of how many nodes or tabs are open
let feeCacheData: { data: unknown; ts: number } | null = null;
const balanceCache = new Map<string, { data: unknown; ts: number }>();

const FEE_TTL = 8000; // 8 seconds
const BALANCE_TTL = 15000; // 15 seconds

// ── RPC caller ────────────────────────────────────────────────────────────────
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
    cache: "no-store",
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

// ── Fee fetcher with cache ────────────────────────────────────────────────────
async function getFees() {
  const now = Date.now();

  if (feeCacheData && now - feeCacheData.ts < FEE_TTL) {
    return feeCacheData.data;
  }

  const result = await tryEndpoints("getRecentPrioritizationFees");
  if (!Array.isArray(result)) throw new Error("Invalid RPC response");

  const fees: number[] = result
    .map((f: { prioritizationFee: number }) => f.prioritizationFee)
    .filter((f: number) => typeof f === "number" && f >= 0)
    .sort((a: number, b: number) => a - b);

  if (fees.length === 0) throw new Error("No fee samples returned");

  const p25 = fees[Math.floor(fees.length * 0.25)] ?? fees[0];
  const p50 = fees[Math.floor(fees.length * 0.5)] ?? fees[0];
  const p75 =
    fees[fees.length - 1 - Math.floor(fees.length * 0.25)] ??
    fees[fees.length - 1];
  const avg = Math.round(fees.reduce((a, b) => a + b, 0) / fees.length);

  const data = { low: p25, medium: p50, high: p75, avg, samples: fees.length };
  feeCacheData = { data, ts: now };
  return data;
}

// ── Balance fetcher with per-address cache ────────────────────────────────────
async function getBalance(address: string) {
  const now = Date.now();
  const cached = balanceCache.get(address);

  if (cached && now - cached.ts < BALANCE_TTL) {
    return cached.data;
  }

  const result = await tryEndpoints("getBalance", [address]);
  const lamports = result?.value ?? 0;
  const sol = lamports / 1e9;

  const data = { lamports, sol };
  balanceCache.set(address, { data, ts: now });

  // Evict stale entries if map gets large
  if (balanceCache.size > 100) {
    for (const [key, val] of balanceCache.entries()) {
      if (now - val.ts > 300_000) balanceCache.delete(key);
    }
  }

  return data;
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "fees";

  try {
    if (type === "fees") {
      const data = await getFees();
      return NextResponse.json(data, {
        headers: {
          // Browser-side cache too — cuts requests even further on fast re-renders
          "Cache-Control": "public, max-age=8, stale-while-revalidate=4",
        },
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
      const data = await getBalance(address);
      return NextResponse.json(data, {
        headers: {
          "Cache-Control": "public, max-age=15, stale-while-revalidate=5",
        },
      });
    }

    return NextResponse.json({ error: "Unknown type" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
