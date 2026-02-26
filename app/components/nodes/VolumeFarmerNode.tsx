"use client";

import { memo, useState, useEffect, useCallback, useRef } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  MoreVertical,
  Repeat2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  TrendingUp,
  Zap,
  BarChart3,
  RefreshCw,
  ExternalLink,
  ArrowRight,
} from "lucide-react";
import { useFlowStore } from "@/lib/hooks/useFlowStore";
import {
  executeJupiterSwap,
  executeRoundTripSwap,
  TOKEN_MINTS,
} from "@/lib/jupiterSwap";

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

type FarmStatus = "idle" | "running" | "done" | "error" | "stopped";

const TOKEN_PAIRS: Record<
  string,
  { label: string; input: string; output: string; roundTrip: boolean }
> = {
  "sol-usdc-sol": {
    label: "SOL → USDC → SOL",
    input: TOKEN_MINTS.SOL,
    output: TOKEN_MINTS.USDC,
    roundTrip: true,
  },
  "sol-usdc": {
    label: "SOL → USDC",
    input: TOKEN_MINTS.SOL,
    output: TOKEN_MINTS.USDC,
    roundTrip: false,
  },
  "usdc-sol": {
    label: "USDC → SOL",
    input: TOKEN_MINTS.USDC,
    output: TOKEN_MINTS.SOL,
    roundTrip: false,
  },
  "sol-bonk": {
    label: "SOL → BONK",
    input: TOKEN_MINTS.SOL,
    output: TOKEN_MINTS.BONK,
    roundTrip: false,
  },
  "sol-jup": {
    label: "SOL → JUP",
    input: TOKEN_MINTS.SOL,
    output: TOKEN_MINTS.JUP,
    roundTrip: false,
  },
  custom: {
    label: "Custom pair",
    input: "",
    output: "",
    roundTrip: false,
  },
};

export const VolumeFarmerNode = memo(({ data, selected, id }: NodeProps) => {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);

  const swapCount = Math.max(1, Number(data.swapCount ?? 5));
  const swapAmount = Math.max(0.01, Number(data.swapAmount ?? 5));
  const targetVolume = Number(data.targetVolume ?? 0);
  const delayMs = Math.max(500, Number(data.delayMs ?? 1500));
  const dex = String(data.dex ?? "jupiter");
  const chain = String(data.chain ?? "solana");
  const randomize = Boolean(data.randomizeAmounts ?? false);
  const slippageBps = Number(data.slippageBps ?? 50);
  const tokenPairKey = String(data.tokenPair ?? "sol-usdc-sol");
  const customInput = String(data.customInputMint ?? "");
  const customOutput = String(data.customOutputMint ?? "");
  const customColor = data.customColor as string | undefined;
  const accent = customColor ?? "#f59e0b";
  const walletPublicKey = String(
    data.walletPublicKey ?? data.connectedWallet ?? "",
  );

  const [showPopover, setShowPopover] = useState(false);
  const [farmStatus, setFarmStatus] = useState<FarmStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [swapsDone, setSwapsDone] = useState(0);
  const [volumeDone, setVolumeDone] = useState(0);
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [lastTxSig, setLastTxSig] = useState<string | null>(null);
  const [wasStopped, setWasStopped] = useState(false);
  const [currentSwapMsg, setCurrentSwapMsg] = useState<string | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef(false);
  const isRunningRef = useRef(false);

  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

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

  useEffect(() => {
    setLastRun(data.lastRun ? String(data.lastRun) : null);
    setLastTxSig(data.lastTxSig ? String(data.lastTxSig) : null);
  }, [data.lastRun, data.lastTxSig]);

  useEffect(() => {
    if (!isRunningRef.current) {
      setSwapsDone(Number(data.swapsDone ?? 0));
      setVolumeDone(Number(data.volumeDone ?? 0));
    }
  }, [data.swapsDone, data.volumeDone]);

  useEffect(() => {
    return () => {
      abortRef.current = true;
      isRunningRef.current = false;
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  const totalVolume = swapCount * swapAmount;
  const progressPct =
    swapCount > 0 ? Math.min((swapsDone / swapCount) * 100, 100) : 0;
  const pairConfig = TOKEN_PAIRS[tokenPairKey] ?? TOKEN_PAIRS["sol-usdc-sol"];
  const inputMint = tokenPairKey === "custom" ? customInput : pairConfig.input;
  const outputMint =
    tokenPairKey === "custom" ? customOutput : pairConfig.output;
  const isRoundTrip = tokenPairKey !== "custom" && pairConfig.roundTrip;
  const pairFromLabel =
    tokenPairKey === "custom"
      ? customInput.slice(0, 4) + "…"
      : pairConfig.label.split(" → ")[0];
  const pairToLabel =
    tokenPairKey === "custom"
      ? customOutput.slice(0, 4) + "…"
      : pairConfig.label.split(" → ").slice(-1)[0];

  const canRun =
    farmStatus !== "running" &&
    swapCount > 0 &&
    swapAmount > 0 &&
    walletPublicKey.length > 30 &&
    inputMint.length > 30 &&
    outputMint.length > 30;

  const notReadyReason =
    !walletPublicKey || walletPublicKey.length < 30
      ? "No wallet — connect via WalletConnect node"
      : !inputMint || inputMint.length < 30
        ? "Configure token pair in panel"
        : null;

  const dexLabel: Record<string, string> = {
    jupiter: "Jupiter",
    uniswap: "Uniswap",
    raydium: "Raydium",
    pancakeswap: "PancakeSwap",
  };
  const chainLabel: Record<string, string> = {
    solana: "Solana",
    arbitrum: "Arbitrum",
    base: "Base",
    optimism: "Optimism",
    ethereum: "Ethereum",
    polygon: "Polygon",
  };

  const handleRun = useCallback(async () => {
    if (farmStatus === "running") return;

    if (!walletPublicKey || walletPublicKey.length < 30) {
      setErrorMsg("Connect a wallet first via WalletConnect node");
      setFarmStatus("error");
      return;
    }
    if (
      !inputMint ||
      inputMint.length < 30 ||
      !outputMint ||
      outputMint.length < 30
    ) {
      setErrorMsg("Configure token pair in panel");
      setFarmStatus("error");
      return;
    }

    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }

    abortRef.current = false;
    isRunningRef.current = true;
    setFarmStatus("running");
    setErrorMsg(null);
    setWasStopped(false);
    setCurrentSwapMsg(null);
    setSwapsDone(0);
    setVolumeDone(0);
    setLastTxSig(null);
    updateNodeData(id, { swapsDone: 0, volumeDone: 0, lastStatus: "running" });

    try {
      let completed = 0;
      let vol = 0;

      for (let i = 0; i < swapCount; i++) {
        if (abortRef.current) break;

        const effectiveAmount = randomize
          ? parseFloat((swapAmount * (0.8 + Math.random() * 0.4)).toFixed(4))
          : swapAmount;

        setCurrentSwapMsg(
          isRoundTrip
            ? `Swap ${i + 1}/${swapCount}: SOL → USDC → SOL ($${effectiveAmount})`
            : `Swap ${i + 1}/${swapCount}: $${effectiveAmount} — waiting wallet…`,
        );

        let result;
        if (isRoundTrip) {
          result = await executeRoundTripSwap({
            amountUSD: effectiveAmount,
            slippageBps,
            walletPublicKey,
          });
        } else {
          result = await executeJupiterSwap({
            inputMint,
            outputMint,
            amountUSD: effectiveAmount,
            slippageBps,
            walletPublicKey,
          });
        }

        if (abortRef.current) break;

        completed++;
        vol = parseFloat((vol + effectiveAmount).toFixed(4));

        setSwapsDone(completed);
        setVolumeDone(vol);
        setLastTxSig(result.txSignature);
        setCurrentSwapMsg(`Swap ${completed}/${swapCount} confirmed ✓`);

        updateNodeData(id, {
          swapsDone: completed,
          volumeDone: vol,
          lastTxSig: result.txSignature,
        });

        if (i < swapCount - 1 && !abortRef.current) {
          const jitter = Math.floor(Math.random() * 500);
          const waitSec = ((delayMs + jitter) / 1000).toFixed(1);
          setCurrentSwapMsg(`Waiting ${waitSec}s before next swap…`);
          await new Promise((res) => setTimeout(res, delayMs + jitter));
        }
      }

      isRunningRef.current = false;
      setCurrentSwapMsg(null);

      if (abortRef.current) {
        setFarmStatus("stopped");
        setWasStopped(true);
        updateNodeData(id, { lastStatus: "stopped" });
        resetTimerRef.current = setTimeout(() => {
          setFarmStatus("idle");
          resetTimerRef.current = null;
        }, 3000);
        return;
      }

      const now = new Date().toLocaleTimeString();
      setLastRun(now);
      updateNodeData(id, { lastRun: now, lastStatus: "done" });
      setFarmStatus("done");

      resetTimerRef.current = setTimeout(() => {
        setFarmStatus("idle");
        resetTimerRef.current = null;
      }, 5000);
    } catch (err: unknown) {
      isRunningRef.current = false;
      setCurrentSwapMsg(null);
      const msg = err instanceof Error ? err.message : "Farm failed";
      setErrorMsg(msg);
      updateNodeData(id, { lastStatus: "error" });
      setFarmStatus("error");
    }
  }, [
    farmStatus,
    swapCount,
    swapAmount,
    delayMs,
    slippageBps,
    randomize,
    dex,
    chain,
    id,
    walletPublicKey,
    inputMint,
    outputMint,
    isRoundTrip,
    updateNodeData,
  ]);

  const handleStop = useCallback(() => {
    abortRef.current = true;
    setErrorMsg(null);
    setCurrentSwapMsg("Stopping after current swap confirms…");
  }, []);

  const handleRunAgain = useCallback(() => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
    setFarmStatus("idle");
    setTimeout(() => handleRun(), 50);
  }, [handleRun]);

  const statusConfig: Record<
    FarmStatus,
    { color: string; label: string; icon: React.ReactNode }
  > = {
    idle: {
      color: "#475569",
      label: "Ready",
      icon: <BarChart3 className="w-3 h-3" />,
    },
    running: {
      color: "#f59e0b",
      label: "Farming…",
      icon: <Loader2 className="w-3 h-3 animate-spin" />,
    },
    done: {
      color: "#34d399",
      label: "Done",
      icon: <CheckCircle2 className="w-3 h-3" />,
    },
    stopped: {
      color: "#94a3b8",
      label: "Stopped",
      icon: <BarChart3 className="w-3 h-3" />,
    },
    error: {
      color: "#f87171",
      label: "Error",
      icon: <AlertTriangle className="w-3 h-3" />,
    },
  };
  const sc = statusConfig[farmStatus];

  return (
    <div
      className="relative min-w-[280px] rounded-xl transition-all duration-200"
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
            <Repeat2 className="w-3.5 h-3.5" style={{ color: accent }} />
          </div>
          <div>
            <div className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase">
              Volume Farmer
            </div>
            <div className="text-[9px] font-mono text-slate-600">
              {dexLabel[dex] ?? dex} · {chainLabel[chain] ?? chain}
              {randomize && " · rng"} · {slippageBps / 100}% slip
            </div>
          </div>
        </div>
        <button
          ref={buttonRef}
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
        {/* Wallet indicator */}
        <div
          className="rounded-lg px-3 py-2 flex items-center justify-between"
          style={{
            background: "rgba(15,23,42,0.6)",
            border:
              walletPublicKey && walletPublicKey.length > 30
                ? `1px solid ${accent}22`
                : "1px solid rgba(248,113,113,0.2)",
          }}
        >
          <div className="text-[8px] font-mono text-slate-600 uppercase tracking-widest">
            Wallet
          </div>
          {walletPublicKey && walletPublicKey.length > 30 ? (
            <div className="text-[9px] font-mono" style={{ color: accent }}>
              {walletPublicKey.slice(0, 4)}…{walletPublicKey.slice(-4)}
            </div>
          ) : (
            <div className="text-[9px] font-mono text-red-400">
              Not connected
            </div>
          )}
        </div>

        {/* Config: swaps + pair */}
        <div
          className="rounded-lg px-3 py-2.5 flex items-center justify-between"
          style={{
            background: "rgba(15,23,42,0.6)",
            border: `1px solid ${accent}22`,
          }}
        >
          <div className="space-y-0.5">
            <div className="text-[8px] font-mono text-slate-600 uppercase tracking-widest">
              Per Run
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" style={{ color: accent }} />
              <span
                className="text-sm font-mono font-bold"
                style={{ color: accent }}
              >
                {swapCount} × ${swapAmount}
              </span>
            </div>
            <div className="text-[8px] font-mono text-slate-600">
              = ${totalVolume.toFixed(2)} total
              {targetVolume > 0 && ` · target $${targetVolume}`}
            </div>
          </div>
          <div className="text-right space-y-0.5">
            <div className="text-[8px] font-mono text-slate-600 uppercase tracking-widest">
              Pair
            </div>
            <div className="flex items-center gap-1" style={{ color: accent }}>
              <span className="text-[9px] font-mono font-bold">
                {pairFromLabel}
              </span>
              <ArrowRight className="w-2.5 h-2.5" />
              <span className="text-[9px] font-mono font-bold">
                {pairToLabel}
              </span>
            </div>
            <div className="text-[8px] font-mono text-slate-600">
              {delayMs / 1000}s delay
            </div>
          </div>
        </div>

        {/* Live swap message */}
        {farmStatus === "running" && currentSwapMsg && (
          <div
            className="rounded-lg px-3 py-1.5"
            style={{
              background: "rgba(15,23,42,0.4)",
              border: `1px solid ${accent}15`,
            }}
          >
            <div
              className="text-[8px] font-mono"
              style={{ color: `${accent}cc` }}
            >
              {currentSwapMsg}
            </div>
          </div>
        )}

        {/* Progress bar */}
        {farmStatus === "running" && (
          <div
            className="rounded-lg px-3 py-2 space-y-1.5"
            style={{
              background: "rgba(15,23,42,0.4)",
              border: "1px solid rgba(51,65,85,0.3)",
            }}
          >
            <div className="flex justify-between items-center">
              <span className="text-[8px] font-mono text-slate-600 uppercase tracking-widest">
                Progress
              </span>
              <span className="text-[9px] font-mono" style={{ color: accent }}>
                {swapsDone}/{swapCount} · ${volumeDone} vol
              </span>
            </div>
            <div
              className="w-full h-1.5 rounded-full"
              style={{ background: "rgba(51,65,85,0.4)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progressPct}%`,
                  background: `linear-gradient(90deg, ${accent}, ${accent}cc)`,
                }}
              />
            </div>
          </div>
        )}

        {/* Stats after run */}
        {(farmStatus === "done" ||
          farmStatus === "stopped" ||
          (farmStatus === "idle" && swapsDone > 0)) && (
          <div
            className="rounded-lg px-3 py-2 space-y-1.5"
            style={{
              background: "rgba(15,23,42,0.4)",
              border: wasStopped
                ? "1px solid rgba(148,163,184,0.2)"
                : "1px solid rgba(52,211,153,0.2)",
            }}
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                {wasStopped ? (
                  <>
                    <BarChart3 className="w-3 h-3 text-slate-500" />
                    <span className="text-[9px] font-mono text-slate-500">
                      Stopped · {swapsDone}/{swapCount} · ${volumeDone}
                    </span>
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-3 h-3 text-emerald-400" />
                    <span className="text-[9px] font-mono text-emerald-400">
                      {swapsDone} swaps · ${volumeDone} volume
                    </span>
                  </>
                )}
              </div>
              {lastRun && (
                <span className="text-[8px] font-mono text-slate-700">
                  {lastRun}
                </span>
              )}
            </div>
            {lastTxSig && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(`https://solscan.io/tx/${lastTxSig}`, "_blank");
                }}
                className="flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
              >
                <ExternalLink className="w-2.5 h-2.5 text-slate-600" />
                <span className="text-[8px] font-mono text-slate-600 hover:text-slate-400">
                  {lastTxSig.slice(0, 8)}…{lastTxSig.slice(-6)} ↗ solscan
                </span>
              </button>
            )}
          </div>
        )}

        {/* Status row */}
        <div
          className="rounded-lg px-3 py-2 flex items-center justify-between"
          style={{
            background: "rgba(15,23,42,0.4)",
            border: "1px solid rgba(51,65,85,0.3)",
          }}
        >
          <div className="flex items-center gap-1.5">
            <span style={{ color: sc.color }}>{sc.icon}</span>
            <span className="text-[9px] font-mono" style={{ color: sc.color }}>
              {farmStatus === "error" ? (errorMsg ?? "Error") : sc.label}
            </span>
          </div>
          {notReadyReason && farmStatus === "idle" && (
            <span className="text-[8px] font-mono text-red-400/60 text-right max-w-[120px] leading-tight">
              {notReadyReason}
            </span>
          )}
        </div>

        {/* Action button */}
        {farmStatus === "running" ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleStop();
            }}
            className="w-full py-1.5 rounded-lg text-[9px] font-mono font-bold uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-1.5"
            style={{
              background: "rgba(248,113,113,0.08)",
              border: "1px solid rgba(248,113,113,0.25)",
              color: "#f87171",
            }}
          >
            <Loader2 className="w-3 h-3 animate-spin" /> Stop Farming
          </button>
        ) : farmStatus === "done" ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRunAgain();
            }}
            className="w-full py-1.5 rounded-lg text-[9px] font-mono font-bold uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-1.5"
            style={{
              background: "rgba(52,211,153,0.08)",
              border: "1px solid rgba(52,211,153,0.25)",
              color: "#34d399",
            }}
          >
            <RefreshCw className="w-3 h-3" /> Run Again
          </button>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRun();
            }}
            disabled={!canRun}
            className="w-full py-1.5 rounded-lg text-[9px] font-mono font-bold uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:cursor-not-allowed"
            style={{
              background: `${accent}18`,
              border: `1px solid ${accent}44`,
              color: accent,
              opacity: !canRun ? 0.4 : 1,
            }}
          >
            <Repeat2 className="w-3 h-3" />
            {farmStatus === "stopped" ? "Start Again" : "Start Farming"}
          </button>
        )}
      </div>

      {/* Popover — color only */}
      {showPopover && (
        <div
          ref={popoverRef}
          className="absolute top-0 left-[calc(100%+10px)] z-[100] w-52 rounded-xl overflow-hidden shadow-2xl"
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
                Reset
              </button>
            )}
          </div>
        </div>
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

VolumeFarmerNode.displayName = "VolumeFarmerNode";
