"use client";

import { memo, useState, useEffect, useRef } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  Wallet,
  MoreVertical,
  CheckCircle2,
  AlertTriangle,
  Shuffle,
  List,
  KeyRound,
} from "lucide-react";
import { useFlowStore } from "@/lib/hooks/useFlowStore";

// ── Constants ──────────────────────────────────────────────────────────────────

const CHAINS = [
  { id: "solana", label: "SOL", color: "#9945FF" },
  { id: "ethereum", label: "ETH", color: "#627EEA" },
  { id: "arbitrum", label: "ARB", color: "#28A0F0" },
  { id: "base", label: "Base", color: "#0052FF" },
  { id: "optimism", label: "OP", color: "#FF0420" },
  { id: "polygon", label: "POLY", color: "#8247E5" },
];

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

// ── Types ──────────────────────────────────────────────────────────────────────

export interface WalletEntry {
  id: string;
  address: string;
  privateKey: string;
  label: string;
  chain: string;
  enabled: boolean;
  walletType: "manual" | "phantom" | "metamask";
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function shortAddress(addr: string) {
  if (!addr || addr.length < 8) return addr || "—";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function isValidAddress(addr: string) {
  return (
    /^0x[0-9a-fA-F]{40}$/.test(addr) ||
    /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr)
  );
}

function chainColor(chainId: string) {
  return CHAINS.find((c) => c.id === chainId)?.color ?? "#64748b";
}

function maskKey(key: string) {
  if (!key) return "";
  return key.slice(0, 4) + "••••••••" + key.slice(-4);
}

// ── Main Component ─────────────────────────────────────────────────────────────

export const MultiWalletNode = memo(({ data, selected, id }: NodeProps) => {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);

  const accent = (data.customColor as string) ?? "#f97316";
  const wallets: WalletEntry[] = Array.isArray(data.wallets)
    ? (data.wallets as WalletEntry[])
    : [];
  const executeSequentially = Boolean(data.executeSequentially ?? true);
  const selectedChain = (data.chain as string) || "solana";

  const [showPopover, setShowPopover] = useState(false);

  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on global closeColorMenus event
  useEffect(() => {
    const close = () => setShowPopover(false);
    window.addEventListener("closeColorMenus", close);
    return () => window.removeEventListener("closeColorMenus", close);
  }, []);

  // Close when clicking anywhere outside the popover or toggle button
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

  const update = (field: string, val: unknown) =>
    updateNodeData(id, { [field]: val });

  const enabledCount = wallets.filter((w) => w.enabled).length;
  const readyCount = wallets.filter((w) => w.enabled && w.privateKey).length;
  const hasInvalidAddress = wallets.some(
    (w) => w.address && !isValidAddress(w.address),
  );
  const hasMissingKeys = wallets.some((w) => w.enabled && !w.privateKey);

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
            <Wallet className="w-3.5 h-3.5" style={{ color: accent }} />
          </div>
          <div>
            <div className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase">
              Multi-Wallet
            </div>
            <div className="text-[9px] font-mono text-slate-600">
              {readyCount}/{wallets.length} ready ·{" "}
              {executeSequentially ? "Sequential" : "Parallel"}
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
        {wallets.length === 0 ? (
          <div
            className="rounded-lg px-3 py-3 flex items-center justify-center"
            style={{
              background: "rgba(15,23,42,0.6)",
              border: `1px solid ${accent}22`,
            }}
          >
            <span className="text-[9px] font-mono text-slate-600">
              No wallets configured
            </span>
          </div>
        ) : (
          <div
            className="rounded-lg px-3 py-2 space-y-1.5"
            style={{
              background: "rgba(15,23,42,0.6)",
              border: `1px solid ${accent}22`,
            }}
          >
            {wallets.slice(0, 3).map((w) => (
              <div
                key={w.id}
                className={`flex items-center gap-2 ${!w.enabled ? "opacity-40" : ""}`}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: chainColor(w.chain) }}
                />
                <span className="text-[9px] font-mono text-slate-300 truncate flex-1">
                  {w.label}
                </span>
                <span className="text-[8px] font-mono text-slate-600">
                  {shortAddress(w.address)}
                </span>
                {w.privateKey ? (
                  <KeyRound className="w-2.5 h-2.5 text-emerald-400 flex-shrink-0" />
                ) : (
                  <KeyRound className="w-2.5 h-2.5 text-red-400/60 flex-shrink-0" />
                )}
              </div>
            ))}
            {wallets.length > 3 && (
              <div className="text-center text-[8px] font-mono text-slate-600">
                +{wallets.length - 3} more
              </div>
            )}
          </div>
        )}

        {/* Warnings */}
        {hasInvalidAddress && (
          <div
            className="rounded-lg px-3 py-1.5 flex items-center gap-2"
            style={{
              background: "rgba(245,158,11,0.06)",
              border: "1px solid rgba(245,158,11,0.2)",
            }}
          >
            <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
            <span className="text-[9px] font-mono text-amber-400">
              Some addresses are invalid
            </span>
          </div>
        )}
        {hasMissingKeys && (
          <div
            className="rounded-lg px-3 py-1.5 flex items-center gap-2"
            style={{
              background: "rgba(239,68,68,0.06)",
              border: "1px solid rgba(239,68,68,0.2)",
            }}
          >
            <KeyRound className="w-3 h-3 text-red-400 shrink-0" />
            <span className="text-[9px] font-mono text-red-400">
              Some wallets missing private key — cannot execute
            </span>
          </div>
        )}

        {/* Status bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {readyCount > 0 && readyCount === enabledCount && (
              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
            )}
            <span className="text-[8px] font-mono text-slate-700">
              {wallets.length === 0
                ? "add wallets to get started"
                : `${readyCount} executable · ${selectedChain}`}
            </span>
          </div>
          {executeSequentially ? (
            <List className="w-3 h-3 text-slate-600" />
          ) : (
            <Shuffle className="w-3 h-3 text-slate-600" />
          )}
        </div>
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
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div
            className="h-px w-full"
            style={{
              background: `linear-gradient(90deg, ${accent}80, transparent 60%)`,
            }}
          />
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
            {!!data.customColor && (
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

MultiWalletNode.displayName = "MultiWalletNode";
