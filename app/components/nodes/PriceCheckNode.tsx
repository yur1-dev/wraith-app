"use client";

import { memo, useState, useEffect, useRef, useCallback } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { TrendingUp, MoreVertical, RefreshCw, AlertCircle } from "lucide-react";
import { useFlowStore } from "@/lib/hooks/useFlowStore";

const PRICE_SOURCES = [
  { id: "coingecko", label: "CoinGecko" },
  { id: "coinmarketcap", label: "CoinMarketCap" },
  { id: "dexscreener", label: "DexScreener" },
  { id: "jupiter", label: "Jupiter" },
  { id: "chainlink", label: "Chainlink" },
] as const;

type PriceSourceId = (typeof PRICE_SOURCES)[number]["id"];

const POPULAR_TOKENS = [
  "ETH",
  "BTC",
  "SOL",
  "BNB",
  "ARB",
  "OP",
  "MATIC",
  "AVAX",
  "LINK",
  "UNI",
];

const PRESET_COLORS = [
  "#a855f7",
  "#f97316",
  "#3b82f6",
  "#06b6d4",
  "#10b981",
  "#eab308",
  "#f43f5e",
  "#8b5cf6",
  "#ec4899",
  "#84cc16",
];

// ── Cache ────────────────────────────────────────────────────────────────────
const coinIdCache = new Map<string, string | null>();

// ── CoinGecko ────────────────────────────────────────────────────────────────
async function fetchCoinGecko(symbol: string) {
  const key = symbol.toUpperCase();
  if (!coinIdCache.has(key)) {
    try {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(symbol)}`,
        { signal: AbortSignal.timeout(6000) },
      );
      const data = await res.json();
      const coins: Array<{ id: string; symbol: string }> = data.coins ?? [];
      const exact = coins.find((c) => c.symbol.toUpperCase() === key);
      coinIdCache.set(key, exact?.id ?? coins[0]?.id ?? null);
    } catch {
      coinIdCache.set(key, null);
    }
  }
  const coinId = coinIdCache.get(key);
  if (!coinId) return null;

  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`,
    { signal: AbortSignal.timeout(6000) },
  );
  const data = await res.json();
  return {
    price: data[coinId]?.usd ?? null,
    change24h: data[coinId]?.usd_24h_change ?? null,
    source: "CoinGecko",
  };
}

// ── CoinMarketCap (via public widget endpoint, no API key needed) ─────────────
async function fetchCoinMarketCap(symbol: string) {
  // CMC has a public widget endpoint that doesn't need an API key
  try {
    const res = await fetch(
      `https://api.coinmarketcap.com/data-api/v3/cryptocurrency/market-pairs/latest?slug=${symbol.toLowerCase()}&start=1&limit=1&category=spot&centerType=all&sort=cmc_rank_advanced&direction=desc&spotUntracked=true`,
      { signal: AbortSignal.timeout(6000) },
    );
    if (!res.ok) throw new Error("CMC failed");
    const data = await res.json();
    const quote = data?.data?.marketPairs?.[0]?.price;
    if (quote == null) throw new Error("no data");
    return { price: quote, change24h: null, source: "CoinMarketCap" };
  } catch {
    // Fallback: use CoinGecko data but label it CMC
    const cg = await fetchCoinGecko(symbol);
    return cg ? { ...cg, source: "CoinMarketCap (via CoinGecko)" } : null;
  }
}

// ── DexScreener ───────────────────────────────────────────────────────────────
async function fetchDexScreener(symbol: string) {
  try {
    const res = await fetch(
      `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(symbol)}`,
      { signal: AbortSignal.timeout(6000) },
    );
    if (!res.ok) throw new Error("DexScreener failed");
    const data = await res.json();
    const pairs: Array<{
      baseToken: { symbol: string };
      priceUsd: string;
      priceChange?: { h24?: number };
    }> = data.pairs ?? [];

    // Find best pair matching the symbol
    const match =
      pairs.find(
        (p) => p.baseToken.symbol.toUpperCase() === symbol.toUpperCase(),
      ) ?? pairs[0];

    if (!match?.priceUsd) throw new Error("no pair");
    return {
      price: parseFloat(match.priceUsd),
      change24h: match.priceChange?.h24 ?? null,
      source: "DexScreener",
    };
  } catch {
    return null;
  }
}

// ── Jupiter (Solana tokens) ───────────────────────────────────────────────────
// Jupiter price API uses token mint addresses; we resolve via token list first
const jupiterMintCache = new Map<string, string | null>();

async function fetchJupiter(symbol: string) {
  // Step 1: resolve symbol to mint address via Jupiter token list
  if (!jupiterMintCache.has(symbol.toUpperCase())) {
    try {
      const res = await fetch("https://token.jup.ag/strict", {
        signal: AbortSignal.timeout(8000),
      });
      const tokens: Array<{ symbol: string; address: string }> =
        await res.json();
      const match = tokens.find(
        (t) => t.symbol.toUpperCase() === symbol.toUpperCase(),
      );
      jupiterMintCache.set(symbol.toUpperCase(), match?.address ?? null);
    } catch {
      jupiterMintCache.set(symbol.toUpperCase(), null);
    }
  }

  const mint = jupiterMintCache.get(symbol.toUpperCase());
  if (!mint) {
    // Fallback to CoinGecko for non-Solana tokens
    const cg = await fetchCoinGecko(symbol);
    return cg ? { ...cg, source: "Jupiter (via CoinGecko)" } : null;
  }

  // Step 2: fetch price from Jupiter price API v2
  try {
    const res = await fetch(`https://api.jup.ag/price/v2?ids=${mint}`, {
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) throw new Error("Jupiter price failed");
    const data = await res.json();
    const priceData = data.data?.[mint];
    if (!priceData?.price) throw new Error("no price");
    return {
      price: parseFloat(priceData.price),
      change24h: null,
      source: "Jupiter",
    };
  } catch {
    return null;
  }
}

// ── Chainlink (via public RPC — ETH mainnet) ──────────────────────────────────
// Uses Chainlink's Data Feeds via a public Ethereum RPC
const CHAINLINK_FEEDS: Record<string, string> = {
  ETH: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
  BTC: "0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88b",
  SOL: "0x4ffC43a60e009B551865A93d232E33Fce9f01507",
  BNB: "0x14e613AC84a31f709eadbEF3813C01191B7dA341",
  LINK: "0x2c1d072e956AFFC0D435Cb7AC38EF18d24d9127c",
  MATIC: "0x7bAC85A8a13A4BcD8abb3eB7d6b4d632c895a967",
  AVAX: "0xFF3EEb22B5E3dE6e705b44749C2559d704923FD",
  UNI: "0x553303d460EE0afB37EdFf9bE42922D8FF63220",
  USDC: "0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6",
};

async function fetchChainlink(symbol: string) {
  const feedAddress = CHAINLINK_FEEDS[symbol.toUpperCase()];
  if (!feedAddress) {
    // Fallback to CoinGecko for tokens without a Chainlink feed
    const cg = await fetchCoinGecko(symbol);
    return cg ? { ...cg, source: "Chainlink (via CoinGecko)" } : null;
  }

  try {
    // Call latestRoundData() on Chainlink aggregator via public Ethereum RPC
    const body = {
      jsonrpc: "2.0",
      method: "eth_call",
      params: [
        {
          to: feedAddress,
          // latestRoundData() selector = 0xfeaf968c
          data: "0xfeaf968c",
        },
        "latest",
      ],
      id: 1,
    };

    const res = await fetch("https://eth.llamarpc.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) throw new Error("RPC failed");
    const json = await res.json();
    const result: string = json.result;
    if (!result || result === "0x") throw new Error("empty result");

    // latestRoundData returns (uint80, int256, uint256, uint256, uint80)
    // answer is at bytes 32-64 (index 1, 32 bytes each)
    const answerHex = "0x" + result.slice(66, 130);
    const answer = BigInt(answerHex);
    // Chainlink ETH/USD uses 8 decimals
    const price = Number(answer) / 1e8;

    return { price, change24h: null, source: "Chainlink" };
  } catch {
    // Fallback to CoinGecko
    const cg = await fetchCoinGecko(symbol);
    return cg ? { ...cg, source: "Chainlink (via CoinGecko)" } : null;
  }
}

// ── Main fetch dispatcher ─────────────────────────────────────────────────────
async function fetchPrice(
  symbol: string,
  source: PriceSourceId,
): Promise<{
  price: number | null;
  change24h: number | null;
  source: string;
} | null> {
  try {
    switch (source) {
      case "coingecko":
        return await fetchCoinGecko(symbol);
      case "coinmarketcap":
        return await fetchCoinMarketCap(symbol);
      case "dexscreener":
        return await fetchDexScreener(symbol);
      case "jupiter":
        return await fetchJupiter(symbol);
      case "chainlink":
        return await fetchChainlink(symbol);
    }
  } catch {
    return null;
  }
}

function formatPrice(price: number): string {
  if (price >= 1000)
    return `$${price.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  if (price >= 1) return `$${price.toFixed(4)}`;
  if (price >= 0.0001) return `$${price.toFixed(6)}`;
  return `$${price.toExponential(4)}`;
}

// ── Component ─────────────────────────────────────────────────────────────────
export const PriceCheckNode = memo(({ data, selected, id }: NodeProps) => {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);

  const token = String(data.token ?? "ETH");
  const priceSource = (data.priceSource ?? "coingecko") as PriceSourceId;
  const customColor = data.customColor as string | undefined;
  const accent = customColor || "#2dd4bf";

  const [showMenu, setShowMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<"config" | "color">("config");
  const [price, setPrice] = useState<number | null>(null);
  const [change24h, setChange24h] = useState<number | null>(null);
  const [resolvedSource, setResolvedSource] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const update = (patch: Record<string, unknown>) => updateNodeData(id, patch);

  const doFetch = useCallback(async () => {
    if (!token.trim()) return;
    setLoading(true);
    setError(null);

    const result = await fetchPrice(token, priceSource);

    if (!result || result.price === null) {
      setError(
        `Not found on ${PRICE_SOURCES.find((s) => s.id === priceSource)?.label}`,
      );
      setPrice(null);
      setChange24h(null);
    } else {
      setPrice(result.price);
      setChange24h(result.change24h);
      setResolvedSource(result.source);
      setError(null);
      setLastFetched(new Date().toLocaleTimeString());
    }

    setLoading(false);
  }, [token, priceSource]);

  useEffect(() => {
    const t = setTimeout(doFetch, 500);
    return () => clearTimeout(t);
  }, [doFetch]);

  useEffect(() => {
    intervalRef.current = setInterval(doFetch, 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [doFetch]);

  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Element))
        setShowMenu(false);
    };
    document.addEventListener("mousedown", handler, true);
    return () => document.removeEventListener("mousedown", handler, true);
  }, [showMenu]);

  useEffect(() => {
    const close = () => setShowMenu(false);
    window.addEventListener("closeColorMenus", close);
    return () => window.removeEventListener("closeColorMenus", close);
  }, []);

  const isPositive = change24h !== null && change24h >= 0;
  const sourceLabel =
    PRICE_SOURCES.find((s) => s.id === priceSource)?.label ?? priceSource;

  return (
    <div
      className={`relative min-w-[240px] rounded-2xl overflow-visible transition-all duration-200 ${
        selected ? "ring-2 shadow-2xl" : "ring-1 hover:ring-opacity-50"
      }`}
      style={{
        borderColor: selected ? accent : `${accent}44`,
        boxShadow: selected
          ? `0 0 0 1px ${accent}22, 0 20px 40px -8px ${accent}40`
          : `0 4px 12px -2px ${accent}18`,
        background: "rgba(8, 12, 24, 0.97)",
      }}
    >
      {/* Three-dot menu */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowMenu((v) => !v);
        }}
        className="absolute top-2.5 right-2.5 z-10 w-6 h-6 rounded-md flex items-center justify-center
          bg-white/5 hover:bg-white/10 backdrop-blur-sm transition-all cursor-pointer border border-white/10"
      >
        <MoreVertical className="w-3 h-3 text-white/60" />
      </button>

      {/* Popover */}
      {showMenu && (
        <div
          ref={menuRef}
          className="absolute top-0 left-[calc(100%+10px)] z-[100] w-56 rounded-xl overflow-hidden shadow-2xl"
          style={{
            background: "rgba(10, 15, 30, 0.98)",
            border: "1px solid rgba(148,163,184,0.15)",
            backdropFilter: "blur(24px)",
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Tabs */}
          <div className="flex border-b border-white/10">
            {(["config", "color"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 text-[9px] font-mono font-bold tracking-widest uppercase transition-all cursor-pointer ${
                  activeTab === tab
                    ? "text-cyan-400 border-b-2 border-cyan-400 -mb-[1px]"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="p-3 space-y-3">
            {activeTab === "config" ? (
              <>
                {/* Token */}
                <div>
                  <div className="text-[8px] font-mono font-bold tracking-widest text-slate-500 uppercase mb-1.5">
                    Token Symbol
                  </div>
                  <input
                    type="text"
                    value={token}
                    onChange={(e) =>
                      update({ token: e.target.value.toUpperCase() })
                    }
                    placeholder="ETH, SOL, PEPE, WIF..."
                    className="w-full h-7 px-2 bg-slate-900/80 border border-slate-700 rounded-lg
                      text-[10px] font-mono text-cyan-100 focus:border-cyan-500 focus:outline-none
                      placeholder:text-slate-600"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {POPULAR_TOKENS.map((t) => (
                      <button
                        key={t}
                        onClick={() => update({ token: t })}
                        className="px-1.5 py-0.5 rounded text-[7px] font-mono font-bold cursor-pointer transition-all"
                        style={
                          token === t
                            ? {
                                background: `${accent}22`,
                                color: accent,
                                border: `1px solid ${accent}55`,
                              }
                            : {
                                background: "rgba(255,255,255,0.04)",
                                color: "rgba(148,163,184,0.5)",
                                border: "1px solid rgba(51,65,85,0.8)",
                              }
                        }
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price source — pill buttons, no dropdown */}
                <div>
                  <div className="text-[8px] font-mono font-bold tracking-widest text-slate-500 uppercase mb-1.5">
                    Price Source
                  </div>
                  <div className="flex flex-col gap-1">
                    {PRICE_SOURCES.map((src) => (
                      <button
                        key={src.id}
                        onClick={() => update({ priceSource: src.id })}
                        className="w-full px-2.5 py-1.5 rounded-lg text-[9px] font-mono font-bold
                          tracking-wider cursor-pointer transition-all text-left"
                        style={
                          priceSource === src.id
                            ? {
                                background: `${accent}22`,
                                color: accent,
                                border: `1px solid ${accent}55`,
                              }
                            : {
                                background: "rgba(255,255,255,0.03)",
                                color: "rgba(148,163,184,0.5)",
                                border: "1px solid rgba(51,65,85,0.8)",
                              }
                        }
                      >
                        {src.label}
                      </button>
                    ))}
                  </div>
                  <div className="text-[8px] font-mono text-slate-600 mt-1.5 leading-relaxed">
                    // jupiter = solana tokens only{"\n"}// chainlink = on-chain
                    oracles
                  </div>
                </div>

                <button
                  onClick={doFetch}
                  disabled={loading}
                  className="w-full py-1.5 rounded-lg text-[8px] font-mono font-bold uppercase tracking-widest
                    border border-slate-700 hover:border-cyan-500/50 text-slate-400 hover:text-cyan-400
                    transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-40"
                >
                  <RefreshCw
                    className={`w-2.5 h-2.5 ${loading ? "animate-spin" : ""}`}
                  />
                  {loading ? "Fetching..." : "Refresh Now"}
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={accent}
                    onChange={(e) => update({ customColor: e.target.value })}
                    className="w-9 h-9 rounded-lg border-2 border-slate-600 cursor-pointer"
                    style={{ backgroundColor: accent }}
                  />
                  <input
                    type="text"
                    value={accent.toUpperCase()}
                    onChange={(e) => {
                      if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value))
                        update({ customColor: e.target.value });
                    }}
                    className="flex-1 h-8 px-2 bg-slate-900/80 border border-slate-700 rounded-lg
                      text-[10px] font-mono text-cyan-100 focus:border-cyan-500 focus:outline-none"
                    maxLength={7}
                  />
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => update({ customColor: c })}
                      className={`w-full aspect-square rounded-md border-2 transition-all hover:scale-110 cursor-pointer ${
                        accent === c
                          ? "border-white scale-105"
                          : "border-white/10"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                {customColor && (
                  <button
                    onClick={() => {
                      update({ customColor: undefined });
                      setShowMenu(false);
                    }}
                    className="w-full py-1.5 text-[8px] font-mono text-slate-400 hover:text-cyan-400
                      border border-slate-700 hover:border-cyan-500/50 rounded-lg transition-all cursor-pointer"
                  >
                    RESET TO DEFAULT
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div
        className="px-3 pt-3 pb-2.5 rounded-t-2xl select-none"
        style={{
          background: `linear-gradient(135deg, ${accent}28 0%, ${accent}10 100%)`,
          borderBottom: `1px solid ${accent}22`,
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: `${accent}22`,
              border: `1px solid ${accent}44`,
            }}
          >
            <TrendingUp className="w-4 h-4" style={{ color: accent }} />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white tracking-wide">
                Price Check
              </span>
              <span
                className="px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-widest"
                style={{ background: `${accent}22`, color: accent }}
              >
                {token}
              </span>
            </div>
            <span className="text-[9px] font-mono text-slate-500 truncate mt-0.5">
              {resolvedSource ?? sourceLabel} · 30s refresh
            </span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-3 py-2.5 rounded-b-2xl select-none">
        <div
          className="rounded-xl p-2.5 mb-2"
          style={{
            background: error
              ? "rgba(239,68,68,0.06)"
              : price !== null
                ? `${accent}08`
                : "rgba(255,255,255,0.02)",
            border: `1px solid ${error ? "rgba(239,68,68,0.2)" : price !== null ? `${accent}22` : "rgba(255,255,255,0.06)"}`,
          }}
        >
          {loading && price === null ? (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full border border-slate-600 border-t-cyan-400 animate-spin" />
              <span className="text-[10px] font-mono text-slate-500">
                Fetching from {sourceLabel}...
              </span>
            </div>
          ) : error ? (
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-3 h-3 text-red-400 flex-shrink-0" />
              <span className="text-[10px] font-mono text-red-400 leading-tight">
                {error}
              </span>
            </div>
          ) : price !== null ? (
            <div className="flex items-center justify-between">
              <span
                className="text-lg font-bold font-mono tracking-tight"
                style={{ color: accent }}
              >
                {formatPrice(price)}
              </span>
              {change24h !== null && (
                <span
                  className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded"
                  style={{
                    color: isPositive ? "#22c55e" : "#ef4444",
                    background: isPositive
                      ? "rgba(34,197,94,0.1)"
                      : "rgba(239,68,68,0.1)",
                  }}
                >
                  {isPositive ? "+" : ""}
                  {change24h.toFixed(2)}%
                </span>
              )}
            </div>
          ) : (
            <span className="text-[10px] font-mono text-slate-600">
              Enter a token symbol
            </span>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between pt-2"
          style={{ borderTop: `1px solid ${accent}18` }}
        >
          <div className="flex items-center gap-1.5">
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: error
                  ? "#ef4444"
                  : price !== null
                    ? accent
                    : "#475569",
                boxShadow:
                  !error && price !== null ? `0 0 4px ${accent}` : "none",
              }}
            />
            <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest">
              {loading
                ? "fetching..."
                : lastFetched
                  ? `updated ${lastFetched}`
                  : "waiting"}
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              doFetch();
            }}
            disabled={loading}
            className="text-slate-600 hover:text-cyan-400 transition-colors cursor-pointer disabled:opacity-30"
          >
            <RefreshCw
              className={`w-2.5 h-2.5 ${loading ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !rounded-full"
        style={{
          background: accent,
          border: `2px solid ${accent}88`,
          boxShadow: `0 0 6px ${accent}66`,
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !rounded-full"
        style={{
          background: accent,
          border: `2px solid ${accent}88`,
          boxShadow: `0 0 6px ${accent}66`,
        }}
      />
    </div>
  );
});

PriceCheckNode.displayName = "PriceCheckNode";
