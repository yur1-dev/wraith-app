"use client";

import { memo, useState, useEffect, useRef, useCallback } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  Gift,
  MoreVertical,
  RefreshCw,
  AlertTriangle,
  ExternalLink,
  CheckCircle2,
  Clock,
  Loader2,
  Search,
  Zap,
  TrendingUp,
  Star,
  XCircle,
} from "lucide-react";
import { useFlowStore } from "@/lib/hooks/useFlowStore";

interface LiveAirdrop {
  id: string;
  name: string;
  description: string;
  status?: "live";
  claimUrl: string;
  chain: string;
  token?: string;
  estimatedAmount?: string;
  imageUrl?: string;
  expiresAt?: string;
  source: "daylight" | "merkl";
}

interface UpcomingAirdrop {
  id: string;
  name: string;
  ticker: string;
  status: "live" | "confirmed" | "rumored" | "testnet";
  description: string;
  eligibility: string[];
  claimUrl: string;
  chain: string;
  category: string;
  estimatedValue: string;
  color: string;
}

interface CheckResult {
  address: string;
  liveAirdrops: LiveAirdrop[];
  upcoming: UpcomingAirdrop[];
  checkedAt: string;
  sources?: { daylight: string; merkl: string };
  daylightError?: string;
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

const STATUS_CONFIG = {
  live: { label: "LIVE", color: "#34d399", bg: "rgba(52,211,153,0.1)" },
  confirmed: {
    label: "CONFIRMED",
    color: "#60a5fa",
    bg: "rgba(96,165,250,0.1)",
  },
  rumored: { label: "RUMORED", color: "#fbbf24", bg: "rgba(251,191,36,0.1)" },
  testnet: { label: "TESTNET", color: "#a78bfa", bg: "rgba(167,139,250,0.1)" },
};

const VALUE_DOTS: Record<string, number> = { $: 1, $$: 2, $$$: 3, $$$$: 4 };

function isValidEVMAddress(addr: string) {
  return /^0x[0-9a-fA-F]{40}$/.test(addr);
}

function shortenAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function ValueDots({ value, accent }: { value: string; accent: string }) {
  const filled = VALUE_DOTS[value] ?? 0;
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: i <= filled ? accent : "rgba(51,65,85,0.5)" }}
        />
      ))}
    </div>
  );
}

function AirdropCard({
  airdrop,
  accent,
}: {
  airdrop: UpcomingAirdrop;
  accent: string;
}) {
  const status = STATUS_CONFIG[airdrop.status];
  return (
    <div
      className="rounded-lg px-2.5 py-2 space-y-1.5 transition-all"
      style={{
        background: "rgba(15,23,42,0.7)",
        border: `1px solid ${airdrop.color}22`,
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div
            className="w-5 h-5 rounded flex items-center justify-center text-[8px] font-bold"
            style={{ background: `${airdrop.color}22`, color: airdrop.color }}
          >
            {airdrop.ticker.replace("$", "").slice(0, 2)}
          </div>
          <div>
            <span className="text-[9px] font-mono font-bold text-slate-300">
              {airdrop.name}
            </span>
            <span
              className="text-[8px] font-mono ml-1"
              style={{ color: airdrop.color }}
            >
              {airdrop.ticker}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <ValueDots value={airdrop.estimatedValue} accent={airdrop.color} />
          <div
            className="px-1.5 py-0.5 rounded text-[7px] font-mono font-bold uppercase"
            style={{ background: status.bg, color: status.color }}
          >
            {status.label}
          </div>
        </div>
      </div>
      <p className="text-[8px] font-mono text-slate-500 leading-relaxed line-clamp-2">
        {airdrop.description}
      </p>
      <div className="flex items-center justify-between">
        <div className="flex gap-1 flex-wrap">
          {airdrop.eligibility.slice(0, 2).map((e, i) => (
            <span
              key={i}
              className="text-[7px] font-mono px-1.5 py-0.5 rounded"
              style={{
                background: `${accent}10`,
                border: `1px solid ${accent}20`,
                color: "rgba(148,163,184,0.8)",
              }}
            >
              {e}
            </span>
          ))}
        </div>
        <a
          href={airdrop.claimUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-0.5 text-[7px] font-mono transition-opacity hover:opacity-70"
          style={{ color: airdrop.color }}
        >
          <ExternalLink className="w-2 h-2" />
          visit
        </a>
      </div>
    </div>
  );
}

function LiveClaimCard({
  airdrop,
  accent,
}: {
  airdrop: LiveAirdrop;
  accent: string;
}) {
  const sourceColor = airdrop.source === "merkl" ? "#60a5fa" : "#a78bfa";
  const sourceLabel = airdrop.source === "merkl" ? "MERKL" : "DAYLIGHT";
  return (
    <div
      className="rounded-lg px-2.5 py-2 space-y-1"
      style={{
        background: "rgba(52,211,153,0.06)",
        border: "1px solid rgba(52,211,153,0.25)",
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
          <span className="text-[10px] font-mono font-bold text-emerald-400">
            {airdrop.name}
          </span>
          {airdrop.token && (
            <span className="text-[8px] font-mono text-slate-500">
              {airdrop.token}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <span
            className="text-[6px] font-mono px-1 py-0.5 rounded"
            style={{ background: `${sourceColor}15`, color: sourceColor }}
          >
            {sourceLabel}
          </span>
          <a
            href={airdrop.claimUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[7px] font-mono font-bold uppercase cursor-pointer transition-opacity hover:opacity-80"
            style={{
              background: "rgba(52,211,153,0.15)",
              border: "1px solid rgba(52,211,153,0.35)",
              color: "#34d399",
            }}
          >
            <Zap className="w-2 h-2" /> CLAIM
          </a>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-[8px] font-mono text-slate-500 line-clamp-1">
          {airdrop.description || airdrop.chain}
        </p>
        {airdrop.estimatedAmount && (
          <span className="text-[8px] font-mono text-emerald-400 font-bold shrink-0 ml-1">
            ~{airdrop.estimatedAmount}
          </span>
        )}
      </div>
    </div>
  );
}

export const ClaimAirdropNode = memo(({ data, selected, id }: NodeProps) => {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);

  const walletAddress = String(data.walletAddress ?? "");
  const autoRefresh = data.autoRefresh !== false;
  const customColor = data.customColor as string | undefined;
  const accent = customColor ?? "#f43f5e";
  const activeTab = (data.activeTab as string) ?? "live";

  const [showPopover, setShowPopover] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const addressRef = useRef(walletAddress);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    addressRef.current = walletAddress;
  }, [walletAddress]);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Element;
      if (buttonRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      setShowPopover(false);
    };
    window.addEventListener("mousedown", handleMouseDown, true);
    return () => window.removeEventListener("mousedown", handleMouseDown, true);
  }, []);

  const update = (field: string, val: unknown) =>
    updateNodeData(id, { [field]: val });

  const fetchUpcoming = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/airdrop-check?mode=upcoming");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setResult({
        address: "",
        liveAirdrops: [],
        upcoming: data.upcoming ?? [],
        checkedAt: new Date().toISOString(),
      });
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    }
    setLoading(false);
  }, []);

  const checkAddress = useCallback(
    async (addr?: string) => {
      const target = addr ?? addressRef.current;
      if (!target || !isValidEVMAddress(target)) {
        await fetchUpcoming();
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/airdrop-check?address=${encodeURIComponent(target)}`,
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setResult(data);
        setLastUpdated(new Date().toLocaleTimeString());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Check failed");
        await fetchUpcoming();
      }
      setLoading(false);
    },
    [fetchUpcoming],
  );

  useEffect(() => {
    checkAddress();
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (autoRefresh)
      intervalRef.current = setInterval(() => checkAddress(), 120_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, checkAddress]);

  const hasAddress = isValidEVMAddress(walletAddress);
  const liveCount = result?.liveAirdrops?.length ?? 0;
  const upcomingCount = result?.upcoming?.length ?? 0;
  const hasLive = liveCount > 0;

  const statusColor = error
    ? "#f87171"
    : hasLive
      ? "#34d399"
      : hasAddress
        ? "#60a5fa"
        : "#94a3b8";
  const statusLabel = error
    ? "error"
    : loading
      ? "scanning..."
      : hasLive
        ? `${liveCount} claimable`
        : hasAddress
          ? "no claims found"
          : "enter wallet";

  return (
    <div
      className="relative min-w-[290px] max-w-[290px] rounded-xl transition-all duration-200"
      style={{
        background: "rgba(2, 6, 23, 0.94)",
        border: selected
          ? `1px solid ${accent}`
          : "1px solid rgba(51,65,85,0.4)",
        boxShadow: selected
          ? `0 20px 25px -5px ${accent}40, 0 8px 10px -6px ${accent}40`
          : "0 4px 24px rgba(0,0,0,0.4)",
        backdropFilter: "blur(20px)",
      }}
    >
      {/* Header */}
      <div
        className="px-3 py-2.5 rounded-t-xl flex items-center justify-between select-none"
        style={{
          background: `linear-gradient(135deg, ${accent}20, ${accent}08)`,
          borderBottom: `1px solid ${accent}20`,
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{
              background: `${accent}20`,
              border: `1px solid ${accent}40`,
            }}
          >
            <Gift className="w-3.5 h-3.5" style={{ color: accent }} />
          </div>
          <div>
            <div className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase">
              Airdrop Scanner
            </div>
            <div className="text-[9px] font-mono text-slate-600">
              {hasAddress ? shortenAddress(walletAddress) : "no wallet set"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {hasLive && (
            <div
              className="px-1.5 py-0.5 rounded text-[8px] font-mono font-bold"
              style={{ background: "rgba(52,211,153,0.15)", color: "#34d399" }}
            >
              {liveCount} live
            </div>
          )}
          <button
            ref={buttonRef}
            onClick={(e) => {
              e.stopPropagation();
              setShowPopover((p) => !p);
            }}
            className="w-6 h-6 rounded flex items-center justify-center cursor-pointer"
            style={{
              background: showPopover ? `${accent}20` : "transparent",
              border: `1px solid ${showPopover ? accent + "40" : "transparent"}`,
            }}
          >
            <MoreVertical className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>

      <div
        className="h-px w-full"
        style={{
          background: `linear-gradient(90deg, ${accent}70, transparent 60%)`,
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
            <span className="text-[9px] font-mono text-red-400 line-clamp-1">
              {error}
            </span>
          </div>
        )}

        {hasAddress && (
          <div
            className="rounded-lg px-2.5 py-1.5 flex items-center gap-2"
            style={{
              background: "rgba(15,23,42,0.6)",
              border: `1px solid ${accent}18`,
            }}
          >
            <Search
              className="w-2.5 h-2.5 shrink-0"
              style={{ color: accent }}
            />
            <span className="text-[8px] font-mono text-slate-400 truncate">
              {walletAddress}
            </span>
          </div>
        )}

        {/* View tabs */}
        <div
          className="flex rounded-lg overflow-hidden"
          style={{ border: `1px solid ${accent}15` }}
        >
          {(
            [
              { key: "live", label: "Claimable", icon: Zap },
              { key: "upcoming", label: "Upcoming", icon: TrendingUp },
            ] as const
          ).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => update("activeTab", key)}
              className="flex-1 py-1.5 flex items-center justify-center gap-1 text-[8px] font-mono font-bold uppercase tracking-widest cursor-pointer transition-all"
              style={
                activeTab === key
                  ? {
                      background: `${accent}15`,
                      color: accent,
                      borderBottom: `1px solid ${accent}`,
                    }
                  : { color: "rgba(100,116,139,0.6)" }
              }
            >
              <Icon className="w-2.5 h-2.5" />
              {label}
              {key === "live" && liveCount > 0 && (
                <span
                  className="ml-0.5 px-1 rounded-full text-[7px]"
                  style={{ background: `${accent}30`, color: accent }}
                >
                  {liveCount}
                </span>
              )}
              {key === "upcoming" && (
                <span
                  className="ml-0.5 px-1 rounded-full text-[7px]"
                  style={{
                    background: "rgba(100,116,139,0.15)",
                    color: "rgba(100,116,139,0.8)",
                  }}
                >
                  {upcomingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content area */}
        <div className="space-y-1.5 max-h-[260px] overflow-y-auto scrollbar-thin">
          {loading && !result ? (
            <div className="flex items-center justify-center py-8">
              <Loader2
                className="w-4 h-4 animate-spin"
                style={{ color: accent }}
              />
              <span className="text-[9px] font-mono text-slate-500 ml-2">
                scanning chain...
              </span>
            </div>
          ) : activeTab === "live" ? (
            <>
              {!hasAddress ? (
                <div className="py-4 text-center space-y-1">
                  <Search className="w-5 h-5 text-slate-600 mx-auto" />
                  <p className="text-[9px] font-mono text-slate-600">
                    Set wallet address to scan for live claims
                  </p>
                  <p className="text-[8px] font-mono text-slate-700">
                    Open config → paste your EVM address
                  </p>
                </div>
              ) : hasLive ? (
                result!.liveAirdrops.map((a) => (
                  <LiveClaimCard key={a.id} airdrop={a} accent={accent} />
                ))
              ) : (
                <div className="py-4 text-center space-y-1">
                  <XCircle className="w-5 h-5 text-slate-600 mx-auto" />
                  <p className="text-[9px] font-mono text-slate-500">
                    No active claims found for this wallet
                  </p>
                  <p className="text-[8px] font-mono text-slate-700">
                    Check the Upcoming tab for future opportunities
                  </p>
                  {result?.sources && (
                    <div className="flex justify-center gap-2 mt-1.5">
                      {Object.entries(result.sources).map(([src, status]) => (
                        <span
                          key={src}
                          className="text-[7px] font-mono px-1.5 py-0.5 rounded"
                          style={{
                            background: status.startsWith("error")
                              ? "rgba(248,113,113,0.08)"
                              : "rgba(52,211,153,0.08)",
                            color: status.startsWith("error")
                              ? "#f87171"
                              : "#34d399",
                          }}
                        >
                          {src}: {status}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            (result?.upcoming?.map((a) => (
              <AirdropCard key={a.id} airdrop={a} accent={accent} />
            )) ?? (
              <div className="flex items-center justify-center py-6">
                <Loader2
                  className="w-3 h-3 animate-spin"
                  style={{ color: accent }}
                />
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-0.5">
          <div className="flex items-center gap-1.5">
            {loading ? (
              <Loader2
                className="w-3 h-3 animate-spin"
                style={{ color: accent }}
              />
            ) : error ? (
              <AlertTriangle
                className="w-3 h-3"
                style={{ color: statusColor }}
              />
            ) : hasLive ? (
              <CheckCircle2
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
            <span className="text-[7px] font-mono text-slate-700">
              {lastUpdated ? `updated ${lastUpdated}` : "—"}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                checkAddress();
              }}
              className="w-5 h-5 rounded flex items-center justify-center cursor-pointer"
              style={{
                background: `${accent}15`,
                border: `1px solid ${accent}30`,
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

      {/* Popover — color only */}
      {showPopover && (
        <div
          ref={popoverRef}
          className="absolute top-0 left-[calc(100%+10px)] z-[100] w-52 rounded-xl overflow-hidden shadow-2xl"
          style={{
            background: "rgba(2,6,23,0.98)",
            border: `1px solid ${accent}30`,
            boxShadow: `0 25px 50px rgba(0,0,0,0.8), 0 0 24px ${accent}12`,
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
            className="px-2 py-1.5 border-b"
            style={{ borderColor: `${accent}15` }}
          >
            <span
              className="text-[9px] font-mono font-bold uppercase tracking-widest"
              style={{ color: accent }}
            >
              Node Color
            </span>
          </div>
          <div className="p-3 space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={accent}
                onChange={(e) => update("customColor", e.target.value)}
                className="w-10 h-10 rounded border-2 cursor-pointer"
                style={{ borderColor: `${accent}66`, backgroundColor: accent }}
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
                    borderColor: accent === c ? "white" : "rgba(51,65,85,0.5)",
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
                Reset to Default
              </button>
            )}
          </div>
        </div>
      )}

      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="!w-3 !h-3 !border-2"
        style={{ background: accent, borderColor: `${accent}cc` }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="!w-3 !h-3 !border-2"
        style={{ background: accent, borderColor: `${accent}cc` }}
      />
    </div>
  );
});

ClaimAirdropNode.displayName = "ClaimAirdropNode";
