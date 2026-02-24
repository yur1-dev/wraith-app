"use client";

import { memo, useState, useEffect, useRef, useCallback } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  Shuffle,
  MoreVertical,
  ArrowRight,
  Loader2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Zap,
} from "lucide-react";
import { useFlowStore } from "@/lib/hooks/useFlowStore";

// ── Supported chains per protocol (must match route.ts) ───────────────────────

const PROTOCOL_CHAINS: Record<string, string[]> = {
  Across: [
    "Ethereum",
    "Arbitrum",
    "Optimism",
    "Polygon",
    "Base",
    "Linea",
    "zkSync",
  ],
  Hop: ["Ethereum", "Arbitrum", "Optimism", "Polygon", "Base"],
  Synapse: [
    "Ethereum",
    "Arbitrum",
    "Optimism",
    "Polygon",
    "Base",
    "Avalanche",
    "BSC",
  ],
};

const BRIDGE_PROTOCOLS = {
  Across: {
    color: "#34d399",
    label: "Across",
    desc: "Optimistic bridge",
  },
  Hop: {
    color: "#f472b6",
    label: "Hop",
    desc: "Rollup-to-rollup",
  },
  Synapse: {
    color: "#818cf8",
    label: "Synapse",
    desc: "Cross-chain AMM",
  },
} as const;

type BridgeProtocol = keyof typeof BRIDGE_PROTOCOLS;

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

interface BridgeQuote {
  protocol: string;
  estimatedFeeUsd: number;
  minReceived: number;
  estimatedTime: number;
  isEstimate?: boolean;
  bonderFee?: number;
  lpFee?: number;
  bridgeFee?: number;
  module?: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function fetchBridgeQuote(
  protocol: BridgeProtocol,
  fromChain: string,
  toChain: string,
  amountUsd: number,
): Promise<BridgeQuote> {
  const params = new URLSearchParams({
    protocol,
    fromChain,
    toChain,
    amountUsd: amountUsd.toString(),
  });
  const res = await fetch(`/api/bridge-quote?${params}`, {
    signal: AbortSignal.timeout(12000),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data as BridgeQuote;
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `~${seconds}s`;
  return `~${Math.round(seconds / 60)}m`;
}

function clampChain(chain: string, supported: string[]): string {
  return supported.includes(chain) ? chain : supported[0];
}

// ── Component ─────────────────────────────────────────────────────────────────

export const BridgeNode = memo(({ data, selected, id }: NodeProps) => {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);

  const bridgeProtocol = (data.bridgeProtocol as BridgeProtocol) ?? "Across";
  const supportedChains =
    PROTOCOL_CHAINS[bridgeProtocol] ?? PROTOCOL_CHAINS.Across;

  const fromChain = String(data.fromChain ?? supportedChains[0]);
  const toChain = String(data.toChain ?? supportedChains[1]);
  const amountUsd = parseFloat(String(data.amountUsd ?? "100"));
  const autoRefresh = data.autoRefresh !== false;
  const customColor = data.customColor as string | undefined;

  const protocolCfg =
    BRIDGE_PROTOCOLS[bridgeProtocol] ?? BRIDGE_PROTOCOLS.Across;
  const accent = customColor ?? protocolCfg.color;

  const [tab, setTab] = useState<"config" | "color">("config");
  const [showPopover, setShowPopover] = useState(false);
  const [quote, setQuote] = useState<BridgeQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const update = (field: string, val: unknown) =>
    updateNodeData(id, { [field]: val });

  const refresh = useCallback(async () => {
    if (fromChain === toChain) {
      setError("Source and destination chains must differ");
      setQuote(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await fetchBridgeQuote(
        bridgeProtocol,
        fromChain,
        toChain,
        amountUsd,
      );
      setQuote(result);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Quote fetch failed");
      setQuote(null);
    }
    setLoading(false);
  }, [bridgeProtocol, fromChain, toChain, amountUsd]);

  useEffect(() => {
    refresh();
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (autoRefresh) intervalRef.current = setInterval(refresh, 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refresh, autoRefresh]);

  // When protocol changes, clamp chains to supported ones
  useEffect(() => {
    const chains = PROTOCOL_CHAINS[bridgeProtocol] ?? [];
    const newFrom = clampChain(fromChain, chains);
    const newTo = clampChain(toChain, chains);
    const safeTo = newFrom === newTo ? (chains[1] ?? chains[0]) : newTo;
    if (newFrom !== fromChain) update("fromChain", newFrom);
    if (safeTo !== toChain) update("toChain", safeTo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bridgeProtocol]);

  useEffect(() => {
    const close = () => setShowPopover(false);
    window.addEventListener("closeColorMenus", close);
    return () => window.removeEventListener("closeColorMenus", close);
  }, []);

  const isReady = !!quote && !error && fromChain !== toChain;
  const statusColor = error ? "#f87171" : isReady ? "#34d399" : "#94a3b8";
  const statusLabel = error ? "error" : isReady ? "ready" : "loading";

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
      {/* ── Header ── */}
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
            <Shuffle className="w-3.5 h-3.5" style={{ color: accent }} />
          </div>
          <div>
            <div className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase">
              Bridge
            </div>
            <div className="text-[9px] font-mono text-slate-600">
              {protocolCfg.label} · {protocolCfg.desc}
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

      {/* ── Body ── */}
      <div className="px-3 py-3 space-y-2 select-none">
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

        {/* Route */}
        <div
          className="rounded-lg px-3 py-2.5"
          style={{
            background: "rgba(15,23,42,0.6)",
            border: `1px solid ${accent}22`,
          }}
        >
          <div className="text-[8px] font-mono text-slate-600 uppercase tracking-widest mb-2">
            Route
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 text-center">
              <div className="text-[7px] font-mono text-slate-600 uppercase tracking-widest mb-0.5">
                From
              </div>
              <div
                className="text-[11px] font-mono font-bold"
                style={{ color: accent }}
              >
                {fromChain}
              </div>
            </div>
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: `${accent}18`,
                border: `1px solid ${accent}33`,
              }}
            >
              <ArrowRight className="w-3 h-3" style={{ color: accent }} />
            </div>
            <div className="flex-1 text-center">
              <div className="text-[7px] font-mono text-slate-600 uppercase tracking-widest mb-0.5">
                To
              </div>
              <div
                className="text-[11px] font-mono font-bold"
                style={{ color: accent }}
              >
                {toChain}
              </div>
            </div>
          </div>
        </div>

        {/* Quote */}
        <div
          className="rounded-lg px-3 py-2"
          style={{
            background: "rgba(15,23,42,0.6)",
            border: `1px solid ${accent}22`,
          }}
        >
          <div className="text-[8px] font-mono text-slate-600 uppercase tracking-widest mb-2">
            Quote · ${amountUsd} USD
          </div>
          {loading && !quote ? (
            <Loader2
              className="w-3 h-3 animate-spin"
              style={{ color: accent }}
            />
          ) : quote ? (
            <>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ["Fee", `$${quote.estimatedFeeUsd}`],
                    ["Time", formatTime(quote.estimatedTime)],
                    ["Receive", `$${quote.minReceived}`],
                  ] as const
                ).map(([label, val]) => (
                  <div key={label} className="text-center">
                    <div className="text-[7px] font-mono text-slate-600 uppercase tracking-widest">
                      {label}
                    </div>
                    <div
                      className="text-[11px] font-mono font-bold"
                      style={{ color: accent }}
                    >
                      {val}
                    </div>
                  </div>
                ))}
              </div>
              {/* Fee breakdown for Hop / Synapse */}
              {(quote.bonderFee !== undefined ||
                quote.bridgeFee !== undefined) && (
                <div className="mt-2 space-y-0.5">
                  {quote.bonderFee !== undefined && (
                    <div className="text-[8px] font-mono text-slate-600">
                      bonder fee:{" "}
                      <span style={{ color: accent }}>${quote.bonderFee}</span>
                    </div>
                  )}
                  {quote.lpFee !== undefined && (
                    <div className="text-[8px] font-mono text-slate-600">
                      lp fee:{" "}
                      <span style={{ color: accent }}>${quote.lpFee}</span>
                    </div>
                  )}
                  {quote.bridgeFee !== undefined && (
                    <div className="text-[8px] font-mono text-slate-600">
                      bridge fee:{" "}
                      <span style={{ color: accent }}>${quote.bridgeFee}</span>
                    </div>
                  )}
                  {quote.module && (
                    <div className="text-[8px] font-mono text-slate-600">
                      module:{" "}
                      <span style={{ color: accent }}>{quote.module}</span>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            !error && (
              <div className="text-[9px] font-mono text-slate-600">
                Fetching quote…
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {isReady ? (
              <CheckCircle2
                className="w-3 h-3"
                style={{ color: statusColor }}
              />
            ) : error ? (
              <AlertTriangle
                className="w-3 h-3"
                style={{ color: statusColor }}
              />
            ) : (
              <Clock className="w-3 h-3" style={{ color: statusColor }} />
            )}
            <span
              className="text-[8px] font-mono font-bold uppercase tracking-widest"
              style={{ color: statusColor }}
            >
              {statusLabel}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[8px] font-mono text-slate-700">
              {lastUpdated
                ? `updated ${lastUpdated} · every 30s`
                : "fetching..."}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                refresh();
              }}
              className="w-5 h-5 rounded flex items-center justify-center cursor-pointer"
              style={{
                background: `${accent}15`,
                border: `1px solid ${accent}33`,
              }}
            >
              <RefreshCw
                className={`w-2.5 h-2.5 ${loading ? "animate-spin" : ""}`}
                style={{ color: accent }}
              />
            </button>
          </div>
        </div>
      </div>

      {/* ── Popover ── */}
      {showPopover && (
        <>
          <div
            className="fixed inset-0 z-[90]"
            onClick={() => setShowPopover(false)}
          />
          <div
            className="absolute top-0 left-[calc(100%+10px)] z-[100] w-60 rounded-xl overflow-hidden shadow-2xl"
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

            <div className="p-3 space-y-3">
              {tab === "config" && (
                <>
                  {/* Protocol */}
                  <div className="space-y-1.5">
                    <div className="text-[8px] font-mono font-bold tracking-widest text-slate-500 uppercase">
                      Protocol
                    </div>
                    <div className="space-y-1">
                      {(Object.keys(BRIDGE_PROTOCOLS) as BridgeProtocol[]).map(
                        (p) => {
                          const cfg = BRIDGE_PROTOCOLS[p];
                          const isActive = bridgeProtocol === p;
                          return (
                            <button
                              key={p}
                              onClick={() => update("bridgeProtocol", p)}
                              className="w-full py-2 px-2.5 rounded-lg text-left cursor-pointer transition-all"
                              style={
                                isActive
                                  ? {
                                      background: `${cfg.color}18`,
                                      border: `1px solid ${cfg.color}44`,
                                    }
                                  : {
                                      background: "rgba(255,255,255,0.02)",
                                      border: "1px solid rgba(51,65,85,0.6)",
                                    }
                              }
                            >
                              <div className="flex items-center gap-2">
                                <Zap
                                  className="w-3 h-3 shrink-0"
                                  style={{
                                    color: isActive
                                      ? cfg.color
                                      : "rgba(100,116,139,0.5)",
                                  }}
                                />
                                <div className="flex-1">
                                  <div
                                    className="text-[9px] font-mono font-bold"
                                    style={{
                                      color: isActive
                                        ? cfg.color
                                        : "rgba(148,163,184,0.6)",
                                    }}
                                  >
                                    {cfg.label}
                                  </div>
                                  <div className="text-[8px] font-mono text-slate-600">
                                    {cfg.desc}
                                  </div>
                                </div>
                              </div>
                            </button>
                          );
                        },
                      )}
                    </div>
                  </div>

                  {/* From Chain */}
                  <div className="space-y-1.5">
                    <div className="text-[8px] font-mono font-bold tracking-widest text-slate-500 uppercase">
                      From Chain
                    </div>
                    <select
                      value={fromChain}
                      onChange={(e) => update("fromChain", e.target.value)}
                      className="w-full h-7 px-2 rounded-md text-[10px] font-mono focus:outline-none cursor-pointer"
                      style={{
                        background: "rgba(2,6,23,0.9)",
                        border: "1px solid rgba(51,65,85,0.8)",
                        color: accent,
                      }}
                    >
                      {supportedChains.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* To Chain */}
                  <div className="space-y-1.5">
                    <div className="text-[8px] font-mono font-bold tracking-widest text-slate-500 uppercase">
                      To Chain
                    </div>
                    <select
                      value={toChain}
                      onChange={(e) => update("toChain", e.target.value)}
                      className="w-full h-7 px-2 rounded-md text-[10px] font-mono focus:outline-none cursor-pointer"
                      style={{
                        background: "rgba(2,6,23,0.9)",
                        border: "1px solid rgba(51,65,85,0.8)",
                        color: accent,
                      }}
                    >
                      {supportedChains
                        .filter((c) => c !== fromChain)
                        .map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Amount */}
                  <div className="space-y-1.5">
                    <div className="text-[8px] font-mono font-bold tracking-widest text-slate-500 uppercase">
                      Amount (USD)
                    </div>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={String(data.amountUsd ?? "100")}
                      onChange={(e) => {
                        if (/^\d*\.?\d*$/.test(e.target.value))
                          update("amountUsd", e.target.value);
                      }}
                      placeholder="100"
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

                  {/* Auto-refresh toggle */}
                  <div className="flex items-center justify-between">
                    <div className="text-[8px] font-mono font-bold tracking-widest text-slate-500 uppercase">
                      Auto-refresh (30s)
                    </div>
                    <button
                      onClick={() => update("autoRefresh", !autoRefresh)}
                      className="w-8 h-4 rounded-full relative transition-all cursor-pointer"
                      style={{
                        background: autoRefresh
                          ? `${accent}44`
                          : "rgba(51,65,85,0.6)",
                        border: `1px solid ${autoRefresh ? accent : "rgba(51,65,85,0.8)"}`,
                      }}
                    >
                      <span
                        className="absolute top-0.5 w-3 h-3 rounded-full transition-all"
                        style={{
                          background: autoRefresh ? accent : "#475569",
                          left: autoRefresh ? "calc(100% - 14px)" : "1px",
                        }}
                      />
                    </button>
                  </div>

                  <button
                    onClick={refresh}
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
                      Reset to Protocol Color
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Handles ── */}
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

BridgeNode.displayName = "BridgeNode";
