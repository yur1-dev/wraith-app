"use client";

import { memo, useState, useEffect, useRef, useCallback } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  GitBranch,
  MoreVertical,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { useFlowStore } from "@/lib/hooks/useFlowStore";

// ── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchPrice(token: string): Promise<number | null> {
  try {
    const id =
      token.toLowerCase() === "sol"
        ? "solana"
        : token.toLowerCase() === "eth"
          ? "ethereum"
          : token.toLowerCase() === "btc"
            ? "bitcoin"
            : token.toLowerCase();

    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`,
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data[id]?.usd ?? null;
  } catch {
    return null;
  }
}

async function fetchSolanaGas(): Promise<number | null> {
  try {
    const res = await fetch("/api/solana-fees?type=fees");
    if (!res.ok) return null;
    const data = await res.json();
    if (data.error) return null;
    return typeof data.medium === "number" ? data.medium : null;
  } catch {
    return null;
  }
}

async function fetchWalletBalance(address: string): Promise<number | null> {
  if (!address || (!address.startsWith("0x") && address.length < 32))
    return null;
  try {
    const res = await fetch(
      `/api/solana-fees?type=balance&address=${encodeURIComponent(address)}`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.error) return null;
    return typeof data.sol === "number" ? data.sol : null;
  } catch {
    return null;
  }
}

function evaluateCustomExpression(
  expression: string,
  context: Record<string, number>,
): boolean | null {
  if (!expression.trim()) return null;
  try {
    const keys = Object.keys(context);
    const values = Object.values(context);
    let safeExpr = expression;
    for (const key of keys) {
      safeExpr = safeExpr.replace(
        new RegExp(`\\b${key}\\b`, "g"),
        String(context[key]),
      );
    }
    if (!/^[\d\s+\-*/().<>=!&|.]+$/.test(safeExpr)) return null;
    // eslint-disable-next-line no-new-func
    const fn = new Function(...keys, `"use strict"; return !!(${expression});`);
    return fn(...values) as boolean;
  } catch {
    return null;
  }
}

function evaluateCondition(
  value: number,
  operator: string,
  threshold: number,
): boolean {
  switch (operator) {
    case ">":
      return value > threshold;
    case "<":
      return value < threshold;
    case "=":
      return value === threshold;
    case ">=":
      return value >= threshold;
    case "<=":
      return value <= threshold;
    default:
      return false;
  }
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
export const ConditionNode = memo(({ data, selected, id }: NodeProps) => {
  const conditionType = String(data.conditionType ?? "price") as
    | "price"
    | "gas"
    | "balance"
    | "custom";
  const token = String(data.token ?? "SOL");
  const operator = String(data.operator ?? ">");
  const threshold =
    parseFloat(String(data.threshold ?? data.value ?? "0")) || 0;
  const walletAddress = String(data.walletAddress ?? "");
  const expression = String(data.expression ?? "");

  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const customColor = data.customColor as string | undefined;
  const accent = customColor ?? "#eab308";

  const [showPopover, setShowPopover] = useState(false);
  const [liveValue, setLiveValue] = useState<number | null>(null);
  const [result, setResult] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!showPopover) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Element;
      if (
        popoverRef.current?.contains(target) ||
        buttonRef.current?.contains(target)
      )
        return;
      setShowPopover(false);
    };
    window.addEventListener("mousedown", handleClick, true);
    return () => window.removeEventListener("mousedown", handleClick, true);
  }, [showPopover]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const evaluate = useCallback(async () => {
    setLoading(true);
    try {
      if (conditionType === "price") {
        const price = await fetchPrice(token);
        setLiveValue(price);
        if (price !== null) {
          setResult(evaluateCondition(price, operator, threshold));
          setLastUpdated(new Date().toLocaleTimeString());
        }
      } else if (conditionType === "gas") {
        const gas = await fetchSolanaGas();
        setLiveValue(gas);
        if (gas !== null) {
          setResult(evaluateCondition(gas, operator, threshold));
          setLastUpdated(new Date().toLocaleTimeString());
        }
      } else if (conditionType === "balance") {
        const bal = await fetchWalletBalance(walletAddress);
        setLiveValue(bal);
        if (bal !== null) {
          setResult(evaluateCondition(bal, operator, threshold));
          setLastUpdated(new Date().toLocaleTimeString());
        }
      } else if (conditionType === "custom") {
        const [price, gas] = await Promise.all([
          fetchPrice(token),
          fetchSolanaGas(),
        ]);
        const context: Record<string, number> = {};
        if (price !== null) context.price = price;
        if (gas !== null) context.gas = gas;
        context.balance = 0;
        const exprResult = evaluateCustomExpression(expression, context);
        setLiveValue(null);
        setResult(exprResult);
        if (exprResult !== null)
          setLastUpdated(new Date().toLocaleTimeString());
      }
    } catch {
      // silently fail
    }
    setLoading(false);
  }, [conditionType, token, operator, threshold, walletAddress, expression]);

  useEffect(() => {
    evaluate();
    intervalRef.current = setInterval(evaluate, 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [evaluate]);

  const update = (field: string, val: unknown) =>
    updateNodeData(id, { [field]: val });

  const gasUnit = "μ◎";
  const valueUnit =
    conditionType === "price"
      ? "USD"
      : conditionType === "gas"
        ? gasUnit
        : conditionType === "balance"
          ? "SOL"
          : "";

  const liveLabel =
    conditionType === "price"
      ? liveValue !== null
        ? `$${liveValue.toLocaleString()}`
        : "—"
      : conditionType === "gas"
        ? liveValue !== null
          ? `${liveValue.toLocaleString()} ${gasUnit}`
          : "—"
        : conditionType === "balance"
          ? liveValue !== null
            ? `${liveValue.toFixed(4)} SOL`
            : walletAddress
              ? "—"
              : "no address"
          : "custom expr";

  const conditionSummary =
    conditionType === "custom"
      ? expression || "no expression"
      : `${conditionType === "price" ? token : conditionType.toUpperCase()} ${operator} ${threshold} ${valueUnit}`;

  return (
    <div
      className="relative min-w-[260px] rounded-xl transition-all duration-200"
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
            <GitBranch className="w-3.5 h-3.5" style={{ color: accent }} />
          </div>
          <div>
            <div className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase">
              Condition
            </div>
            <div className="text-[9px] font-mono text-slate-600 capitalize">
              {conditionType === "gas" ? "Solana Gas" : conditionType} Check
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
        <div
          className="rounded-lg px-3 py-2"
          style={{
            background: "rgba(15,23,42,0.6)",
            border: `1px solid ${accent}22`,
          }}
        >
          <div className="text-[8px] font-mono text-slate-600 uppercase tracking-widest mb-1">
            Condition
          </div>
          <div
            className="text-[10px] font-mono font-bold"
            style={{ color: accent }}
          >
            {conditionSummary}
          </div>
        </div>

        <div
          className="rounded-lg px-3 py-2 flex items-center justify-between"
          style={{
            background: "rgba(15,23,42,0.6)",
            border: "1px solid rgba(51,65,85,0.4)",
          }}
        >
          <div>
            <div className="text-[8px] font-mono text-slate-600 uppercase tracking-widest mb-0.5">
              Live Value
            </div>
            {loading && liveValue === null ? (
              <Loader2
                className="w-3 h-3 animate-spin"
                style={{ color: accent }}
              />
            ) : (
              <div className="text-[11px] font-mono font-bold text-slate-300">
                {liveLabel}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {result !== null && (
              <div className="flex items-center gap-1">
                {result ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-red-400" />
                )}
                <span
                  className="text-[9px] font-mono font-bold uppercase tracking-widest"
                  style={{ color: result ? "#34d399" : "#f87171" }}
                >
                  {result ? "TRUE" : "FALSE"}
                </span>
              </div>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                evaluate();
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

        {conditionType === "balance" && !walletAddress && (
          <div
            className="rounded-lg px-3 py-1.5 flex items-center gap-2"
            style={{
              background: "rgba(251,191,36,0.06)",
              border: "1px solid rgba(251,191,36,0.15)",
            }}
          >
            <AlertTriangle className="w-3 h-3 text-yellow-400 shrink-0" />
            <span className="text-[9px] font-mono text-yellow-400">
              enter wallet address in config
            </span>
          </div>
        )}

        <div className="text-[8px] font-mono text-slate-700 text-right">
          {lastUpdated ? `updated ${lastUpdated} · every 30s` : "fetching..."}
        </div>
      </div>

      <div className="flex justify-between px-3 pb-2 select-none">
        <span className="text-[8px] font-mono text-emerald-500 font-bold">
          TRUE
        </span>
        <span className="text-[8px] font-mono text-red-500 font-bold">
          FALSE
        </span>
      </div>

      {/* Popover — color only */}
      {showPopover && (
        <div
          ref={popoverRef}
          className="absolute top-0 left-[calc(100%+10px)] z-[100] w-56 rounded-xl overflow-hidden shadow-2xl"
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
          <div className="p-3 space-y-3">
            <div
              className="text-[8px] font-mono font-bold uppercase tracking-widest"
              style={{ color: `${accent}80` }}
            >
              Node Color
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={accent}
                onChange={(e) => update("customColor", e.target.value)}
                className="w-9 h-9 rounded border-2 cursor-pointer"
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
                onClick={() => {
                  update("customColor", undefined);
                  setShowPopover(false);
                }}
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
        id="true"
        className="!w-3 !h-3 !border-2"
        style={{ background: "#34d399", borderColor: "#34d399cc", left: "30%" }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        className="!w-3 !h-3 !border-2"
        style={{ background: "#f87171", borderColor: "#f87171cc", left: "70%" }}
      />
    </div>
  );
});

ConditionNode.displayName = "ConditionNode";
