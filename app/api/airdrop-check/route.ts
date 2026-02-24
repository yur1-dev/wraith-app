// app/api/airdrop-check/route.ts
import { NextResponse } from "next/server";

// ── Cache ─────────────────────────────────────────────────────────────────────
const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 60_000;

// ── Curated upcoming airdrops ─────────────────────────────────────────────────
export const UPCOMING_AIRDROPS = [
  {
    id: "metamask",
    name: "MetaMask",
    ticker: "$MASK",
    status: "confirmed",
    description:
      "ConsenSys confirmed $MASK token. Season 1 rewards concluded — claim window opening soon.",
    eligibility: [
      "Use MetaMask swaps & bridge",
      "Active wallet history",
      "Linea interactions",
    ],
    claimUrl: "https://portfolio.metamask.io",
    chain: "Ethereum",
    category: "Wallet",
    estimatedValue: "$$$$",
    color: "#f6851b",
  },
  {
    id: "base",
    name: "Base",
    ticker: "$BASE",
    status: "rumored",
    description:
      "Coinbase's L2. No token yet but massive ecosystem — early users strongly favored.",
    eligibility: [
      "Bridge to Base",
      "Use Base dApps",
      "On-chain activity on Base",
    ],
    claimUrl: "https://base.org",
    chain: "Base",
    category: "L2",
    estimatedValue: "$$$",
    color: "#0052ff",
  },
  {
    id: "hyperliquid",
    name: "Hyperliquid",
    ticker: "$HYPE",
    status: "live",
    description:
      "One of the biggest airdrops of 2024. Still claimable for eligible traders.",
    eligibility: ["Trade on Hyperliquid perps", "Early volume counts"],
    claimUrl: "https://app.hyperliquid.xyz/drip",
    chain: "Hyperliquid L1",
    category: "DEX/Perps",
    estimatedValue: "$$$$",
    color: "#00ff88",
  },
  {
    id: "kaito",
    name: "Kaito AI",
    ticker: "$KAITO",
    status: "live",
    description:
      "Yapper airdrop for crypto Twitter engagement. Points-based distribution.",
    eligibility: [
      "Active on crypto Twitter/X",
      "Kaito yaps & engagement score",
    ],
    claimUrl: "https://yap.kaito.ai",
    chain: "Ethereum",
    category: "AI/Social",
    estimatedValue: "$$$",
    color: "#7c3aed",
  },
  {
    id: "monad",
    name: "Monad",
    ticker: "$MON",
    status: "testnet",
    description:
      "High-performance EVM L1. Testnet participants strongly favored for mainnet drop.",
    eligibility: [
      "Use Monad testnet",
      "Bridge to testnet",
      "Interact with testnet dApps",
    ],
    claimUrl: "https://testnet.monad.xyz",
    chain: "Monad",
    category: "L1",
    estimatedValue: "$$$$",
    color: "#836ef9",
  },
  {
    id: "sonic",
    name: "Sonic (FTM)",
    ticker: "$S",
    status: "live",
    description:
      "Fantom rebranded to Sonic. Airdrop for FTM holders and active DeFi users.",
    eligibility: ["Hold FTM/Sonic tokens", "Use Sonic DeFi protocols"],
    claimUrl: "https://my.sonic.market/airdrop",
    chain: "Sonic",
    category: "L1",
    estimatedValue: "$$$",
    color: "#00d4ff",
  },
  {
    id: "corn",
    name: "Corn",
    ticker: "$CORN",
    status: "rumored",
    description:
      "Bitcoin-powered L2. Early depositors and bridge users likely eligible.",
    eligibility: ["Bridge BTC to Corn", "Use Corn DeFi apps", "Hold BTCN"],
    claimUrl: "https://app.usecorn.com",
    chain: "Corn",
    category: "L2/BTC",
    estimatedValue: "$$$",
    color: "#f59e0b",
  },
  {
    id: "berachain",
    name: "Berachain",
    ticker: "$BERA",
    status: "live",
    description:
      "Proof of Liquidity chain. BGT holders and validators eligible.",
    eligibility: [
      "Provide liquidity on Berachain",
      "Participate in proof-of-liquidity",
    ],
    claimUrl: "https://hub.berachain.com",
    chain: "Berachain",
    category: "L1",
    estimatedValue: "$$$",
    color: "#d97706",
  },
  {
    id: "scroll",
    name: "Scroll",
    ticker: "$SCR",
    status: "live",
    description:
      "ZK-rollup airdrop ongoing. Session 2 rewards for active users.",
    eligibility: ["Bridge to Scroll", "Use Scroll dApps", "Hold Scroll marks"],
    claimUrl: "https://scroll.io/sessions",
    chain: "Scroll",
    category: "L2/ZK",
    estimatedValue: "$$$",
    color: "#eab308",
  },
  {
    id: "linea",
    name: "Linea",
    ticker: "$LINEA",
    status: "confirmed",
    description:
      "ConsenSys ZK L2 Surge campaign running — token launch expected 2025.",
    eligibility: [
      "Use Linea Surge dApps",
      "Bridge to Linea",
      "Provide liquidity",
    ],
    claimUrl: "https://linea.build/surge",
    chain: "Linea",
    category: "L2/ZK",
    estimatedValue: "$$$",
    color: "#60a5fa",
  },
];

// ── Source 1: Daylight API ────────────────────────────────────────────────────
// The same API used by MetaMask, Zerion, Coinbase Wallet internally
async function fetchDaylight(address: string) {
  const url = `https://api.daylight.xyz/v1/wallets/${address}/abilities?type=airdrop&limit=20`;
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`Daylight ${res.status}`);
  const data = await res.json();
  const abilities: unknown[] = Array.isArray(data?.abilities)
    ? data.abilities
    : [];

  return abilities.map((a) => {
    const ab = a as Record<string, unknown>;
    const action = (ab.action as Record<string, unknown>) ?? {};
    const chainInfo = (ab.chain as Record<string, unknown>) ?? {};
    return {
      id: `dl-${String(ab.uid ?? ab.slug ?? Math.random())}`,
      name: String(ab.title ?? ab.name ?? "Airdrop"),
      description: String(ab.description ?? ""),
      claimUrl: String(action.linkUrl ?? action.url ?? "#"),
      chain: String(chainInfo.name ?? "EVM"),
      token: String(ab.token ?? ""),
      estimatedAmount: ab.estimatedAmount
        ? String(ab.estimatedAmount)
        : undefined,
      expiresAt: ab.expiresAt ? String(ab.expiresAt) : undefined,
      source: "daylight" as const,
    };
  });
}

// ── Source 2: Merkl API ───────────────────────────────────────────────────────
// Fully public API powering DeFi reward distribution across 50+ chains
// Returns real unclaimed token rewards for any wallet — no API key needed
async function fetchMerkl(address: string) {
  const chains: Array<[number, string]> = [
    [1, "Ethereum"],
    [42161, "Arbitrum"],
    [10, "Optimism"],
    [137, "Polygon"],
    [8453, "Base"],
    [59144, "Linea"],
    [534352, "Scroll"],
    [81457, "Blast"],
    [34443, "Mode"],
  ];

  const results = await Promise.allSettled(
    chains.map(async ([chainId, chainName]) => {
      const url = `https://api.merkl.xyz/v4/rewards?user=${address}&chainId=${chainId}`;
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(6_000),
      });
      if (!res.ok) return [];
      const data = await res.json();
      const rewards: unknown[] = Array.isArray(data) ? data : [];

      return rewards
        .filter((r) => {
          const rw = r as Record<string, unknown>;
          return Number(rw.unclaimed ?? rw.amount ?? 0) > 0;
        })
        .map((r) => {
          const rw = r as Record<string, unknown>;
          const token = (rw.token as Record<string, unknown>) ?? {};
          const decimals = Number(token.decimals ?? 18);
          const unclaimed = Number(rw.unclaimed ?? rw.amount ?? 0);
          const humanAmount = unclaimed / 10 ** decimals;

          return {
            id: `merkl-${chainId}-${String(token.address ?? Math.random())}`,
            name: String(token.name ?? token.symbol ?? "Token Reward"),
            description: `Unclaimed ${String(token.symbol ?? "tokens")} on ${chainName}`,
            claimUrl: `https://app.merkl.xyz/users/${address}`,
            chain: chainName,
            token: String(token.symbol ?? ""),
            estimatedAmount:
              humanAmount > 0
                ? `${humanAmount < 0.001 ? "<0.001" : humanAmount.toFixed(4)} ${String(token.symbol ?? "")}`
                : undefined,
            expiresAt: undefined,
            source: "merkl" as const,
          };
        });
    }),
  );

  return results
    .filter(
      (
        r,
      ): r is PromiseFulfilledResult<
        {
          id: string;
          name: string;
          description: string;
          claimUrl: string;
          chain: string;
          token: string;
          estimatedAmount: string | undefined;
          expiresAt: undefined;
          source: "merkl";
        }[]
      > => r.status === "fulfilled",
    )
    .flatMap((r) => r.value);
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = (searchParams.get("address") ?? "").trim();
  const mode = searchParams.get("mode") ?? "check";

  if (mode === "upcoming") {
    return NextResponse.json({ upcoming: UPCOMING_AIRDROPS });
  }

  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return NextResponse.json(
      {
        error:
          "Invalid EVM address — must be 0x followed by 40 hex characters.",
      },
      { status: 400 },
    );
  }

  const cacheKey = `check:${address.toLowerCase()}`;
  const now = Date.now();
  const hit = cache.get(cacheKey);
  if (hit && now - hit.ts < CACHE_TTL) return NextResponse.json(hit.data);

  // Both sources fire in parallel — neither blocks the other
  const [daylightRes, merklRes] = await Promise.allSettled([
    fetchDaylight(address),
    fetchMerkl(address),
  ]);

  const daylightAirdrops =
    daylightRes.status === "fulfilled" ? daylightRes.value : [];
  const merklAirdrops = merklRes.status === "fulfilled" ? merklRes.value : [];
  const daylightError =
    daylightRes.status === "rejected" ? String(daylightRes.reason) : undefined;
  const merklError =
    merklRes.status === "rejected" ? String(merklRes.reason) : undefined;

  // Deduplicate across sources by name+chain
  const seen = new Set<string>();
  const liveAirdrops = [...daylightAirdrops, ...merklAirdrops].filter((a) => {
    const key = `${a.name.toLowerCase()}:${a.chain.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const result = {
    address,
    liveAirdrops,
    upcoming: UPCOMING_AIRDROPS,
    sources: {
      daylight: daylightError
        ? `error: ${daylightError}`
        : `ok (${daylightAirdrops.length})`,
      merkl: merklError
        ? `error: ${merklError}`
        : `ok (${merklAirdrops.length})`,
    },
    checkedAt: new Date().toISOString(),
  };

  cache.set(cacheKey, { data: result, ts: now });
  if (cache.size > 500)
    for (const [k, v] of cache.entries())
      if (now - v.ts > 300_000) cache.delete(k);

  return NextResponse.json(result);
}
