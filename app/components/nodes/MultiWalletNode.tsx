"use client";

import { memo, useState, useEffect, useCallback } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  Wallet,
  MoreVertical,
  Plus,
  Trash2,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Shuffle,
  List,
  ChevronDown,
  Zap,
  Eye,
  EyeOff,
  KeyRound,
} from "lucide-react";
import { useFlowStore } from "@/lib/hooks/useFlowStore";
import { useWallet } from "@/lib/hooks/useWallet";

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
  privateKey: string; // encrypted/stored in node data — user must provide for execution
  label: string;
  chain: string;
  enabled: boolean;
  walletType: "manual" | "phantom" | "metamask"; // manual = private key entered
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

function isValidPrivateKey(key: string, chain: string) {
  if (!key) return false;
  if (chain === "solana") {
    // Base58 encoded Solana private key (typically 87-88 chars) or array format
    return /^[1-9A-HJ-NP-Za-km-z]{87,88}$/.test(key);
  }
  // EVM: 64 hex chars with or without 0x
  return /^(0x)?[0-9a-fA-F]{64}$/.test(key);
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
  const { wallets: connectedWallets } = useWallet();

  const accent = (data.customColor as string) ?? "#f97316";
  const wallets: WalletEntry[] = Array.isArray(data.wallets)
    ? data.wallets
    : [];
  const executeSequentially = Boolean(data.executeSequentially ?? true);
  const selectedChain = (data.chain as string) || "solana";

  const [tab, setTab] = useState<"config" | "color">("config");
  const [showPopover, setShowPopover] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showKeyId, setShowKeyId] = useState<string | null>(null);

  // Add form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addMode, setAddMode] = useState<"manual" | "connected">("manual");
  const [newAddress, setNewAddress] = useState("");
  const [newPrivateKey, setNewPrivateKey] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newChain, setNewChain] = useState(selectedChain);
  const [showNewKey, setShowNewKey] = useState(false);

  useEffect(() => {
    const close = () => setShowPopover(false);
    window.addEventListener("closeColorMenus", close);
    return () => window.removeEventListener("closeColorMenus", close);
  }, []);

  const update = (field: string, val: unknown) =>
    updateNodeData(id, { [field]: val });

  // ── Add wallet manually ────────────────────────────────────────────────────
  const addManualWallet = useCallback(() => {
    if (!newAddress.trim() || !newPrivateKey.trim()) return;
    const entry: WalletEntry = {
      id: `w-${Date.now()}`,
      address: newAddress.trim(),
      privateKey: newPrivateKey.trim(),
      label: newLabel.trim() || `Wallet ${wallets.length + 1}`,
      chain: newChain,
      enabled: true,
      walletType: "manual",
    };
    updateNodeData(id, { wallets: [...wallets, entry] });
    setNewAddress("");
    setNewPrivateKey("");
    setNewLabel("");
    setShowAddForm(false);
  }, [
    newAddress,
    newPrivateKey,
    newLabel,
    newChain,
    wallets,
    id,
    updateNodeData,
  ]);

  // ── Import from connected wallet (address only — no private key) ───────────
  const importConnectedWallet = useCallback(
    (w: (typeof connectedWallets)[0]) => {
      // Check not already added
      if (wallets.find((existing) => existing.address === w.address)) return;
      const entry: WalletEntry = {
        id: `w-${Date.now()}`,
        address: w.address,
        privateKey: "", // User must add private key separately for execution
        label: w.label,
        chain: w.type === "phantom" ? "solana" : "ethereum",
        enabled: true,
        walletType: w.type === "phantom" ? "phantom" : "metamask",
      };
      updateNodeData(id, { wallets: [...wallets, entry] });
    },
    [wallets, id, updateNodeData],
  );

  // ── Update private key for existing wallet ─────────────────────────────────
  const updatePrivateKey = useCallback(
    (wid: string, key: string) => {
      updateNodeData(id, {
        wallets: wallets.map((w) =>
          w.id === wid ? { ...w, privateKey: key } : w,
        ),
      });
    },
    [wallets, id, updateNodeData],
  );

  const removeWallet = useCallback(
    (wid: string) => {
      updateNodeData(id, { wallets: wallets.filter((w) => w.id !== wid) });
    },
    [wallets, id, updateNodeData],
  );

  const toggleWallet = useCallback(
    (wid: string) => {
      updateNodeData(id, {
        wallets: wallets.map((w) =>
          w.id === wid ? { ...w, enabled: !w.enabled } : w,
        ),
      });
    },
    [wallets, id, updateNodeData],
  );

  const updateWalletLabel = useCallback(
    (wid: string, label: string) => {
      updateNodeData(id, {
        wallets: wallets.map((w) => (w.id === wid ? { ...w, label } : w)),
      });
    },
    [wallets, id, updateNodeData],
  );

  const copyAddress = useCallback((wid: string, addr: string) => {
    navigator.clipboard.writeText(addr).catch(() => {});
    setCopiedId(wid);
    setTimeout(() => setCopiedId(null), 1500);
  }, []);

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
                {/* Key status indicator */}
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

      {/* Popover */}
      {showPopover && (
        <>
          <div
            className="fixed inset-0 z-[90]"
            onClick={() => setShowPopover(false)}
          />
          <div
            className="absolute top-0 left-[calc(100%+10px)] z-[100] w-72 rounded-xl overflow-hidden shadow-2xl"
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

            <div className="p-3 space-y-3 max-h-[560px] overflow-y-auto">
              {tab === "config" && (
                <>
                  {/* Execution mode */}
                  <div className="space-y-1.5">
                    <div className="text-[8px] font-mono font-bold tracking-widest text-slate-500 uppercase">
                      Execution Mode
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {(
                        [
                          { label: "Sequential", value: true, Icon: List },
                          { label: "Parallel", value: false, Icon: Shuffle },
                        ] as const
                      ).map(({ label, value, Icon }) => (
                        <button
                          key={label}
                          onClick={() => update("executeSequentially", value)}
                          className="py-1.5 rounded-lg text-[8px] font-mono font-bold tracking-wider cursor-pointer transition-all flex items-center justify-center gap-1"
                          style={
                            executeSequentially === value
                              ? {
                                  background: `${accent}22`,
                                  color: accent,
                                  border: `1px solid ${accent}55`,
                                }
                              : {
                                  background: "rgba(255,255,255,0.02)",
                                  color: "rgba(148,163,184,0.5)",
                                  border: "1px solid rgba(51,65,85,0.8)",
                                }
                          }
                        >
                          <Icon className="w-3 h-3" />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Default chain */}
                  <div className="space-y-1.5">
                    <div className="text-[8px] font-mono font-bold tracking-widest text-slate-500 uppercase">
                      Default Chain
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {CHAINS.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => update("chain", c.id)}
                          className="py-1.5 rounded-lg text-[8px] font-mono font-bold tracking-wider cursor-pointer transition-all"
                          style={
                            selectedChain === c.id
                              ? {
                                  background: `${accent}22`,
                                  color: accent,
                                  border: `1px solid ${accent}55`,
                                }
                              : {
                                  background: "rgba(255,255,255,0.02)",
                                  color: "rgba(148,163,184,0.5)",
                                  border: "1px solid rgba(51,65,85,0.8)",
                                }
                          }
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Wallet list header */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="text-[8px] font-mono font-bold tracking-widest text-slate-500 uppercase">
                        Wallets ({readyCount}/{wallets.length} ready)
                      </div>
                      <button
                        onClick={() => setShowAddForm((v) => !v)}
                        className="flex items-center gap-0.5 text-[8px] font-mono cursor-pointer"
                        style={{ color: accent }}
                      >
                        <Plus className="w-3 h-3" /> Add
                      </button>
                    </div>

                    {/* Add form */}
                    {showAddForm && (
                      <div
                        className="rounded-lg p-2 space-y-2"
                        style={{
                          background: "rgba(15,23,42,0.6)",
                          border: `1px solid ${accent}22`,
                        }}
                      >
                        {/* Mode toggle */}
                        <div className="grid grid-cols-2 gap-1">
                          {(["manual", "connected"] as const).map((m) => (
                            <button
                              key={m}
                              onClick={() => setAddMode(m)}
                              className="py-1 rounded text-[8px] font-mono font-bold uppercase tracking-wider cursor-pointer transition-all"
                              style={
                                addMode === m
                                  ? {
                                      background: `${accent}22`,
                                      color: accent,
                                      border: `1px solid ${accent}44`,
                                    }
                                  : {
                                      background: "transparent",
                                      color: "rgba(148,163,184,0.4)",
                                      border: "1px solid rgba(51,65,85,0.5)",
                                    }
                              }
                            >
                              {m === "manual"
                                ? "Manual Entry"
                                : "From Connected"}
                            </button>
                          ))}
                        </div>

                        {addMode === "connected" ? (
                          /* Import from connected wallets */
                          <div className="space-y-1">
                            {connectedWallets.length === 0 ? (
                              <div className="py-2 text-center text-[9px] font-mono text-slate-600">
                                No wallets connected
                              </div>
                            ) : (
                              connectedWallets.map((cw) => {
                                const alreadyAdded = wallets.find(
                                  (w) => w.address === cw.address,
                                );
                                return (
                                  <div
                                    key={cw.address}
                                    className="flex items-center gap-2 px-2 py-1.5 rounded"
                                    style={{
                                      background: "rgba(2,6,23,0.6)",
                                      border: "1px solid rgba(51,65,85,0.4)",
                                    }}
                                  >
                                    <div className="flex-1 min-w-0">
                                      <div className="text-[9px] font-mono text-slate-300">
                                        {cw.label}
                                      </div>
                                      <div className="text-[8px] font-mono text-slate-600">
                                        {shortAddress(cw.address)}
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => {
                                        importConnectedWallet(cw);
                                        setShowAddForm(false);
                                      }}
                                      disabled={!!alreadyAdded}
                                      className="px-2 py-0.5 rounded text-[8px] font-mono font-bold cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                      style={
                                        alreadyAdded
                                          ? {
                                              color: "rgba(148,163,184,0.4)",
                                              border:
                                                "1px solid rgba(51,65,85,0.4)",
                                            }
                                          : {
                                              color: accent,
                                              border: `1px solid ${accent}44`,
                                              background: `${accent}10`,
                                            }
                                      }
                                    >
                                      {alreadyAdded ? "Added" : "Import"}
                                    </button>
                                  </div>
                                );
                              })
                            )}
                            <div className="text-[8px] font-mono text-amber-400/70 px-1">
                              ⚠ Private key required after import for execution
                            </div>
                          </div>
                        ) : (
                          /* Manual entry */
                          <>
                            <input
                              value={newLabel}
                              onChange={(e) => setNewLabel(e.target.value)}
                              placeholder="Label (optional)"
                              className="w-full px-2 py-1 rounded text-[10px] font-mono text-slate-200 placeholder-slate-600 focus:outline-none"
                              style={{
                                background: "rgba(2,6,23,0.9)",
                                border: "1px solid rgba(51,65,85,0.8)",
                              }}
                              onFocus={(e) =>
                                (e.target.style.borderColor = accent)
                              }
                              onBlur={(e) =>
                                (e.target.style.borderColor =
                                  "rgba(51,65,85,0.8)")
                              }
                            />
                            <input
                              value={newAddress}
                              onChange={(e) => setNewAddress(e.target.value)}
                              placeholder="Wallet address (0x... or Solana)"
                              className="w-full px-2 py-1 rounded text-[10px] font-mono text-slate-200 placeholder-slate-600 focus:outline-none"
                              style={{
                                background: "rgba(2,6,23,0.9)",
                                border:
                                  newAddress && !isValidAddress(newAddress)
                                    ? "1px solid rgba(248,113,113,0.5)"
                                    : "1px solid rgba(51,65,85,0.8)",
                              }}
                              onFocus={(e) =>
                                (e.target.style.borderColor = accent)
                              }
                              onBlur={(e) =>
                                (e.target.style.borderColor =
                                  "rgba(51,65,85,0.8)")
                              }
                            />
                            {/* Private key input */}
                            <div className="relative">
                              <input
                                value={newPrivateKey}
                                onChange={(e) =>
                                  setNewPrivateKey(e.target.value)
                                }
                                placeholder="Private key (required for execution)"
                                type={showNewKey ? "text" : "password"}
                                className="w-full px-2 py-1 pr-8 rounded text-[10px] font-mono text-slate-200 placeholder-slate-600 focus:outline-none"
                                style={{
                                  background: "rgba(2,6,23,0.9)",
                                  border:
                                    newPrivateKey &&
                                    !isValidPrivateKey(newPrivateKey, newChain)
                                      ? "1px solid rgba(248,113,113,0.5)"
                                      : "1px solid rgba(51,65,85,0.8)",
                                }}
                                onFocus={(e) =>
                                  (e.target.style.borderColor = accent)
                                }
                                onBlur={(e) =>
                                  (e.target.style.borderColor =
                                    "rgba(51,65,85,0.8)")
                                }
                              />
                              <button
                                onClick={() => setShowNewKey((v) => !v)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer"
                                style={{ color: "rgba(100,116,139,0.6)" }}
                              >
                                {showNewKey ? (
                                  <EyeOff className="w-3 h-3" />
                                ) : (
                                  <Eye className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                            <div className="text-[8px] font-mono text-slate-600 px-1">
                              🔒 Stored in flow state (localStorage). Never
                              share your flow file.
                            </div>
                            {/* Chain */}
                            <div className="relative">
                              <select
                                value={newChain}
                                onChange={(e) => setNewChain(e.target.value)}
                                className="w-full px-2 py-1 rounded text-[10px] font-mono text-slate-200 focus:outline-none appearance-none cursor-pointer"
                                style={{
                                  background: "rgba(2,6,23,0.9)",
                                  border: "1px solid rgba(51,65,85,0.8)",
                                }}
                              >
                                {CHAINS.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.label} — {c.id}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={addManualWallet}
                                disabled={
                                  !newAddress.trim() || !newPrivateKey.trim()
                                }
                                className="flex-1 py-1 text-[8px] font-mono font-bold uppercase tracking-widest rounded cursor-pointer transition-all flex items-center justify-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                                style={{
                                  background: `${accent}15`,
                                  border: `1px solid ${accent}33`,
                                  color: accent,
                                }}
                              >
                                <Zap className="w-2.5 h-2.5" /> Add Wallet
                              </button>
                              <button
                                onClick={() => {
                                  setShowAddForm(false);
                                  setNewAddress("");
                                  setNewPrivateKey("");
                                  setNewLabel("");
                                }}
                                className="px-2 py-1 text-[8px] font-mono rounded cursor-pointer transition-all"
                                style={{
                                  color: "rgba(148,163,184,0.5)",
                                  border: "1px solid rgba(51,65,85,0.5)",
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* Wallet entries */}
                    <div className="space-y-1 max-h-52 overflow-y-auto">
                      {wallets.length === 0 && (
                        <div className="py-3 text-center text-[9px] font-mono text-slate-600">
                          No wallets added
                        </div>
                      )}
                      {wallets.map((w) => (
                        <div
                          key={w.id}
                          className="rounded-lg overflow-hidden"
                          style={{
                            border: `1px solid ${w.enabled ? "rgba(51,65,85,0.4)" : "rgba(51,65,85,0.2)"}`,
                          }}
                        >
                          {/* Wallet row */}
                          <div
                            className="flex items-center gap-1.5 px-2 py-1.5"
                            style={{
                              background: w.enabled
                                ? "rgba(15,23,42,0.6)"
                                : "rgba(15,23,42,0.3)",
                              opacity: w.enabled ? 1 : 0.5,
                            }}
                          >
                            <div
                              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                              style={{ background: chainColor(w.chain) }}
                            />
                            <div className="flex-1 min-w-0">
                              {editingId === w.id ? (
                                <input
                                  autoFocus
                                  value={w.label}
                                  onChange={(e) =>
                                    updateWalletLabel(w.id, e.target.value)
                                  }
                                  onBlur={() => setEditingId(null)}
                                  onKeyDown={(e) =>
                                    e.key === "Enter" && setEditingId(null)
                                  }
                                  className="w-full bg-transparent text-[9px] font-mono focus:outline-none border-b"
                                  style={{
                                    color: accent,
                                    borderColor: `${accent}50`,
                                  }}
                                />
                              ) : (
                                <button
                                  onClick={() => setEditingId(w.id)}
                                  className="text-[9px] font-mono text-slate-300 truncate block w-full text-left hover:text-cyan-300 cursor-pointer"
                                >
                                  {w.label}
                                </button>
                              )}
                              <div className="text-[8px] font-mono text-slate-600 truncate">
                                {shortAddress(w.address)}
                              </div>
                            </div>
                            <div className="flex items-center gap-0.5 flex-shrink-0">
                              <button
                                onClick={() => copyAddress(w.id, w.address)}
                                className="p-0.5 rounded cursor-pointer"
                                style={{
                                  color:
                                    copiedId === w.id
                                      ? "#34d399"
                                      : "rgba(100,116,139,0.6)",
                                }}
                              >
                                {copiedId === w.id ? (
                                  <CheckCircle2 className="w-3 h-3" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                              <button
                                onClick={() => toggleWallet(w.id)}
                                className="px-1 py-0.5 rounded text-[7px] font-mono font-bold cursor-pointer transition-all"
                                style={
                                  w.enabled
                                    ? {
                                        background: `${accent}20`,
                                        color: accent,
                                        border: `1px solid ${accent}40`,
                                      }
                                    : {
                                        background: "rgba(51,65,85,0.4)",
                                        color: "rgba(100,116,139,0.5)",
                                        border: "1px solid rgba(51,65,85,0.5)",
                                      }
                                }
                              >
                                {w.enabled ? "ON" : "OFF"}
                              </button>
                              <button
                                onClick={() => removeWallet(w.id)}
                                className="p-0.5 rounded cursor-pointer text-slate-500 hover:text-red-400 transition-all"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          {/* Private key row */}
                          <div
                            className="px-2 py-1.5 border-t"
                            style={{
                              background: "rgba(2,6,23,0.4)",
                              borderColor: "rgba(51,65,85,0.2)",
                            }}
                          >
                            <div className="flex items-center gap-1.5">
                              <KeyRound
                                className="w-3 h-3 flex-shrink-0"
                                style={{
                                  color: w.privateKey ? "#34d399" : "#f87171",
                                }}
                              />
                              {showKeyId === w.id ? (
                                <input
                                  value={w.privateKey}
                                  onChange={(e) =>
                                    updatePrivateKey(w.id, e.target.value)
                                  }
                                  placeholder="Paste private key..."
                                  className="flex-1 bg-transparent text-[8px] font-mono focus:outline-none"
                                  style={{
                                    color: w.privateKey
                                      ? "#34d399"
                                      : "rgba(248,113,113,0.7)",
                                  }}
                                  onBlur={() => setShowKeyId(null)}
                                  autoFocus
                                />
                              ) : (
                                <button
                                  onClick={() => setShowKeyId(w.id)}
                                  className="flex-1 text-left cursor-pointer"
                                >
                                  <span
                                    className="text-[8px] font-mono"
                                    style={{
                                      color: w.privateKey
                                        ? "#34d399"
                                        : "rgba(248,113,113,0.7)",
                                    }}
                                  >
                                    {w.privateKey
                                      ? maskKey(w.privateKey)
                                      : "Click to add private key"}
                                  </span>
                                </button>
                              )}
                              {showKeyId === w.id ? (
                                <button
                                  onClick={() => setShowKeyId(null)}
                                  className="cursor-pointer"
                                  style={{ color: "rgba(100,116,139,0.5)" }}
                                >
                                  <EyeOff className="w-3 h-3" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => setShowKeyId(w.id)}
                                  className="cursor-pointer"
                                  style={{ color: "rgba(100,116,139,0.5)" }}
                                >
                                  <Eye className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
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
                  {data.customColor && (
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

MultiWalletNode.displayName = "MultiWalletNode";
