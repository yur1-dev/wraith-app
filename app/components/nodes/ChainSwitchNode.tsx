"use client";

import { memo, useState, useEffect, useRef, useCallback } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  Network,
  MoreVertical,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Zap,
  ArrowRight,
} from "lucide-react";
import { useFlowStore } from "@/lib/hooks/useFlowStore";

// ── Supported chains ──────────────────────────────────────────────────────────

const CHAINS = [
  "Ethereum",
  "Arbitrum",
  "Optimism",
  "Polygon",
  "Base",
  "Avalanche",
  "BSC",
  "zkSync",
  "Linea",
  "Solana",
];

// Chain metadata for display
const CHAIN_META: Record<string, { color: string; symbol: string }> = {
  Ethereum: { color: "#627eea", symbol: "ETH" },
  Arbitrum: { color: "#28a0f0", symbol: "ARB" },
  Optimism: { color: "#ff0420", symbol: "OP" },
  Polygon: { color: "#8247e5", symbol: "MATIC" },
  Base: { color: "#0052ff", symbol: "BASE" },
  Avalanche: { color: "#e84142", symbol: "AVAX" },
  BSC: { color: "#f0b90b", symbol: "BNB" },
  zkSync: { color: "#4e529a", symbol: "ZK" },
  Linea: { color: "#61dfff", symbol: "ETH" },
  Solana: { color: "#9945ff", symbol: "SOL" },
};

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

interface ChainStatus {
  connected: boolean;
  blockNumber: number;
  gasGwei: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Simulates a chain connection check — replace with real RPC call if needed
async function fetchChainStatus(chain: string): Promise<ChainStatus> {
  await new Promise((r) => setTimeout(r, 400 + Math.random() * 300));
  const blockBases: Record<string, number> = {
    Ethereum: 19_800_000,
    Arbitrum: 210_000_000,
    Optimism: 118_000_000,
    Polygon: 56_000_000,
    Base: 13_000_000,
    Avalanche: 44_000_000,
    BSC: 38_000_000,
    zkSync: 30_000_000,
    Linea: 4_000_000,
    Solana: 260_000_000,
  };
  const gasRanges: Record<string, [number, number]> = {
    Ethereum: [10, 40],
    Arbitrum: [0.1, 0.5],
    Optimism: [0.01, 0.1],
    Polygon: [30, 100],
    Base: [0.01, 0.05],
    Avalanche: [25, 60],
    BSC: [3, 8],
    zkSync: [0.1, 0.3],
    Linea: [0.05, 0.2],
    Solana: [0.00025, 0.001],
  };
  const base = blockBases[chain] ?? 1_000_000;
  const [lo, hi] = gasRanges[chain] ?? [1, 10];
  return {
    connected: true,
    blockNumber: base + Math.floor(Math.random() * 1000),
    gasGwei: parseFloat((lo + Math.random() * (hi - lo)).toFixed(4)),
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export const ChainSwitchNode = memo(({ data, selected, id }: NodeProps) => {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);

  const targetChain = String(data.targetChain ?? "Arbitrum");
  const currentChain = String(data.currentChain ?? "Ethereum");
  const autoRefresh = data.autoRefresh !== false;
  const customColor = data.customColor as string | undefined;

  const chainMeta = CHAIN_META[targetChain] ?? {
    color: "#8b5cf6",
    symbol: "?",
  };
  const accent = customColor ?? chainMeta.color;

  const [tab, setTab] = useState<"config" | "color">("config");
  const [showPopover, setShowPopover] = useState(false);
  const [status, setStatus] = useState<ChainStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const update = (field: string, val: unknown) =>
    updateNodeData(id, { [field]: val });

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchChainStatus(targetChain);
      setStatus(result);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Status check failed");
      setStatus(null);
    }
    setLoading(false);
  }, [targetChain]);

  useEffect(() => {
    refresh();
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (autoRefresh) intervalRef.current = setInterval(refresh, 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refresh, autoRefresh]);

  useEffect(() => {
    const close = () => setShowPopover(false);
    window.addEventListener("closeColorMenus", close);
    return () => window.removeEventListener("closeColorMenus", close);
  }, []);

  const isReady = !!status && !error;
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
            <Network className="w-3.5 h-3.5" style={{ color: accent }} />
          </div>
          <div>
            <div className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase">
              Chain Switch
            </div>
            <div className="text-[9px] font-mono text-slate-600">
              {currentChain} → {targetChain}
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

        {/* Route card */}
        <div
          className="rounded-lg px-3 py-2.5"
          style={{
            background: "rgba(15,23,42,0.6)",
            border: `1px solid ${accent}22`,
          }}
        >
          <div className="text-[8px] font-mono text-slate-600 uppercase tracking-widest mb-2">
            Switch Route
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 text-center">
              <div className="text-[7px] font-mono text-slate-600 uppercase tracking-widest mb-0.5">
                From
              </div>
              <div
                className="text-[11px] font-mono font-bold"
                style={{ color: CHAIN_META[currentChain]?.color ?? "#94a3b8" }}
              >
                {currentChain}
              </div>
              <div className="text-[8px] font-mono text-slate-600">
                {CHAIN_META[currentChain]?.symbol ?? ""}
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
                {targetChain}
              </div>
              <div className="text-[8px] font-mono text-slate-600">
                {chainMeta.symbol}
              </div>
            </div>
          </div>
        </div>

        {/* Chain status */}
        <div
          className="rounded-lg px-3 py-2"
          style={{
            background: "rgba(15,23,42,0.6)",
            border: `1px solid ${accent}22`,
          }}
        >
          <div className="text-[8px] font-mono text-slate-600 uppercase tracking-widest mb-2">
            Target Chain Status
          </div>
          {loading && !status ? (
            <Loader2
              className="w-3 h-3 animate-spin"
              style={{ color: accent }}
            />
          ) : status ? (
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["Block", `#${status.blockNumber.toLocaleString()}`],
                  ["Gas", `${status.gasGwei} gwei`],
                ] as const
              ).map(([label, val]) => (
                <div key={label}>
                  <div className="text-[7px] font-mono text-slate-600 uppercase tracking-widest">
                    {label}
                  </div>
                  <div
                    className="text-[10px] font-mono font-bold"
                    style={{ color: accent }}
                  >
                    {val}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            !error && (
              <div className="text-[9px] font-mono text-slate-600">
                Checking chain…
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
              {lastUpdated ? `updated ${lastUpdated}` : "fetching..."}
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
                  {/* Current chain */}
                  <div className="space-y-1.5">
                    <div className="text-[8px] font-mono font-bold tracking-widest text-slate-500 uppercase">
                      Current Chain
                    </div>
                    <select
                      value={currentChain}
                      onChange={(e) => update("currentChain", e.target.value)}
                      className="w-full h-7 px-2 rounded-md text-[10px] font-mono focus:outline-none cursor-pointer"
                      style={{
                        background: "rgba(2,6,23,0.9)",
                        border: "1px solid rgba(51,65,85,0.8)",
                        color: accent,
                      }}
                    >
                      {CHAINS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Target chain */}
                  <div className="space-y-1.5">
                    <div className="text-[8px] font-mono font-bold tracking-widest text-slate-500 uppercase">
                      Target Chain
                    </div>
                    <select
                      value={targetChain}
                      onChange={(e) => update("targetChain", e.target.value)}
                      className="w-full h-7 px-2 rounded-md text-[10px] font-mono focus:outline-none cursor-pointer"
                      style={{
                        background: "rgba(2,6,23,0.9)",
                        border: "1px solid rgba(51,65,85,0.8)",
                        color: accent,
                      }}
                    >
                      {CHAINS.filter((c) => c !== currentChain).map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
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
                    <Zap className="w-2.5 h-2.5" /> Check Chain
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
                      Reset to Chain Color
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

ChainSwitchNode.displayName = "ChainSwitchNode";
