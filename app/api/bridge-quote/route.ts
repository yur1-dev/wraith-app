// app/api/bridge-quote/route.ts
import { NextResponse } from "next/server";

const ACROSS_CHAINS: Record<string, number> = {
  Ethereum: 1,
  Arbitrum: 42161,
  Optimism: 10,
  Polygon: 137,
  Base: 8453,
  Linea: 59144,
  zkSync: 324,
};
const HOP_CHAINS: Record<string, number> = {
  Ethereum: 1,
  Arbitrum: 42161,
  Optimism: 10,
  Polygon: 137,
  Base: 8453,
};
const SYNAPSE_CHAINS: Record<string, number> = {
  Ethereum: 1,
  Arbitrum: 42161,
  Optimism: 10,
  Polygon: 137,
  Base: 8453,
  Avalanche: 43114,
  BSC: 56,
};
const USDC: Record<number, string> = {
  1: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  42161: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
  10: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607",
  137: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
  8453: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  43114: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
  56: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
  324: "0x3355df6D4c9C3035724Fd0e3914dE96A5a83aaf4",
  59144: "0x176211869cA2b568f2A7D4EE941E073a821EE1ff",
};

interface CacheEntry {
  data: unknown;
  ts: number;
}
const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 20_000;

function parseTokenAmount(val: unknown, decimals = 6): number {
  if (val == null) return 0;
  if (typeof val === "number") return val > 1_000 ? val / 10 ** decimals : val;
  if (typeof val === "string") {
    if (!val || val === "0") return 0;
    if (val.startsWith("0x") || val.startsWith("0X")) {
      try {
        return Number(BigInt(val)) / 10 ** decimals;
      } catch {
        return 0;
      }
    }
    const n = parseFloat(val);
    if (isNaN(n)) return 0;
    return n > 1_000 ? n / 10 ** decimals : n;
  }
  if (typeof val === "object") {
    const obj = val as Record<string, unknown>;
    if (typeof obj.hex === "string") {
      try {
        return Number(BigInt(obj.hex)) / 10 ** decimals;
      } catch {
        return 0;
      }
    }
    if (obj.amount != null) return parseTokenAmount(obj.amount, decimals);
  }
  return 0;
}

async function fetchAcrossQuote(
  fromChain: string,
  toChain: string,
  amountUsd: number,
) {
  const originId = ACROSS_CHAINS[fromChain];
  const destId = ACROSS_CHAINS[toChain];
  if (!originId)
    throw new Error(`Across does not support origin chain: ${fromChain}`);
  if (!destId)
    throw new Error(`Across does not support destination chain: ${toChain}`);
  const inputToken = USDC[originId];
  const outputToken = USDC[destId];
  if (!inputToken || !outputToken)
    throw new Error("No USDC address for this chain pair");
  const inputAmount = Math.round(amountUsd * 1_000_000).toString();
  const url = new URL("https://app.across.to/api/suggested-fees");
  url.searchParams.set("originChainId", originId.toString());
  url.searchParams.set("destinationChainId", destId.toString());
  url.searchParams.set("inputToken", inputToken);
  url.searchParams.set("outputToken", outputToken);
  url.searchParams.set("amount", inputAmount);
  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Across API error ${res.status}: ${body.slice(0, 120)}`);
  }
  const data = await res.json();
  const feeRaw = data?.totalRelayFee?.total ?? data?.relayFee?.total ?? "0";
  const feeUsd = parseTokenAmount(feeRaw, 6);
  return {
    protocol: "Across",
    estimatedFeeUsd: parseFloat(feeUsd.toFixed(4)),
    minReceived: parseFloat((amountUsd - feeUsd).toFixed(4)),
    estimatedTime: data?.estimatedFillTimeSec ?? 120,
    isEstimate: false,
  };
}

const HOP_SLUGS: Record<string, string> = {
  Ethereum: "ethereum",
  Arbitrum: "arbitrum",
  Optimism: "optimism",
  Polygon: "polygon",
  Base: "base",
};

async function fetchHopQuote(
  fromChain: string,
  toChain: string,
  amountUsd: number,
) {
  const sourceChain = HOP_SLUGS[fromChain];
  const destChain = HOP_SLUGS[toChain];
  if (!sourceChain)
    throw new Error(`Hop does not support origin chain: ${fromChain}`);
  if (!destChain)
    throw new Error(`Hop does not support destination chain: ${toChain}`);
  const amount = Math.round(amountUsd * 1_000_000).toString();
  const url = new URL("https://api.hop.exchange/v1/quote");
  url.searchParams.set("amount", amount);
  url.searchParams.set("token", "USDC");
  url.searchParams.set("fromChain", sourceChain);
  url.searchParams.set("toChain", destChain);
  url.searchParams.set("slippage", "0.5");
  // Reduced timeout to 5s — Hop API is slow; fail fast and return estimate
  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(5000),
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Hop API error ${res.status}: ${body.slice(0, 120)}`);
  }
  const data = await res.json();
  const amountOut = parseTokenAmount(
    data?.amountOut ?? data?.estimatedReceived,
    6,
  );
  const bonderFee = parseTokenAmount(data?.bonderFee, 6);
  const lpFee = parseTokenAmount(data?.lpFee, 6);
  const feeUsd = amountUsd - amountOut;
  return {
    protocol: "Hop",
    estimatedFeeUsd: parseFloat(feeUsd.toFixed(4)),
    minReceived: parseFloat(amountOut.toFixed(4)),
    estimatedTime: 60,
    bonderFee: parseFloat(bonderFee.toFixed(4)),
    lpFee: parseFloat(lpFee.toFixed(4)),
    isEstimate: false,
  };
}

async function fetchSynapseQuote(
  fromChain: string,
  toChain: string,
  amountUsd: number,
) {
  const fromId = SYNAPSE_CHAINS[fromChain];
  const toId = SYNAPSE_CHAINS[toChain];
  if (!fromId)
    throw new Error(`Synapse does not support origin chain: ${fromChain}`);
  if (!toId)
    throw new Error(`Synapse does not support destination chain: ${toChain}`);
  const fromToken = USDC[fromId];
  const toToken = USDC[toId];
  if (!fromToken || !toToken)
    throw new Error("No USDC address for this chain pair");
  const amount = Math.round(amountUsd * 1_000_000).toString();
  const url = new URL("https://api.synapseprotocol.com/bridge");
  url.searchParams.set("fromChain", fromId.toString());
  url.searchParams.set("toChain", toId.toString());
  url.searchParams.set("fromToken", fromToken);
  url.searchParams.set("toToken", toToken);
  url.searchParams.set("amount", amount);
  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Synapse API error ${res.status}: ${body.slice(0, 200)}`);
  }
  const raw = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`Synapse returned non-JSON: ${raw.slice(0, 200)}`);
  }
  const quotes = Array.isArray(data) ? data : [data];
  if (!quotes.length || quotes[0] == null)
    throw new Error("Synapse: no routes returned for this chain pair");
  const best = quotes[0] as Record<string, unknown>;
  const amountOut = parseTokenAmount(
    best.maxAmountOutStr ?? best.maxAmountOut,
    6,
  );
  const bridgeFee = parseTokenAmount(
    best.bridgeFeeFormatted ??
      best.feeAmount ??
      (best.bridgeFee as Record<string, unknown>)?.amount,
    6,
  );
  const feeUsd = amountOut > 0 ? amountUsd - amountOut : bridgeFee;
  return {
    protocol: "Synapse",
    estimatedFeeUsd: parseFloat(feeUsd.toFixed(4)),
    minReceived: parseFloat(
      (amountOut > 0 ? amountOut : amountUsd - bridgeFee).toFixed(4),
    ),
    estimatedTime: (best.estimatedTime as number) ?? 60,
    bridgeFee: parseFloat(bridgeFee.toFixed(4)),
    module: (best.bridgeModuleName as string) ?? null,
    isEstimate: false,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const protocol = searchParams.get("protocol") ?? "";
  const fromChain = searchParams.get("fromChain") ?? "";
  const toChain = searchParams.get("toChain") ?? "";
  const amountUsd = parseFloat(
    searchParams.get("amountUsd") ?? searchParams.get("amount") ?? "100",
  );
  if (!protocol || !fromChain || !toChain)
    return NextResponse.json(
      { error: "protocol, fromChain, toChain are required" },
      { status: 400 },
    );
  if (fromChain === toChain)
    return NextResponse.json(
      { error: "Source and destination chains must differ" },
      { status: 400 },
    );
  if (isNaN(amountUsd) || amountUsd <= 0)
    return NextResponse.json(
      { error: "amount must be a positive number" },
      { status: 400 },
    );

  const key = `${protocol}:${fromChain}:${toChain}:${amountUsd}`;
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.ts < CACHE_TTL)
    return NextResponse.json(hit.data, {
      headers: {
        "Cache-Control": "public, max-age=20, stale-while-revalidate=10",
      },
    });

  try {
    let data: unknown;
    switch (protocol) {
      case "Across":
        data = await fetchAcrossQuote(fromChain, toChain, amountUsd);
        break;
      case "Hop":
        data = await fetchHopQuote(fromChain, toChain, amountUsd);
        break;
      case "Synapse":
        data = await fetchSynapseQuote(fromChain, toChain, amountUsd);
        break;
      default:
        return NextResponse.json(
          { error: `Unknown protocol: ${protocol}` },
          { status: 400 },
        );
    }
    cache.set(key, { data, ts: now });
    if (cache.size > 200)
      for (const [k, v] of cache.entries())
        if (now - v.ts > 300_000) cache.delete(k);
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, max-age=20, stale-while-revalidate=10",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Quote fetch failed";
    console.error(
      "[bridge-quote]",
      protocol,
      fromChain,
      "->",
      toChain,
      "|",
      msg,
    );
    // Return a graceful estimate instead of a hard 500 for timeout errors
    if (msg.includes("timeout") || msg.includes("aborted")) {
      const estimate = {
        protocol,
        estimatedFeeUsd: parseFloat((amountUsd * 0.001).toFixed(4)),
        minReceived: parseFloat((amountUsd * 0.999).toFixed(4)),
        estimatedTime: 120,
        isEstimate: true,
        estimateReason: "API timeout — showing ~0.1% fee estimate",
      };
      return NextResponse.json(estimate, { status: 200 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export const PROTOCOL_SUPPORTED_CHAINS: Record<string, string[]> = {
  Across: Object.keys(ACROSS_CHAINS),
  Hop: Object.keys(HOP_CHAINS),
  Synapse: Object.keys(SYNAPSE_CHAINS),
};
