"use client";

import { useState, useEffect, useRef } from "react";
import {
  X,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  ChevronDown,
  ChevronRight,
  Wallet,
  RefreshCw,
} from "lucide-react";

interface ExecutionResult {
  nodeId: string;
  success: boolean;
  output?: any;
  error?: string;
  signature?: string;
}

interface FlowRun {
  flowId: string;
  status: "running" | "completed" | "failed";
  results: ExecutionResult[];
  startedAt: string;
  completedAt?: string;
  walletAddress: string;
  nodeCount: number;
}

const NODE_LABELS: Record<string, string> = {
  trigger: "Schedule Trigger",
  multiWallet: "Multi-Wallet",
  swap: "Token Swap",
  bridge: "Bridge",
  chainSwitch: "Chain Switch",
  alert: "Alert",
  condition: "Condition",
  walletConnect: "Wallet Connect",
  lendStake: "Lend/Stake",
  twitter: "Twitter",
  discord: "Discord",
  galxe: "Galxe",
  volumeFarmer: "Volume Farmer",
  claimAirdrop: "Claim Airdrop",
  waitDelay: "Wait/Delay",
  loop: "Loop",
  priceCheck: "Price Check",
  gasOptimizer: "Gas Optimizer",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

function duration(start: string, end?: string): string {
  if (!end) return "—";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

function NodeResultRow({ result }: { result: ExecutionResult }) {
  const [open, setOpen] = useState(false);
  const typeKey = result.nodeId.split("-")[0];
  const label = NODE_LABELS[typeKey] ?? typeKey;

  return (
    <div className="border border-slate-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-800/40 transition-colors text-left"
      >
        {result.success ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        ) : (
          <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
        )}
        <span className="text-xs font-mono text-slate-300 flex-1">{label}</span>
        {result.signature && (
          <span className="text-[10px] font-mono text-slate-600 truncate max-w-[100px]">
            {result.signature.slice(0, 16)}…
          </span>
        )}
        {open ? (
          <ChevronDown className="w-3 h-3 text-slate-600 shrink-0" />
        ) : (
          <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
        )}
      </button>

      {open && (
        <div className="px-3 pb-3 pt-1 border-t border-slate-800 bg-slate-950/50">
          {result.error ? (
            <div className="text-[11px] font-mono text-red-400 bg-red-500/10 px-2 py-1.5 rounded border border-red-500/20">
              {result.error}
            </div>
          ) : (
            <pre className="text-[10px] font-mono text-slate-400 whitespace-pre-wrap break-all leading-relaxed">
              {JSON.stringify(result.output, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

function RunCard({
  run,
  defaultOpen,
}: {
  run: FlowRun;
  defaultOpen?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultOpen ?? false);
  const passed = run.results.filter((r) => r.success).length;
  const failed = run.results.filter((r) => !r.success).length;

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        background: "rgba(8, 12, 28, 0.8)",
        borderColor:
          run.status === "completed"
            ? "rgba(52,211,153,0.2)"
            : run.status === "failed"
              ? "rgba(248,113,113,0.2)"
              : "rgba(56,189,248,0.2)",
      }}
    >
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div
          className={`w-2 h-2 rounded-full shrink-0 ${
            run.status === "completed"
              ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"
              : run.status === "failed"
                ? "bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.8)]"
                : "bg-cyan-400 animate-pulse"
          }`}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-300 font-medium">
              {run.flowId.slice(0, 8)}…
            </span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                run.status === "completed"
                  ? "bg-emerald-500/10 text-emerald-400"
                  : run.status === "failed"
                    ? "bg-red-500/10 text-red-400"
                    : "bg-cyan-500/10 text-cyan-400"
              }`}
            >
              {run.status}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-[10px] font-mono text-slate-600">
              {timeAgo(run.startedAt)}
            </span>
            <span className="text-[10px] font-mono text-slate-600">
              ⏱ {duration(run.startedAt, run.completedAt)}
            </span>
            <span className="text-[10px] font-mono text-slate-600">
              {run.nodeCount} nodes
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {passed > 0 && (
            <span className="text-[10px] font-mono text-emerald-400">
              {passed}✓
            </span>
          )}
          {failed > 0 && (
            <span className="text-[10px] font-mono text-red-400">
              {failed}✗
            </span>
          )}
          {expanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-slate-600" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          )}
        </div>
      </button>

      {expanded && (
        <>
          <div className="px-4 pb-1 flex items-center gap-1.5">
            <Wallet className="w-3 h-3 text-slate-600" />
            <span className="text-[10px] font-mono text-slate-600">
              {run.walletAddress.slice(0, 8)}…{run.walletAddress.slice(-6)}
            </span>
          </div>
          {run.results.length > 0 && (
            <div className="px-4 pb-4 space-y-1.5">
              {run.results.map((result) => (
                <NodeResultRow key={result.nodeId} result={result} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface ExecutionHistoryPanelProps {
  onClose: () => void;
}

export function ExecutionHistoryPanel({ onClose }: ExecutionHistoryPanelProps) {
  const [runs, setRuns] = useState<FlowRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "completed" | "failed">("all");
  const [lastCount, setLastCount] = useState(0);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const fetchHistory = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/execution-history");
      if (res.ok) {
        const data = await res.json();
        const incoming: FlowRun[] = data.executions || [];
        setRuns(incoming);
        setLastCount(incoming.length);
      }
    } catch {
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchHistory();
  }, []);

  // Poll every 2s to catch new runs from RunFlowDialog
  useEffect(() => {
    pollRef.current = setInterval(() => fetchHistory(true), 2000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const filtered = runs.filter((r) => filter === "all" || r.status === filter);

  return (
    <div
      className="fixed inset-y-0 right-0 w-[420px] z-50 flex flex-col"
      style={{
        background: "rgba(6,10,24,0.97)",
        borderLeft: "1px solid rgba(56,189,248,0.12)",
        backdropFilter: "blur(24px)",
        boxShadow: "-24px 0 48px rgba(0,0,0,0.6)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/60">
        <div className="flex items-center gap-2.5">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
          <span className="text-xs font-mono font-bold tracking-[0.15em] text-cyan-400">
            EXECUTION HISTORY
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchHistory()}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div
        className="h-px w-full"
        style={{
          background:
            "linear-gradient(90deg, rgba(34,211,238,0.4), transparent 60%)",
        }}
      />

      {/* Stats */}
      <div className="flex items-center gap-4 px-5 py-3 border-b border-slate-800/40">
        <div className="flex items-center gap-1.5">
          <Zap className="w-3 h-3 text-slate-600" />
          <span className="text-[10px] font-mono text-slate-500">
            {runs.length} total
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
          <span className="text-[10px] font-mono text-slate-500">
            {runs.filter((r) => r.status === "completed").length} passed
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <XCircle className="w-3 h-3 text-red-500" />
          <span className="text-[10px] font-mono text-slate-500">
            {runs.filter((r) => r.status === "failed").length} failed
          </span>
        </div>
        {/* Live indicator */}
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-[10px] font-mono text-slate-600">live</span>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 px-5 py-2.5 border-b border-slate-800/40">
        {(["all", "completed", "failed"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-3 py-1 rounded-md text-[10px] font-mono font-semibold tracking-wider transition-all"
            style={{
              background: filter === f ? "rgba(34,211,238,0.1)" : "transparent",
              color: filter === f ? "rgb(34,211,238)" : "rgb(100,116,139)",
              border: `1px solid ${filter === f ? "rgba(34,211,238,0.3)" : "transparent"}`,
            }}
          >
            {f.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Run list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="flex items-center gap-2 text-slate-600">
              <Clock className="w-4 h-4 animate-spin" />
              <span className="text-xs font-mono">Loading…</span>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <Zap className="w-6 h-6 text-slate-700" />
            <span className="text-xs font-mono text-slate-600">
              {filter === "all"
                ? "No runs yet — execute a flow to see history"
                : `No ${filter} runs`}
            </span>
          </div>
        ) : (
          filtered.map((run, i) => (
            <RunCard key={run.flowId} run={run} defaultOpen={i === 0} />
          ))
        )}
      </div>
    </div>
  );
}
