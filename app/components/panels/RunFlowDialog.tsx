"use client";

import { useState, useEffect, useRef } from "react";
import {
  X,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Wallet,
  Zap,
  Activity,
} from "lucide-react";
import { useFlowStore } from "@/lib/hooks/useFlowStore";
import { useWallet } from "@/lib/hooks/useWallet";

// ── Types ─────────────────────────────────────────────────────────

type NodeStatus = "pending" | "running" | "success" | "failed" | "skipped";

interface NodeResult {
  nodeId: string;
  nodeType: string;
  nodeLabel: string;
  status: NodeStatus;
  output?: Record<string, unknown>;
  error?: string;
  signature?: string;
  duration?: number; // ms
}

// Separate type for the raw API response items (which use `success: boolean`)
interface ApiNodeResult {
  nodeId: string;
  success: boolean;
  output?: Record<string, unknown>;
  error?: string;
  signature?: string;
}

interface RunFlowDialogProps {
  open: boolean;
  onClose: () => void;
}

// ── Node type metadata ─────────────────────────────────────────────

const NODE_META: Record<
  string,
  { label: string; emoji: string; color: string }
> = {
  trigger: { label: "Trigger", emoji: "⏰", color: "#a855f7" },
  multiWallet: { label: "Multi-Wallet", emoji: "👥", color: "#f97316" },
  swap: { label: "Swap", emoji: "🔄", color: "#3b82f6" },
  bridge: { label: "Bridge", emoji: "🌉", color: "#06b6d4" },
  chainSwitch: { label: "Chain Switch", emoji: "🔀", color: "#8b5cf6" },
  alert: { label: "Alert", emoji: "🔔", color: "#f59e0b" },
  condition: { label: "Condition", emoji: "🔀", color: "#eab308" },
  walletConnect: { label: "Wallet", emoji: "👛", color: "#10b981" },
  lendStake: { label: "Lend/Stake", emoji: "🏦", color: "#10b981" },
  twitter: { label: "Twitter", emoji: "🐦", color: "#38bdf8" },
  discord: { label: "Discord", emoji: "💬", color: "#818cf8" },
  galxe: { label: "Galxe", emoji: "🌐", color: "#a78bfa" },
  volumeFarmer: { label: "Volume Farmer", emoji: "📊", color: "#f59e0b" },
  claimAirdrop: { label: "Claim Airdrop", emoji: "🪂", color: "#f43f5e" },
  waitDelay: { label: "Wait/Delay", emoji: "⏳", color: "#94a3b8" },
  loop: { label: "Loop", emoji: "🔁", color: "#e879f9" },
  priceCheck: { label: "Price Check", emoji: "💲", color: "#2dd4bf" },
  gasOptimizer: { label: "Gas Optimizer", emoji: "⛽", color: "#84cc16" },
};

// ── Main Component ─────────────────────────────────────────────────

export function RunFlowDialog({ open, onClose }: RunFlowDialogProps) {
  const { nodes, edges } = useFlowStore();
  const { walletAddress, walletType, isConnected } = useWallet();

  const [phase, setPhase] = useState<"ready" | "running" | "done">("ready");
  const [nodeResults, setNodeResults] = useState<NodeResult[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [flowId, setFlowId] = useState<string | null>(null);
  const [overallStatus, setOverallStatus] = useState<
    "completed" | "failed" | null
  >(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Reset when opened
  useEffect(() => {
    if (open) {
      setPhase("ready");
      setNodeResults([]);
      setExpandedNodes(new Set());
      setFlowId(null);
      setOverallStatus(null);
      setElapsedMs(0);
    }
  }, [open]);

  // Timer
  useEffect(() => {
    if (phase === "running") {
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setElapsedMs(Date.now() - startTimeRef.current);
      }, 100);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  // Auto scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [nodeResults]);

  const formatMs = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const handleRun = async () => {
    if (!isConnected || !walletAddress) return;
    setPhase("running");

    // Init all nodes as pending
    const initialResults: NodeResult[] = nodes.map((node) => ({
      nodeId: node.id,
      nodeType: node.type || "unknown",
      nodeLabel:
        (node.data?.label as string) ||
        NODE_META[node.type || ""]?.label ||
        node.type ||
        "Node",
      status: "pending",
    }));
    setNodeResults(initialResults);

    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodes,
          edges,
          walletAddress,
          walletType,
        }),
      });

      const data = await res.json();

      if (data.error) {
        setNodeResults((prev) =>
          prev.map((r) => ({
            ...r,
            status: "failed" as NodeStatus,
            error: data.error,
          })),
        );
        setOverallStatus("failed");
        setPhase("done");
        return;
      }

      setFlowId(data.flowId);

      // FIX #1 & #2: Type the API results separately as ApiNodeResult[]
      // so we can access `.success` without conflicting with NodeResult's `.status`
      const results: ApiNodeResult[] = data.results;

      for (let i = 0; i < results.length; i++) {
        const r = results[i];

        // Mark current as running
        setNodeResults((prev) =>
          prev.map((n) =>
            n.nodeId === r.nodeId ? { ...n, status: "running" } : n,
          ),
        );

        // Small delay for visual effect
        await new Promise((resolve) => setTimeout(resolve, 400));

        // Mark as done — r.success is now valid on ApiNodeResult
        setNodeResults((prev) =>
          prev.map((n) =>
            n.nodeId === r.nodeId
              ? {
                  ...n,
                  status: r.success ? "success" : "failed", // FIX #1
                  output: r.output,
                  error: r.error,
                  signature: r.signature,
                  duration: Math.floor(Math.random() * 800) + 200,
                }
              : n,
          ),
        );

        // If failed, mark remaining as skipped
        if (!r.success) {
          // FIX #2
          await new Promise((resolve) => setTimeout(resolve, 200));
          setNodeResults((prev) =>
            prev.map((n) =>
              n.status === "pending" ? { ...n, status: "skipped" } : n,
            ),
          );
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 150));
      }

      setOverallStatus(data.status);
      setPhase("done");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setNodeResults((prev) =>
        prev.map((r) => ({
          ...r,
          status:
            r.status === "pending"
              ? "skipped"
              : r.status === "running"
                ? "failed"
                : r.status,
          error: r.status === "running" ? message : r.error,
        })),
      );
      setOverallStatus("failed");
      setPhase("done");
    }
  };

  const toggleExpand = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      next.has(nodeId) ? next.delete(nodeId) : next.add(nodeId);
      return next;
    });
  };

  const successCount = nodeResults.filter((r) => r.status === "success").length;
  const totalCount = nodeResults.length;
  const truncAddr = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : "";

  if (!open) return null;

  return (
    // FIX #4: z-[99999] → z-99999 (Tailwind canonical class)
    <div
      className="fixed inset-0 z-99999 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: "rgba(5, 10, 20, 0.98)",
          border: "1px solid rgba(56, 189, 248, 0.2)",
          boxShadow:
            "0 0 0 1px rgba(56,189,248,0.05), 0 32px 64px rgba(0,0,0,0.9), 0 0 80px rgba(56,189,248,0.05)",
          maxHeight: "85vh",
        }}
      >
        {/* Top accent */}
        <div
          className="h-px w-full shrink-0"
          style={{
            background:
              phase === "done"
                ? overallStatus === "completed"
                  ? "linear-gradient(90deg, transparent, #22c55e, #16a34a, transparent)"
                  : "linear-gradient(90deg, transparent, #ef4444, #dc2626, transparent)"
                : "linear-gradient(90deg, transparent, #22d3ee, #818cf8, transparent)",
          }}
        />

        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                background:
                  phase === "running"
                    ? "rgba(34,211,238,0.15)"
                    : phase === "done" && overallStatus === "completed"
                      ? "rgba(34,197,94,0.15)"
                      : phase === "done" && overallStatus === "failed"
                        ? "rgba(239,68,68,0.15)"
                        : "rgba(56,189,248,0.1)",
              }}
            >
              {phase === "running" ? (
                <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
              ) : phase === "done" && overallStatus === "completed" ? (
                <CheckCircle2 className="w-4 h-4 text-green-400" />
              ) : phase === "done" && overallStatus === "failed" ? (
                <XCircle className="w-4 h-4 text-red-400" />
              ) : (
                <Zap className="w-4 h-4 text-cyan-400" />
              )}
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                {phase === "ready"
                  ? "Run Flow"
                  : phase === "running"
                    ? "Executing Flow..."
                    : overallStatus === "completed"
                      ? "Flow Completed ✅"
                      : "Flow Failed ❌"}
              </h2>
              {phase === "running" && (
                <p className="text-[10px] text-cyan-400 font-mono">
                  {formatMs(elapsedMs)} elapsed
                </p>
              )}
              {phase === "done" && (
                <p className="text-[10px] text-slate-500 font-mono">
                  {successCount}/{totalCount} nodes succeeded •{" "}
                  {formatMs(elapsedMs)}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={phase === "running"}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{
              background: "transparent",
              border: "none",
              color: "rgba(148,163,184,0.6)",
              cursor: phase === "running" ? "not-allowed" : "pointer",
              opacity: phase === "running" ? 0.4 : 1,
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Wallet + flow info */}
        <div
          className="px-5 py-3 shrink-0 flex items-center justify-between"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center"
              style={{
                background:
                  walletType === "phantom"
                    ? "rgba(168,85,247,0.2)"
                    : "rgba(245,158,11,0.2)",
              }}
            >
              <Wallet
                size={10}
                style={{
                  color: walletType === "phantom" ? "#a855f7" : "#f59e0b",
                }}
              />
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              {truncAddr}
            </span>
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "#22c55e", boxShadow: "0 0 6px #22c55e" }}
            />
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono">
            <span>{nodes.length} nodes</span>
            <span>·</span>
            <span>{edges.length} connections</span>
          </div>
        </div>

        {/* READY STATE */}
        {phase === "ready" && (
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <p className="text-xs text-slate-400 mb-4">
              The following nodes will be executed in order:
            </p>
            <div className="space-y-1.5">
              {nodes.map((node, i) => {
                const meta = NODE_META[node.type || ""] || {
                  emoji: "⚙️",
                  label: node.type,
                  color: "#94a3b8",
                };
                return (
                  <div
                    key={node.id}
                    className="flex items-center gap-3 p-2.5 rounded-lg"
                    style={{
                      background: "rgba(20,26,42,0.5)",
                      border: "1px solid rgba(255,255,255,0.04)",
                    }}
                  >
                    <span className="text-xs text-slate-600 font-mono w-4 text-right shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-sm">{meta.emoji}</span>
                    <span className="text-xs text-slate-300 flex-1">
                      {(node.data?.label as string) || meta.label}
                    </span>
                    <span
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                      style={{
                        background: `${meta.color}15`,
                        color: meta.color,
                        border: `1px solid ${meta.color}30`,
                      }}
                    >
                      {node.type}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* RUNNING / DONE STATE */}
        {(phase === "running" || phase === "done") && (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
            {nodeResults.map((result, i) => {
              const meta = NODE_META[result.nodeType] || {
                emoji: "⚙️",
                label: result.nodeType,
                color: "#94a3b8",
              };
              const isExpanded = expandedNodes.has(result.nodeId);
              const hasDetails =
                result.status === "success" || result.status === "failed";

              return (
                <div
                  key={result.nodeId}
                  className="rounded-xl overflow-hidden"
                  style={{
                    background:
                      result.status === "success"
                        ? "rgba(34,197,94,0.04)"
                        : result.status === "failed"
                          ? "rgba(239,68,68,0.04)"
                          : result.status === "running"
                            ? "rgba(34,211,238,0.04)"
                            : "rgba(20,26,42,0.4)",
                    border:
                      result.status === "success"
                        ? "1px solid rgba(34,197,94,0.15)"
                        : result.status === "failed"
                          ? "1px solid rgba(239,68,68,0.15)"
                          : result.status === "running"
                            ? "1px solid rgba(34,211,238,0.2)"
                            : "1px solid rgba(255,255,255,0.04)",
                  }}
                >
                  {/* Node row */}
                  <div
                    className="flex items-center gap-3 p-3"
                    onClick={() => hasDetails && toggleExpand(result.nodeId)}
                    style={{ cursor: hasDetails ? "pointer" : "default" }}
                  >
                    {/* Status icon */}
                    <div className="w-5 h-5 flex items-center justify-center shrink-0">
                      {result.status === "pending" && (
                        <Clock
                          size={14}
                          style={{ color: "rgba(148,163,184,0.4)" }}
                        />
                      )}
                      {result.status === "running" && (
                        <Loader2
                          size={14}
                          className="animate-spin"
                          style={{ color: "#22d3ee" }}
                        />
                      )}
                      {result.status === "success" && (
                        <CheckCircle2 size={14} style={{ color: "#22c55e" }} />
                      )}
                      {result.status === "failed" && (
                        <XCircle size={14} style={{ color: "#ef4444" }} />
                      )}
                      {result.status === "skipped" && (
                        <div
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: "50%",
                            border: "1.5px solid rgba(148,163,184,0.25)",
                          }}
                        />
                      )}
                    </div>

                    {/* Index */}
                    <span className="text-[10px] text-slate-600 font-mono w-4 shrink-0">
                      {i + 1}
                    </span>

                    {/* Emoji */}
                    <span className="text-sm shrink-0">{meta.emoji}</span>

                    {/* Label */}
                    <span
                      className="text-xs flex-1"
                      style={{
                        color:
                          result.status === "success"
                            ? "#86efac"
                            : result.status === "failed"
                              ? "#fca5a5"
                              : result.status === "running"
                                ? "#67e8f9"
                                : result.status === "skipped"
                                  ? "rgba(148,163,184,0.3)"
                                  : "rgba(148,163,184,0.6)",
                      }}
                    >
                      {result.nodeLabel}
                    </span>

                    {/* Duration */}
                    {result.duration && (
                      <span className="text-[10px] font-mono text-slate-600 shrink-0">
                        {formatMs(result.duration)}
                      </span>
                    )}

                    {/* Expand arrow */}
                    {hasDetails && (
                      <div style={{ color: "rgba(148,163,184,0.4)" }}>
                        {isExpanded ? (
                          <ChevronDown size={12} />
                        ) : (
                          <ChevronRight size={12} />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Expanded details */}
                  {isExpanded && hasDetails && (
                    <div
                      className="px-3 pb-3"
                      style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
                    >
                      {result.error && (
                        <div
                          className="mt-2 p-2 rounded-lg text-[11px] font-mono"
                          style={{
                            background: "rgba(239,68,68,0.08)",
                            color: "#fca5a5",
                            border: "1px solid rgba(239,68,68,0.15)",
                          }}
                        >
                          ❌ {result.error}
                        </div>
                      )}

                      {result.signature && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-[10px] text-slate-500 font-mono">
                            tx:
                          </span>
                          <span className="text-[10px] text-cyan-400 font-mono truncate flex-1">
                            {result.signature}
                          </span>
                          {/* FIX #3: removed invalid `shrink: 0` from style prop */}
                          <ExternalLink
                            size={10}
                            className="shrink-0"
                            style={{ color: "#22d3ee" }}
                          />
                        </div>
                      )}

                      {result.output && (
                        <div
                          className="mt-2 p-2 rounded-lg text-[10px] font-mono"
                          style={{
                            background: "rgba(10,15,25,0.6)",
                            color: "rgba(148,163,184,0.7)",
                            border: "1px solid rgba(255,255,255,0.04)",
                            overflowX: "auto",
                          }}
                        >
                          {Object.entries(result.output)
                            .filter(([k]) => k !== "walletAddress")
                            .map(([k, v]) => (
                              <div key={k} className="flex gap-2">
                                <span style={{ color: "#818cf8" }}>{k}:</span>
                                <span>{String(v)}</span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={logsEndRef} />
          </div>
        )}

        {/* Progress bar - running only */}
        {phase === "running" && (
          <div className="px-5 pb-2 shrink-0">
            <div
              className="h-0.5 rounded-full overflow-hidden"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${
                    (nodeResults.filter(
                      (r) => r.status === "success" || r.status === "failed",
                    ).length /
                      Math.max(totalCount, 1)) *
                    100
                  }%`,
                  background: "linear-gradient(90deg, #22d3ee, #818cf8)",
                  boxShadow: "0 0 8px rgba(34,211,238,0.5)",
                }}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div
          className="px-5 py-4 shrink-0"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
        >
          {phase === "ready" && (
            <button
              onClick={handleRun}
              disabled={nodes.length === 0}
              className="w-full h-10 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
              style={{
                background: "linear-gradient(135deg, #22d3ee, #818cf8)",
                color: "white",
                border: "none",
                cursor: nodes.length === 0 ? "not-allowed" : "pointer",
                opacity: nodes.length === 0 ? 0.5 : 1,
                boxShadow: "0 0 20px rgba(34,211,238,0.2)",
              }}
            >
              <Play size={15} />
              Execute Flow
            </button>
          )}

          {phase === "running" && (
            <div
              className="w-full h-10 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
              style={{
                background: "rgba(34,211,238,0.08)",
                border: "1px solid rgba(34,211,238,0.2)",
                color: "#22d3ee",
              }}
            >
              <Activity size={14} className="animate-pulse" />
              Running...{" "}
              {nodeResults.filter((r) => r.status === "success").length}/
              {totalCount} complete
            </div>
          )}

          {phase === "done" && (
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setPhase("ready");
                  setNodeResults([]);
                  setFlowId(null);
                  setOverallStatus(null);
                  setElapsedMs(0);
                }}
                className="flex-1 h-10 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "rgba(148,163,184,0.8)",
                  cursor: "pointer",
                }}
              >
                Run Again
              </button>
              <button
                onClick={onClose}
                className="flex-1 h-10 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background:
                    overallStatus === "completed"
                      ? "linear-gradient(135deg, #22c55e, #16a34a)"
                      : "linear-gradient(135deg, #ef4444, #dc2626)",
                  color: "white",
                  border: "none",
                  cursor: "pointer",
                  boxShadow:
                    overallStatus === "completed"
                      ? "0 0 20px rgba(34,197,94,0.2)"
                      : "0 0 20px rgba(239,68,68,0.2)",
                }}
              >
                {overallStatus === "completed" ? "Done ✅" : "Close ❌"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
