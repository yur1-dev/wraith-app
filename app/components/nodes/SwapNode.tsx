"use client";

import { memo, useState, useEffect, useRef, useCallback } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  ArrowLeftRight,
  MoreVertical,
  RefreshCw,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Zap,
  TrendingDown,
  ChevronDown,
} from "lucide-react";
import { useFlowStore } from "@/lib/hooks/useFlowStore";

// ── Token lists ───────────────────────────────────────────────────────────────

const TOKENS_BY_CHAIN: Record<string, string[]> = {
  solana: [
    "SOL",
    "USDC",
    "USDT",
    "BONK",
    "JTO",
    "WIF",
    "JUP",
    "PYTH",
    "RAY",
    "ORCA",
  ],
  ethereum: ["ETH", "USDC", "USDT", "WBTC", "DAI", "WETH"],
  arbitrum: ["ETH", "USDC", "USDT", "ARB", "WBTC", "GMX"],
  base: ["ETH", "USDC", "WETH", "cbETH"],
  optimism: ["ETH", "USDC", "USDT", "WBTC", "DAI"],
  polygon: ["MATIC", "USDC", "USDT", "WBTC", "DAI"],
};

const CHAINS = [
  "solana",
  "ethereum",
  "arbitrum",
  "base",
  "optimism",
  "polygon",
];

const DEX_BY_CHAIN: Record<string, string[]> = {
  solana: ["Jupiter", "Orca", "Raydium"],
  ethereum: ["1inch", "Paraswap", "Uniswap"],
  arbitrum: ["1inch", "Paraswap", "Camelot"],
  base: ["1inch", "Paraswap", "Aerodrome"],
  optimism: ["1inch", "Paraswap", "Velodrome"],
  polygon: ["1inch", "Paraswap", "QuickSwap"],
};

const TOKEN_COLORS: Record<string, string> = {
  SOL: "#9945FF",
  ETH: "#627EEA",
  USDC: "#2775CA",
  USDT: "#26A17B",
  WBTC: "#F7931A",
  ARB: "#28A0F0",
  MATIC: "#8247E5",
  JUP: "#C7F284",
  BONK: "#F5A623",
  WIF: "#E8823A",
  JTO: "#4ECDC4",
  PYTH: "#E6007A",
  RAY: "#4A90D9",
  ORCA: "#00C2FF",
  GMX: "#00AFFA",
  DAI: "#F5AC37",
  WETH: "#627EEA",
  cbETH: "#627EEA",
};

const SLIPPAGE_PRESETS = [0.1, 0.5, 1.0, 3.0];

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

// ── Types ─────────────────────────────────────────────────────────────────────

interface SwapQuote {
  dex: string;
  chain: string;
  fromToken: string;
  toToken: string;
  inAmount: number;
  outAmount: number;
  rate: number;
  priceImpact: number | null;
  slippage: number;
  minReceived: number;
  route: string;
  fee: number | null;
  gas?: number | null;
  cached?: boolean;
  isEstimate?: boolean;
}

// ── Token badge ───────────────────────────────────────────────────────────────

function TokenBadge({
  token,
  size = "sm",
}: {
  token: string;
  size?: "sm" | "lg";
}) {
  const color = TOKEN_COLORS[token] ?? "#64748b";
  const isLg = size === "lg";
  return (
    <div
      className={`flex items-center gap-1 rounded-md font-mono font-bold ${isLg ? "px-2 py-1 text-[11px]" : "px-1.5 py-0.5 text-[9px]"}`}
      style={{
        background: `${color}22`,
        border: `1px solid ${color}44`,
        color,
      }}
    >
      {token}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export const SwapNode = memo(({ data, selected, id }: NodeProps) => {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);

  const chain = String(data.chain ?? "solana");
  const fromToken = String(data.fromToken ?? "SOL").toUpperCase();
  const toToken = String(data.toToken ?? "USDC").toUpperCase();
  const amount = String(data.amount ?? "1");
  const slippage = parseFloat(String(data.slippage ?? "0.5"));
  const dex = String(data.dex ?? "auto");
  const customColor = data.customColor as string | undefined;
  const accent = customColor ?? "#3b82f6";

  const [tab, setTab] = useState<"config" | "color">("config");
  const [showPopover, setShowPopover] = useState(false);
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [tokenDropdown, setTokenDropdown] = useState<"from" | "to" | null>(
    null,
  );

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const amountRef = useRef(amount);
  const chainRef = useRef(chain);
  const fromRef = useRef(fromToken);
  const toRef = useRef(toToken);
  const slippageRef = useRef(slippage);
  const dexRef = useRef(dex);

  amountRef.current = amount;
  chainRef.current = chain;
  fromRef.current = fromToken;
  toRef.current = toToken;
  slippageRef.current = slippage;
  dexRef.current = dex;

  const update = (field: string, val: unknown) =>
    updateNodeData(id, { [field]: val });

  const fetchQuote = useCallback(async () => {
    const amt = parseFloat(amountRef.current);
    if (isNaN(amt) || amt <= 0) return;
    if (fromRef.current === toRef.current) return;

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        fromToken: fromRef.current.toUpperCase(),
        toToken: toRef.current.toUpperCase(),
        amount: String(amt),
        slippage: String(slippageRef.current),
        chain: chainRef.current,
        dex: dexRef.current,
      });
      const res = await fetch(`/api/swap-quote?${params}`);
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setQuote(null);
      } else {
        setQuote(data);
        setLastUpdated(new Date().toLocaleTimeString());
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch quote");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchQuote();
    intervalRef.current = setInterval(fetchQuote, 15_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchQuote]);

  // Re-fetch when key params change
  // Debounced re-fetch when params change — prevents keystroke spam from properties panel
  useEffect(() => {
    // Only fetch if tokens are valid known tokens (not mid-typing partial strings)
    const validTokens = TOKENS_BY_CHAIN[chain] ?? TOKENS_BY_CHAIN.solana;
    if (!validTokens.includes(fromToken) || !validTokens.includes(toToken))
      return;
    if (fromToken === toToken) return;

    if (intervalRef.current) clearInterval(intervalRef.current);
    const debounce = setTimeout(() => {
      fetchQuote();
      intervalRef.current = setInterval(fetchQuote, 15_000);
    }, 400); // 400ms debounce
    return () => {
      clearTimeout(debounce);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [chain, fromToken, toToken, amount, slippage, dex, fetchQuote]);

  useEffect(() => {
    const close = () => setShowPopover(false);
    window.addEventListener("closeColorMenus", close);
    return () => window.removeEventListener("closeColorMenus", close);
  }, []);

  const priceImpactColor =
    quote?.priceImpact == null
      ? accent
      : quote.priceImpact < 1
        ? "#34d399"
        : quote.priceImpact < 3
          ? "#fbbf24"
          : "#f87171";

  const tokens = TOKENS_BY_CHAIN[chain] ?? TOKENS_BY_CHAIN.solana;
  const dexOptions = ["auto", ...(DEX_BY_CHAIN[chain] ?? [])];

  return (
    <div
      className="relative min-w-[270px] rounded-xl transition-all duration-200"
      style={{
        background: "rgba(2, 6, 23, 0.92)",
        border: selected
          ? `1px solid ${accent}`
          : "1px solid rgba(51,65,85,0.4)",
        boxShadow: selected
          ? `0 20px 25px -5px ${accent}50, 0 8px 10px -6px ${accent}50`
          : undefined,
        backdropFilter: "blur(20px)",
      }}
    >
      {/* Header */}
      <div
        className="px-3 py-2.5 rounded-t-xl flex items-center justify-between select-none"
        style={{
          background: `linear-gradient(135deg, ${accent}22, ${accent}0a)`,
          borderBottom: `1px solid ${accent}22`,
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{
              background: `${accent}22`,
              border: `1px solid ${accent}44`,
            }}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" style={{ color: accent }} />
          </div>
          <div>
            <div className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase">
              Swap
            </div>
            <div className="text-[9px] font-mono text-slate-600 capitalize flex items-center gap-1">
              {chain} · {dex === "auto" ? "Best Route" : dex}
              {quote?.isEstimate && (
                <span
                  className="text-[8px] font-mono px-1 rounded"
                  style={{
                    background: "#f59e0b22",
                    color: "#f59e0b",
                    border: "1px solid #f59e0b44",
                  }}
                >
                  EST
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowPopover((p) => !p);
          }}
          className="w-6 h-6 rounded flex items-center justify-center cursor-pointer"
          style={{
            background: showPopover ? `${accent}22` : "transparent",
            border: `1px solid ${showPopover ? accent + "44" : "transparent"}`,
          }}
        >
          <MoreVertical className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>

      <div
        className="h-px w-full"
        style={{
          background: `linear-gradient(90deg, ${accent}80, transparent 60%)`,
        }}
      />

      {/* Body */}
      <div className="px-3 py-3 space-y-2 select-none">
        {/* Token pair display */}
        <div
          className="rounded-lg px-3 py-2.5 flex items-center justify-between"
          style={{
            background: "rgba(15,23,42,0.6)",
            border: `1px solid ${accent}22`,
          }}
        >
          <div className="space-y-0.5">
            <div className="text-[8px] font-mono text-slate-600 uppercase tracking-widest">
              You pay
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-mono font-bold text-white">
                {amount}
              </span>
              <TokenBadge token={fromToken} />
            </div>
          </div>

          <div className="flex flex-col items-center gap-0.5">
            <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
            {loading && (
              <Loader2
                className="w-2.5 h-2.5 animate-spin"
                style={{ color: accent }}
              />
            )}
          </div>

          <div className="space-y-0.5 text-right">
            <div className="text-[8px] font-mono text-slate-600 uppercase tracking-widest">
              You receive
            </div>
            <div className="flex items-center gap-1.5 justify-end">
              {quote ? (
                <span
                  className="text-sm font-mono font-bold"
                  style={{ color: accent }}
                >
                  {quote.outAmount.toFixed(
                    toToken === "USDC" || toToken === "USDT" ? 2 : 4,
                  )}
                </span>
              ) : (
                <span className="text-sm font-mono font-bold text-slate-600">
                  —
                </span>
              )}
              <TokenBadge token={toToken} />
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            className="rounded-lg px-3 py-1.5 flex items-center gap-2"
            style={{
              background: "rgba(248,113,113,0.06)",
              border: "1px solid rgba(248,113,113,0.2)",
            }}
          >
            <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />
            <span className="text-[9px] font-mono text-red-400">{error}</span>
          </div>
        )}

        {/* Quote details */}
        {quote && (
          <div
            className="rounded-lg px-3 py-2 space-y-1.5"
            style={{
              background: "rgba(15,23,42,0.4)",
              border: "1px solid rgba(51,65,85,0.3)",
            }}
          >
            <div className="flex justify-between items-center">
              <span className="text-[8px] font-mono text-slate-600">Rate</span>
              <span className="text-[9px] font-mono text-slate-300">
                1 {fromToken} = {quote.rate.toFixed(4)} {toToken}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[8px] font-mono text-slate-600">
                Min received
              </span>
              <span className="text-[9px] font-mono text-slate-300">
                {quote.minReceived.toFixed(4)} {toToken}
              </span>
            </div>
            {quote.priceImpact !== null && (
              <div className="flex justify-between items-center">
                <span className="text-[8px] font-mono text-slate-600 flex items-center gap-1">
                  <TrendingDown className="w-2.5 h-2.5" /> Price impact
                </span>
                <span
                  className="text-[9px] font-mono font-bold"
                  style={{ color: priceImpactColor }}
                >
                  {quote.priceImpact < 0.01
                    ? "<0.01"
                    : quote.priceImpact.toFixed(2)}
                  %
                </span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-[8px] font-mono text-slate-600">Route</span>
              <span className="text-[9px] font-mono text-slate-400 max-w-[120px] truncate text-right">
                {quote.route}
              </span>
            </div>
            {quote.gas && (
              <div className="flex justify-between items-center">
                <span className="text-[8px] font-mono text-slate-600">
                  Est. gas
                </span>
                <span className="text-[9px] font-mono text-slate-400">
                  {quote.gas.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Status bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {quote && !error && (
              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
            )}
            <span className="text-[8px] font-mono text-slate-700">
              {lastUpdated
                ? `updated ${lastUpdated} · every 15s`
                : "fetching..."}
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              fetchQuote();
            }}
            className="w-5 h-5 rounded flex items-center justify-center cursor-pointer"
            style={{
              background: `${accent}15`,
              border: `1px solid ${accent}33`,
            }}
          >
            <RefreshCw className="w-2.5 h-2.5" style={{ color: accent }} />
          </button>
        </div>
      </div>

      {/* Popover */}
      {showPopover && (
        <>
          <div
            className="fixed inset-0 z-[90]"
            onClick={() => setShowPopover(false)}
          />
          <div
            className="absolute top-0 left-[calc(100%+10px)] z-[100] w-64 rounded-xl overflow-hidden shadow-2xl"
            style={{
              background: "rgba(2,6,23,0.98)",
              border: `1px solid ${accent}33`,
              boxShadow: `0 25px 50px rgba(0,0,0,0.8), 0 0 24px ${accent}15`,
              backdropFilter: "blur(24px)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="h-px w-full"
              style={{
                background: `linear-gradient(90deg, ${accent}80, transparent 60%)`,
              }}
            />

            {/* Tabs */}
            <div
              className="flex border-b"
              style={{ borderColor: `${accent}15` }}
            >
              {(["config", "color"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className="flex-1 py-2 text-[9px] font-mono font-bold uppercase tracking-widest cursor-pointer transition-all"
                  style={
                    tab === t
                      ? { color: accent, borderBottom: `1px solid ${accent}` }
                      : { color: "rgba(100,116,139,0.6)" }
                  }
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="p-3 space-y-3 max-h-[480px] overflow-y-auto">
              {tab === "config" && (
                <>
                  {/* Chain */}
                  <div className="space-y-1.5">
                    <div className="text-[8px] font-mono font-bold tracking-widest text-slate-500 uppercase">
                      Chain
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {CHAINS.map((c) => (
                        <button
                          key={c}
                          onClick={() => {
                            update("chain", c);
                            const newTokens = TOKENS_BY_CHAIN[c] ?? [];
                            if (!newTokens.includes(fromToken))
                              update("fromToken", newTokens[0]);
                            if (!newTokens.includes(toToken))
                              update("toToken", newTokens[1] ?? newTokens[0]);
                          }}
                          className="py-1.5 rounded-lg text-[8px] font-mono font-bold capitalize tracking-wider cursor-pointer transition-all"
                          style={
                            chain === c
                              ? {
                                  background: `${accent}22`,
                                  color: accent,
                                  border: `1px solid ${accent}55`,
                                }
                              : {
                                  background: "rgba(255,255,255,0.02)",
                                  color: "rgba(148,163,184,0.5)",
                                  border: "1px solid rgba(51,65,85,0.8)",
                                }
                          }
                        >
                          {c === "ethereum"
                            ? "ETH"
                            : c === "arbitrum"
                              ? "ARB"
                              : c === "optimism"
                                ? "OP"
                                : c.slice(0, 4)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* From token */}
                  <div className="space-y-1.5">
                    <div className="text-[8px] font-mono font-bold tracking-widest text-slate-500 uppercase">
                      From Token
                    </div>
                    <div className="relative">
                      <button
                        onClick={() =>
                          setTokenDropdown(
                            tokenDropdown === "from" ? null : "from",
                          )
                        }
                        className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer"
                        style={{
                          background: "rgba(2,6,23,0.9)",
                          border: `1px solid ${tokenDropdown === "from" ? accent + "55" : "rgba(51,65,85,0.8)"}`,
                        }}
                      >
                        <TokenBadge token={fromToken} size="sm" />
                        <ChevronDown className="w-3 h-3 text-slate-500" />
                      </button>
                      {tokenDropdown === "from" && (
                        <div
                          className="absolute top-[calc(100%+4px)] left-0 right-0 rounded-lg overflow-hidden z-10"
                          style={{
                            background: "rgba(2,6,23,0.98)",
                            border: `1px solid ${accent}33`,
                          }}
                        >
                          {tokens
                            .filter((t) => t !== toToken)
                            .map((t) => (
                              <button
                                key={t}
                                onClick={() => {
                                  update("fromToken", t);
                                  setTokenDropdown(null);
                                }}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-white/5 cursor-pointer transition-all"
                              >
                                <TokenBadge token={t} size="sm" />
                                <span className="text-[9px] font-mono text-slate-400">
                                  {t}
                                </span>
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* To token */}
                  <div className="space-y-1.5">
                    <div className="text-[8px] font-mono font-bold tracking-widest text-slate-500 uppercase">
                      To Token
                    </div>
                    <div className="relative">
                      <button
                        onClick={() =>
                          setTokenDropdown(tokenDropdown === "to" ? null : "to")
                        }
                        className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer"
                        style={{
                          background: "rgba(2,6,23,0.9)",
                          border: `1px solid ${tokenDropdown === "to" ? accent + "55" : "rgba(51,65,85,0.8)"}`,
                        }}
                      >
                        <TokenBadge token={toToken} size="sm" />
                        <ChevronDown className="w-3 h-3 text-slate-500" />
                      </button>
                      {tokenDropdown === "to" && (
                        <div
                          className="absolute top-[calc(100%+4px)] left-0 right-0 rounded-lg overflow-hidden z-10"
                          style={{
                            background: "rgba(2,6,23,0.98)",
                            border: `1px solid ${accent}33`,
                          }}
                        >
                          {tokens
                            .filter((t) => t !== fromToken)
                            .map((t) => (
                              <button
                                key={t}
                                onClick={() => {
                                  update("toToken", t);
                                  setTokenDropdown(null);
                                }}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-white/5 cursor-pointer transition-all"
                              >
                                <TokenBadge token={t} size="sm" />
                                <span className="text-[9px] font-mono text-slate-400">
                                  {t}
                                </span>
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Swap button */}
                  <button
                    onClick={() => {
                      update("fromToken", toToken);
                      update("toToken", fromToken);
                    }}
                    className="w-full py-1.5 rounded-lg text-[8px] font-mono uppercase tracking-widest cursor-pointer flex items-center justify-center gap-1.5"
                    style={{
                      background: `${accent}10`,
                      border: `1px solid ${accent}22`,
                      color: accent,
                    }}
                  >
                    <ArrowLeftRight className="w-3 h-3" /> Flip tokens
                  </button>

                  {/* Amount */}
                  <div className="space-y-1.5">
                    <div className="text-[8px] font-mono font-bold tracking-widest text-slate-500 uppercase">
                      Amount ({fromToken})
                    </div>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={String(data.amount ?? "1")}
                      onChange={(e) => {
                        if (/^\d*\.?\d*$/.test(e.target.value))
                          update("amount", e.target.value);
                      }}
                      placeholder="1"
                      className="w-full h-7 px-2 rounded-md text-[10px] font-mono text-cyan-100 focus:outline-none"
                      style={{
                        background: "rgba(2,6,23,0.9)",
                        border: "1px solid rgba(51,65,85,0.8)",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = accent)}
                      onBlur={(e) =>
                        (e.target.style.borderColor = "rgba(51,65,85,0.8)")
                      }
                    />
                  </div>

                  {/* Slippage */}
                  <div className="space-y-1.5">
                    <div className="text-[8px] font-mono font-bold tracking-widest text-slate-500 uppercase">
                      Slippage Tolerance
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {SLIPPAGE_PRESETS.map((s) => (
                        <button
                          key={s}
                          onClick={() => update("slippage", s)}
                          className="py-1.5 rounded-lg text-[8px] font-mono font-bold tracking-wider cursor-pointer transition-all"
                          style={
                            slippage === s
                              ? {
                                  background: `${accent}22`,
                                  color: accent,
                                  border: `1px solid ${accent}55`,
                                }
                              : {
                                  background: "rgba(255,255,255,0.02)",
                                  color: "rgba(148,163,184,0.5)",
                                  border: "1px solid rgba(51,65,85,0.8)",
                                }
                          }
                        >
                          {s}%
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* DEX */}
                  <div className="space-y-1.5">
                    <div className="text-[8px] font-mono font-bold tracking-widest text-slate-500 uppercase">
                      DEX / Aggregator
                    </div>
                    <div className="space-y-1">
                      {dexOptions.map((d) => (
                        <button
                          key={d}
                          onClick={() => update("dex", d)}
                          className="w-full py-1.5 px-2.5 rounded-lg text-left cursor-pointer transition-all"
                          style={
                            dex === d
                              ? {
                                  background: `${accent}18`,
                                  border: `1px solid ${accent}44`,
                                }
                              : {
                                  background: "rgba(255,255,255,0.02)",
                                  border: "1px solid rgba(51,65,85,0.6)",
                                }
                          }
                        >
                          <span
                            className="text-[9px] font-mono font-bold"
                            style={{
                              color:
                                dex === d ? accent : "rgba(148,163,184,0.6)",
                            }}
                          >
                            {d === "auto" ? "Auto (Best Route)" : d}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Refresh */}
                  <button
                    onClick={fetchQuote}
                    className="w-full h-7 rounded-lg flex items-center justify-center gap-1.5 text-[8px] font-mono font-bold uppercase tracking-widest cursor-pointer"
                    style={{
                      background: `${accent}15`,
                      border: `1px solid ${accent}33`,
                      color: accent,
                    }}
                  >
                    <Zap className="w-2.5 h-2.5" /> Refresh Quote
                  </button>
                </>
              )}

              {tab === "color" && (
                <>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={accent}
                      onChange={(e) => update("customColor", e.target.value)}
                      className="w-10 h-10 rounded border-2 cursor-pointer"
                      style={{
                        borderColor: `${accent}66`,
                        backgroundColor: accent,
                      }}
                    />
                    <input
                      type="text"
                      value={accent.toUpperCase()}
                      onChange={(e) => {
                        if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value))
                          update("customColor", e.target.value);
                      }}
                      className="flex-1 h-8 px-2 rounded text-[10px] font-mono text-cyan-100 focus:outline-none"
                      style={{
                        background: "rgba(2,6,23,0.9)",
                        border: "1px solid rgba(51,65,85,0.8)",
                      }}
                      maxLength={7}
                    />
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => update("customColor", c)}
                        className="aspect-square rounded border-2 transition-all hover:scale-110 cursor-pointer"
                        style={{
                          backgroundColor: c,
                          borderColor:
                            accent === c ? "white" : "rgba(51,65,85,0.5)",
                        }}
                      />
                    ))}
                  </div>
                  {customColor && (
                    <button
                      onClick={() => update("customColor", undefined)}
                      className="w-full py-1.5 text-[8px] font-mono uppercase tracking-widest rounded border cursor-pointer"
                      style={{
                        color: "rgba(148,163,184,0.6)",
                        borderColor: "rgba(51,65,85,0.5)",
                      }}
                    >
                      Reset
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}

      <Handle
        type="target"
        position={Position.Top}
        id="input"
        className="!w-3 !h-3 !border-2"
        style={{ background: accent, borderColor: `${accent}cc` }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="output"
        className="!w-3 !h-3 !border-2"
        style={{ background: accent, borderColor: `${accent}cc` }}
      />
    </div>
  );
});

SwapNode.displayName = "SwapNode";
