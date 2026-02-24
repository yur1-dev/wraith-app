"use client";

import { memo, useState, useEffect, useRef, useCallback } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  Fuel,
  MoreVertical,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Zap,
  Shield,
  Activity,
} from "lucide-react";
import { useFlowStore } from "@/lib/hooks/useFlowStore";

// ── Fetchers — via Next.js API proxy (no CORS) ────────────────────────────────

async function fetchSolanaFees(): Promise<{
  low: number;
  medium: number;
  high: number;
  avg: number;
  samples: number;
} | null> {
  try {
    const res = await fetch("/api/solana-fees?type=fees");
    if (!res.ok) return null;
    const data = await res.json();
    if (data.error) return null;
    return data;
  } catch {
    return null;
  }
}

async function fetchJitoTipFloor(): Promise<{
  p25: number;
  p50: number;
  p75: number;
  p95: number;
  ema50: number;
} | null> {
  try {
    // Jito's API is browser-friendly (has proper CORS headers)
    const res = await fetch(
      "https://bundles.jito.wtf/api/v1/bundles/tip_floor",
      {
        headers: { Accept: "application/json" },
      },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const entry = Array.isArray(data) ? data[0] : data;
    if (!entry) return null;

    const toL = (sol: number) => Math.round((sol ?? 0) * 1e9);
    return {
      p25: toL(entry.landed_tips_25th_percentile),
      p50: toL(entry.landed_tips_50th_percentile),
      p75: toL(entry.landed_tips_75th_percentile),
      p95: toL(entry.landed_tips_95th_percentile),
      ema50: toL(entry.ema_landed_tips_50th_percentile),
    };
  } catch {
    return null;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatMicrolamports(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function lamportsToSol(n: number): string {
  return (n / 1e9).toFixed(6);
}

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

// ── Component ─────────────────────────────────────────────────────────────────
export const GasOptimizerNode = memo(({ data, selected, id }: NodeProps) => {
  const strategy = String(data.strategy ?? "priority");
  const urgency = String(data.urgency ?? "medium") as "low" | "medium" | "high";
  const maxFee = parseInt(String(data.maxFee ?? "50000"), 10);
  const timeout = parseInt(String(data.timeout ?? "60"), 10);

  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const customColor = data.customColor as string | undefined;
  const accent = customColor ?? "#84cc16";

  const [tab, setTab] = useState<"config" | "color">("config");
  const [showPopover, setShowPopover] = useState(false);
  const [fees, setFees] = useState<{
    low: number;
    medium: number;
    high: number;
    avg: number;
    samples: number;
  } | null>(null);
  const [jitoTips, setJitoTips] = useState<{
    p25: number;
    p50: number;
    p75: number;
    p95: number;
    ema50: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [waitMinutes, setWaitMinutes] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const waitRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeFee = fees
    ? ({ low: fees.low, medium: fees.medium, high: fees.high }[urgency] ??
      fees.medium)
    : null;
  const feeOk =
    strategy === "wait" && activeFee !== null && activeFee <= maxFee;
  const timedOut = strategy === "wait" && waitMinutes >= timeout;
  const statusColor = timedOut
    ? "#f87171"
    : feeOk
      ? "#34d399"
      : fees
        ? "#fbbf24"
        : "#94a3b8";
  const statusLabel = timedOut
    ? "timed out"
    : feeOk
      ? "ready"
      : fees
        ? "waiting..."
        : "loading";

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (strategy === "jito") {
        const [feeData, jitoData] = await Promise.all([
          fetchSolanaFees(),
          fetchJitoTipFloor(),
        ]);
        if (feeData) {
          setFees(feeData);
          setLastUpdated(new Date().toLocaleTimeString());
        }
        if (jitoData) setJitoTips(jitoData);
        if (!feeData && !jitoData) setError("Failed to fetch fee data");
      } else {
        const feeData = await fetchSolanaFees();
        if (feeData) {
          setFees(feeData);
          setLastUpdated(new Date().toLocaleTimeString());
        } else setError("Failed to fetch fee data");
      }
    } catch {
      setError("Fetch failed");
    }
    setLoading(false);
  }, [strategy]);

  useEffect(() => {
    refresh();
    intervalRef.current = setInterval(refresh, 10000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refresh]);

  useEffect(() => {
    if (strategy === "wait" && fees && !feeOk && !timedOut) {
      waitRef.current = setInterval(() => setWaitMinutes((m) => m + 1), 60000);
    } else {
      if (!feeOk) setWaitMinutes(0);
      if (waitRef.current) clearInterval(waitRef.current);
    }
    return () => {
      if (waitRef.current) clearInterval(waitRef.current);
    };
  }, [strategy, fees, feeOk, timedOut]);

  useEffect(() => {
    const close = () => setShowPopover(false);
    window.addEventListener("closeColorMenus", close);
    return () => window.removeEventListener("closeColorMenus", close);
  }, []);

  const update = (field: string, val: unknown) =>
    updateNodeData(id, { [field]: val });

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
            <Fuel className="w-3.5 h-3.5" style={{ color: accent }} />
          </div>
          <div>
            <div className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase">
              Gas Optimizer
            </div>
            <div className="text-[9px] font-mono text-slate-600">
              Solana ·{" "}
              {strategy === "priority"
                ? "Priority Fee"
                : strategy === "jito"
                  ? "Jito Bundle"
                  : "Wait for Low Fee"}
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

        {/* ── PRIORITY FEE ── */}
        {strategy === "priority" && (
          <>
            <div
              className="rounded-lg px-3 py-2"
              style={{
                background: "rgba(15,23,42,0.6)",
                border: `1px solid ${accent}22`,
              }}
            >
              <div className="text-[8px] font-mono text-slate-600 uppercase tracking-widest mb-2">
                Live Priority Fees · {fees?.samples ?? "—"} samples
              </div>
              {loading && !fees ? (
                <Loader2
                  className="w-3 h-3 animate-spin"
                  style={{ color: accent }}
                />
              ) : fees ? (
                <div className="grid grid-cols-3 gap-2">
                  {(["low", "medium", "high"] as const).map((level) => {
                    const val = fees[level];
                    const isActive = urgency === level;
                    return (
                      <div
                        key={level}
                        className="text-center rounded-lg py-1.5 px-1 transition-all"
                        style={{
                          background: isActive ? `${accent}15` : "transparent",
                          border: `1px solid ${isActive ? accent + "33" : "transparent"}`,
                        }}
                      >
                        <div className="text-[7px] font-mono text-slate-600 uppercase tracking-widest">
                          {level}
                        </div>
                        <div
                          className="text-[11px] font-mono font-bold"
                          style={{
                            color: isActive ? accent : "rgba(148,163,184,0.7)",
                          }}
                        >
                          {formatMicrolamports(val)}
                        </div>
                        <div className="text-[7px] font-mono text-slate-700">
                          μ◎
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
              {activeFee !== null && (
                <div className="mt-2 text-[8px] font-mono text-slate-600">
                  using:{" "}
                  <span style={{ color: accent }}>
                    {formatMicrolamports(activeFee)} microlamports
                  </span>{" "}
                  ({urgency})
                </div>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-mono text-slate-700">
                {lastUpdated
                  ? `updated ${lastUpdated} · every 10s`
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
                <RefreshCw className="w-2.5 h-2.5" style={{ color: accent }} />
              </button>
            </div>
          </>
        )}

        {/* ── JITO BUNDLE ── */}
        {strategy === "jito" && (
          <>
            <div
              className="rounded-lg px-3 py-2"
              style={{
                background: "rgba(15,23,42,0.6)",
                border: `1px solid ${accent}22`,
              }}
            >
              <div className="text-[8px] font-mono text-slate-600 uppercase tracking-widest mb-2">
                Jito Tip Floor · bundles.jito.wtf
              </div>
              {loading && !jitoTips ? (
                <Loader2
                  className="w-3 h-3 animate-spin"
                  style={{ color: accent }}
                />
              ) : jitoTips ? (
                <>
                  <div className="grid grid-cols-4 gap-1 mb-2">
                    {(
                      [
                        ["p25", jitoTips.p25],
                        ["p50", jitoTips.p50],
                        ["p75", jitoTips.p75],
                        ["p95", jitoTips.p95],
                      ] as const
                    ).map(([label, val]) => (
                      <div key={label} className="text-center">
                        <div className="text-[7px] font-mono text-slate-600">
                          {label}
                        </div>
                        <div
                          className="text-[9px] font-mono font-bold"
                          style={{
                            color:
                              label === "p50"
                                ? accent
                                : "rgba(148,163,184,0.6)",
                          }}
                        >
                          {formatMicrolamports(val)}
                        </div>
                        <div className="text-[7px] font-mono text-slate-700">
                          lam
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-[8px] font-mono text-slate-600">
                      EMA p50:{" "}
                      <span style={{ color: accent }}>
                        {lamportsToSol(jitoTips.ema50)} SOL
                      </span>{" "}
                      · recommended tip
                    </div>
                    <div className="text-[8px] font-mono text-slate-600">
                      p50:{" "}
                      <span style={{ color: accent }}>
                        {lamportsToSol(jitoTips.p50)} SOL
                      </span>{" "}
                      · MEV protected
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-[9px] font-mono text-slate-600">
                  failed to fetch jito tips
                </div>
              )}
            </div>
            {fees && (
              <div
                className="rounded-lg px-3 py-2"
                style={{
                  background: "rgba(15,23,42,0.6)",
                  border: "1px solid rgba(51,65,85,0.4)",
                }}
              >
                <div className="text-[8px] font-mono text-slate-600 uppercase tracking-widest mb-1">
                  + Priority Fee (still needed in bundle)
                </div>
                <div className="text-[8px] font-mono" style={{ color: accent }}>
                  {formatMicrolamports(fees.medium)} μ◎ median · {fees.samples}{" "}
                  samples
                </div>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-mono text-slate-700">
                {lastUpdated
                  ? `updated ${lastUpdated} · every 10s`
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
                <RefreshCw className="w-2.5 h-2.5" style={{ color: accent }} />
              </button>
            </div>
          </>
        )}

        {/* ── WAIT FOR LOW FEE ── */}
        {strategy === "wait" && (
          <>
            <div
              className="rounded-lg px-3 py-2 flex items-center justify-between"
              style={{
                background: "rgba(15,23,42,0.6)",
                border: `1px solid ${statusColor}33`,
              }}
            >
              <div className="space-y-0.5">
                <div className="text-[8px] font-mono text-slate-600 uppercase tracking-widest">
                  Current Fee
                </div>
                {loading && !fees ? (
                  <Loader2
                    className="w-3 h-3 animate-spin"
                    style={{ color: accent }}
                  />
                ) : activeFee !== null ? (
                  <div className="flex items-baseline gap-1">
                    <span
                      className="text-sm font-mono font-bold"
                      style={{ color: statusColor }}
                    >
                      {formatMicrolamports(activeFee)}
                    </span>
                    <span className="text-[9px] font-mono text-slate-500">
                      μ◎
                    </span>
                  </div>
                ) : (
                  <span className="text-[10px] font-mono text-slate-600">
                    —
                  </span>
                )}
                <div className="text-[8px] font-mono text-slate-700">
                  threshold: {formatMicrolamports(maxFee)} μ◎
                </div>
              </div>
              <div className="flex items-center gap-2">
                {fees && (
                  <div className="flex items-center gap-1.5">
                    {timedOut ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                    ) : feeOk ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-yellow-400" />
                    )}
                    <span
                      className="text-[9px] font-mono font-bold uppercase tracking-widest"
                      style={{ color: statusColor }}
                    >
                      {statusLabel}
                    </span>
                  </div>
                )}
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
                    className="w-2.5 h-2.5"
                    style={{ color: accent }}
                  />
                </button>
              </div>
            </div>

            {!feeOk && !timedOut && fees && (
              <div
                className="rounded-lg px-3 py-1.5 flex items-center gap-2"
                style={{
                  background: "rgba(251,191,36,0.06)",
                  border: "1px solid rgba(251,191,36,0.15)",
                }}
              >
                <Activity className="w-3 h-3 text-yellow-400 shrink-0" />
                <span className="text-[9px] font-mono text-yellow-400">
                  waiting {waitMinutes}min / {timeout}min · polling every 10s
                </span>
              </div>
            )}

            {timedOut && (
              <div
                className="rounded-lg px-3 py-1.5 flex items-center gap-2"
                style={{
                  background: "rgba(248,113,113,0.06)",
                  border: "1px solid rgba(248,113,113,0.15)",
                }}
              >
                <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />
                <span className="text-[9px] font-mono text-red-400">
                  timeout reached — flow will proceed regardless
                </span>
              </div>
            )}

            {fees && (
              <div className="grid grid-cols-3 gap-1">
                {(["low", "medium", "high"] as const).map((level) => (
                  <div
                    key={level}
                    className="rounded-lg px-2 py-1.5 text-center"
                    style={{
                      background: "rgba(15,23,42,0.4)",
                      border: "1px solid rgba(51,65,85,0.4)",
                    }}
                  >
                    <div className="text-[7px] font-mono text-slate-600 uppercase">
                      {level}
                    </div>
                    <div className="text-[9px] font-mono font-bold text-slate-400">
                      {formatMicrolamports(fees[level])}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="text-[8px] font-mono text-slate-700 text-right">
              {lastUpdated ? `updated ${lastUpdated}` : "fetching..."}
            </div>
          </>
        )}
      </div>

      {/* Popover */}
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
                  {/* Strategy */}
                  <div className="space-y-1.5">
                    <div className="text-[8px] font-mono font-bold tracking-widest text-slate-500 uppercase">
                      Strategy
                    </div>
                    <div className="space-y-1">
                      {[
                        {
                          val: "priority",
                          label: "Priority Fee",
                          desc: "Set microlamport fee level",
                          icon: <Activity className="w-3 h-3" />,
                        },
                        {
                          val: "jito",
                          label: "Jito Bundle",
                          desc: "MEV protected, real tip data",
                          icon: <Shield className="w-3 h-3" />,
                        },
                        {
                          val: "wait",
                          label: "Wait for Low Fee",
                          desc: "Poll until fee drops below max",
                          icon: <Clock className="w-3 h-3" />,
                        },
                      ].map((s) => (
                        <button
                          key={s.val}
                          onClick={() => update("strategy", s.val)}
                          className="w-full py-2 px-2.5 rounded-lg text-left cursor-pointer transition-all"
                          style={
                            strategy === s.val
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
                          <div className="flex items-center gap-2">
                            <span
                              style={{
                                color:
                                  strategy === s.val
                                    ? accent
                                    : "rgba(100,116,139,0.5)",
                              }}
                            >
                              {s.icon}
                            </span>
                            <div>
                              <div
                                className="text-[9px] font-mono font-bold"
                                style={{
                                  color:
                                    strategy === s.val
                                      ? accent
                                      : "rgba(148,163,184,0.6)",
                                }}
                              >
                                {s.label}
                              </div>
                              <div className="text-[8px] font-mono text-slate-600">
                                {s.desc}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Fee level — priority + wait */}
                  {(strategy === "priority" || strategy === "wait") && (
                    <div className="space-y-1.5">
                      <div className="text-[8px] font-mono font-bold tracking-widest text-slate-500 uppercase">
                        Fee Level
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        {(["low", "medium", "high"] as const).map((u) => (
                          <button
                            key={u}
                            onClick={() => update("urgency", u)}
                            className="py-1.5 rounded-lg text-[8px] font-mono font-bold uppercase tracking-wider cursor-pointer transition-all"
                            style={
                              urgency === u
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
                            {u}
                          </button>
                        ))}
                      </div>
                      {fees && (
                        <div className="text-[8px] font-mono text-slate-600">
                          {urgency}:{" "}
                          <span style={{ color: accent }}>
                            {formatMicrolamports(fees[urgency])} μ◎
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Max fee — wait only */}
                  {strategy === "wait" && (
                    <div className="space-y-1.5">
                      <div className="text-[8px] font-mono font-bold tracking-widest text-slate-500 uppercase">
                        Max Fee (microlamports)
                      </div>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={String(data.maxFee ?? "50000")}
                        onChange={(e) => {
                          if (/^\d*$/.test(e.target.value))
                            update("maxFee", e.target.value);
                        }}
                        placeholder="50000"
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
                      {fees && (
                        <div className="text-[8px] font-mono text-slate-600">
                          current med: {formatMicrolamports(fees.medium)} μ◎
                        </div>
                      )}
                    </div>
                  )}

                  {/* Timeout */}
                  <div className="space-y-1.5">
                    <div className="text-[8px] font-mono font-bold tracking-widest text-slate-500 uppercase">
                      Timeout (minutes)
                    </div>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={String(data.timeout ?? "60")}
                      onChange={(e) => {
                        if (/^\d*$/.test(e.target.value))
                          update("timeout", e.target.value);
                      }}
                      placeholder="60"
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

                  <button
                    onClick={refresh}
                    className="w-full h-7 rounded-lg flex items-center justify-center gap-1.5 text-[8px] font-mono font-bold uppercase tracking-widest cursor-pointer"
                    style={{
                      background: `${accent}15`,
                      border: `1px solid ${accent}33`,
                      color: accent,
                    }}
                  >
                    <Zap className="w-2.5 h-2.5" /> Refresh Now
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

GasOptimizerNode.displayName = "GasOptimizerNode";
