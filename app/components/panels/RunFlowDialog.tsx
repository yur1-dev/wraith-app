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
import { FeeConfirmStep } from "@/app/components/panels/FeeConfirmStep";
import { useWallet } from "@/lib/hooks/useWallet";
import { Connection, VersionedTransaction, PublicKey } from "@solana/web3.js";
import type { Node } from "@xyflow/react";

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
  explorerUrl?: string;
  duration?: number;
}

interface RunFlowDialogProps {
  open: boolean;
  onClose: () => void;
}

// ── Constants ──────────────────────────────────────────────────────

const TOKEN_ADDRESSES: Record<string, string> = {
  SOL: "So11111111111111111111111111111111111111112",
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  BONK: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
  JUP: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
  RAY: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
};

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

// ── Jupiter swap (real, client-side via Phantom) ───────────────────

async function executeJupiterSwap(
  node: Node,
  walletAddress: string,
  proxyBase: string,
): Promise<{
  success: boolean;
  signature?: string;
  explorerUrl?: string;
  error?: string;
  output?: Record<string, unknown>;
}> {
  const { fromToken, toToken, amount, slippage } = node.data as {
    fromToken?: string;
    toToken?: string;
    amount?: string | number;
    slippage?: string | number;
  };

  const inputMint =
    TOKEN_ADDRESSES[(fromToken || "SOL").toUpperCase()] ||
    fromToken ||
    TOKEN_ADDRESSES.SOL;
  const outputMint =
    TOKEN_ADDRESSES[(toToken || "USDC").toUpperCase()] ||
    toToken ||
    TOKEN_ADDRESSES.USDC;
  const decimals = (fromToken || "SOL").toUpperCase() === "USDC" ? 6 : 9;
  const amountLamports = Math.floor(
    parseFloat(String(amount || "0.01")) * Math.pow(10, decimals),
  );
  const slippageBps = Math.floor(parseFloat(String(slippage || "1")) * 100);

  // 1. Get quote via proxy
  const quoteParams = new URLSearchParams({
    inputMint,
    outputMint,
    amount: String(amountLamports),
    slippageBps: String(slippageBps),
  });

  const quoteRes = await fetch(`${proxyBase}/api/jupiter/quote?${quoteParams}`);
  if (!quoteRes.ok) throw new Error(`Quote failed: ${await quoteRes.text()}`);
  const quote = await quoteRes.json();

  if (quote.error) throw new Error(`Jupiter quote error: ${quote.error}`);

  // 2. Get swap transaction via proxy
  const swapRes = await fetch(`${proxyBase}/api/jupiter/swap`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      quoteResponse: quote,
      userPublicKey: walletAddress,
      wrapAndUnwrapSol: true,
    }),
  });
  if (!swapRes.ok) throw new Error(`Swap tx failed: ${await swapRes.text()}`);
  const swapData = await swapRes.json();

  if (swapData.error) throw new Error(`Jupiter swap error: ${swapData.error}`);

  // 3. Deserialize transaction
  const swapTransactionBuf = Buffer.from(swapData.swapTransaction, "base64");
  const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

  // 4. Sign with Phantom
  const phantom = (window as any).solana;
  if (!phantom?.isPhantom) throw new Error("Phantom wallet not found");

  const { signature: signedTx } =
    await phantom.signAndSendTransaction(transaction);

  // 5. Confirm on-chain
  const connection = new Connection(
    "https://api.mainnet-beta.solana.com",
    "confirmed",
  );
  const confirmation = await connection.confirmTransaction(
    signedTx,
    "confirmed",
  );

  if (confirmation.value.err) {
    throw new Error(
      `Transaction failed on-chain: ${JSON.stringify(confirmation.value.err)}`,
    );
  }

  const explorerUrl = `https://solscan.io/tx/${signedTx}`;

  return {
    success: true,
    signature: signedTx,
    explorerUrl,
    output: {
      fromToken: fromToken || "SOL",
      toToken: toToken || "USDC",
      amount,
      amountOut: (parseInt(quote.outAmount) / Math.pow(10, 6)).toFixed(4),
      dex: "Jupiter",
      explorerUrl,
    },
  };
}

// ── Wait/Delay executor ────────────────────────────────────────────

async function executeWaitDelay(
  node: Node,
): Promise<{ success: boolean; output?: Record<string, unknown> }> {
  const seconds = parseInt(
    String(node.data?.seconds || node.data?.delay || "3"),
  );
  await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
  return { success: true, output: { waited: `${seconds}s` } };
}

// ── Main Component ─────────────────────────────────────────────────

export function RunFlowDialog({ open, onClose }: RunFlowDialogProps) {
  const { nodes, edges } = useFlowStore();
  const walletAddress = useWallet((s) => s.walletAddress());
  const walletType = useWallet((s) => s.walletType());
  const wallets = useWallet((s) => s.wallets);
  const isConnected = useWallet((s) => s.isConnected());

  const [phase, setPhase] = useState<"ready" | "fee" | "running" | "done">(
    "ready",
  );
  const [nodeResults, setNodeResults] = useState<NodeResult[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [feeSignature, setFeeSignature] = useState<string | null>(null);
  const [overallStatus, setOverallStatus] = useState<
    "completed" | "failed" | null
  >(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const proxyBase = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  useEffect(() => {
    if (open) {
      setPhase("ready");
      setNodeResults([]);
      setExpandedNodes(new Set());
      setOverallStatus(null);
      setFeeSignature(null);
      setElapsedMs(0);
    }
  }, [open]);

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

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [nodeResults]);

  const formatMs = (ms: number) =>
    ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;

  const handleRun = async () => {
    if (!isConnected || !walletAddress) return;
    setPhase("fee");
  };

  const handleFeeSkipped = () => {
    setFeeSignature("dev-skip");
    startExecution();
  };

  const handleFeePaid = (signature: string) => {
    setFeeSignature(signature);
    startExecution();
  };

  const setNodeStatus = (nodeId: string, update: Partial<NodeResult>) => {
    setNodeResults((prev) =>
      prev.map((n) => (n.nodeId === nodeId ? { ...n, ...update } : n)),
    );
  };

  const startExecution = async () => {
    setPhase("running");

    // Topological order
    const incomingEdges = new Set(edges.map((e) => e.target));
    const ordered = [
      ...nodes.filter((n) => !incomingEdges.has(n.id)),
      ...nodes.filter((n) => incomingEdges.has(n.id)),
    ];

    const initialResults: NodeResult[] = ordered.map((node) => ({
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

    let failed = false;

    for (const node of ordered) {
      if (failed) {
        setNodeStatus(node.id, { status: "skipped" });
        continue;
      }

      const nodeStart = Date.now();
      setNodeStatus(node.id, { status: "running" });

      try {
        let result: {
          success: boolean;
          signature?: string;
          explorerUrl?: string;
          error?: string;
          output?: Record<string, unknown>;
        };

        if (node.type === "swap" && walletType === "phantom") {
          // ✅ Real Jupiter swap via Phantom
          result = await executeJupiterSwap(node, walletAddress!, proxyBase);
        } else if (node.type === "waitDelay") {
          result = await executeWaitDelay(node);
        } else {
          // For all other nodes: call the API route (price checks, social, etc.)
          const res = await fetch("/api/execute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              nodes: [node],
              edges: [],
              walletAddress,
              walletType,
              allWallets: wallets.map((w) => ({
                address: w.address,
                type: w.type,
                label: w.label,
              })),
            }),
          });
          const data = await res.json();
          const r = data.results?.[0];
          result = {
            success: r?.success ?? false,
            error: r?.error,
            output: r?.output,
            signature: r?.signature,
          };
        }

        const duration = Date.now() - nodeStart;

        if (result.success) {
          setNodeStatus(node.id, {
            status: "success",
            duration,
            output: result.output,
            signature: result.signature,
            explorerUrl: result.explorerUrl,
          });
        } else {
          setNodeStatus(node.id, {
            status: "failed",
            duration,
            error: result.error || "Unknown error",
          });
          failed = true;
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setNodeStatus(node.id, {
          status: "failed",
          duration: Date.now() - nodeStart,
          error: message,
        });
        failed = true;
      }

      await new Promise((resolve) => setTimeout(resolve, 150));
    }

    setOverallStatus(failed ? "failed" : "completed");
    setPhase("done");
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
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
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
                : phase === "fee"
                  ? "linear-gradient(90deg, transparent, #c084fc, #818cf8, transparent)"
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
                  : phase === "fee"
                    ? "Protocol Fee"
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

        {/* Wallet info */}
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
            {wallets.length > 1 && (
              <span
                className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                style={{
                  background: "rgba(34,211,238,0.12)",
                  color: "#22d3ee",
                  border: "1px solid rgba(34,211,238,0.25)",
                }}
              >
                +{wallets.length - 1} more
              </span>
            )}
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

        {/* FEE STEP */}
        {phase === "fee" && (
          <FeeConfirmStep
            walletType={walletType ?? "metamask"}
            onFeePaid={handleFeePaid}
            onSkip={handleFeeSkipped}
            onCancel={onClose}
          />
        )}

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
                  <div
                    className="flex items-center gap-3 p-3"
                    onClick={() => hasDetails && toggleExpand(result.nodeId)}
                    style={{ cursor: hasDetails ? "pointer" : "default" }}
                  >
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
                    <span className="text-[10px] text-slate-600 font-mono w-4 shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-sm shrink-0">{meta.emoji}</span>
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
                    {result.duration && (
                      <span className="text-[10px] font-mono text-slate-600 shrink-0">
                        {formatMs(result.duration)}
                      </span>
                    )}
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
                      {result.explorerUrl && (
                        <a
                          href={result.explorerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 flex items-center gap-2 hover:opacity-80 transition-opacity"
                        >
                          <span className="text-[10px] text-slate-500 font-mono">
                            tx:
                          </span>
                          <span className="text-[10px] text-cyan-400 font-mono truncate flex-1">
                            {result.signature}
                          </span>
                          <ExternalLink
                            size={10}
                            className="shrink-0"
                            style={{ color: "#22d3ee" }}
                          />
                        </a>
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
                            .filter(([k]) => k !== "explorerUrl")
                            .map(([k, v]) => (
                              <div key={k} className="flex gap-2">
                                <span style={{ color: "#818cf8" }}>{k}:</span>
                                <span>
                                  {typeof v === "object"
                                    ? JSON.stringify(v)
                                    : String(v)}
                                </span>
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

        {/* Progress bar */}
        {phase === "running" && (
          <div className="px-5 pb-2 shrink-0">
            <div
              className="h-0.5 rounded-full overflow-hidden"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(nodeResults.filter((r) => r.status === "success" || r.status === "failed").length / Math.max(totalCount, 1)) * 100}%`,
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
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full ml-auto mr-2"
                style={{
                  background: "rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.7)",
                }}
              >
                fee: {walletType === "phantom" ? "0.001 SOL" : "0.00079 ETH"}
              </span>
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
                  setPhase("fee");
                  setNodeResults([]);
                  setOverallStatus(null);
                  setElapsedMs(0);
                  setFeeSignature(null);
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
