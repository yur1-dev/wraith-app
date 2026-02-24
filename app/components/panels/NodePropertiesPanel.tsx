"use client";

import { useFlowStore } from "@/lib/hooks/useFlowStore";
import { Input } from "@/components/ui/input";
import {
  X,
  Trash2,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  ChevronDown,
  Check,
  Plus,
  Copy,
  KeyRound,
  Eye,
  EyeOff,
  Shuffle,
  List,
  AlertTriangle,
} from "lucide-react";
import { useTelegram } from "@/lib/hooks/useTelegram";
import { useWallet } from "@/lib/hooks/useWallet";
import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import type { WalletEntry } from "@/app/components/nodes/MultiWalletNode";

const str = (val: unknown, fallback = ""): string =>
  typeof val === "string" ? val : fallback;
const bool = (val: unknown, fallback = false): boolean =>
  typeof val === "boolean" ? val : fallback;

const NODE_COLORS: Record<string, string> = {
  trigger: "#a855f7",
  multiWallet: "#f97316",
  swap: "#3b82f6",
  bridge: "#06b6d4",
  chainSwitch: "#8b5cf6",
  alert: "#f59e0b",
  condition: "#eab308",
  walletConnect: "#10b981",
  lendStake: "#10b981",
  twitter: "#38bdf8",
  discord: "#818cf8",
  galxe: "#a78bfa",
  volumeFarmer: "#f59e0b",
  claimAirdrop: "#f43f5e",
  waitDelay: "#94a3b8",
  loop: "#e879f9",
  priceCheck: "#2dd4bf",
  gasOptimizer: "#84cc16",
};

const NODE_LABELS: Record<string, string> = {
  trigger: "TRIGGER",
  multiWallet: "MULTI-WALLET",
  swap: "TOKEN SWAP",
  bridge: "BRIDGE",
  chainSwitch: "CHAIN SWITCH",
  alert: "ALERT",
  condition: "CONDITION",
  walletConnect: "WALLET CONNECT",
  lendStake: "LEND / STAKE",
  twitter: "TWITTER TASK",
  discord: "DISCORD TASK",
  galxe: "GALXE TASK",
  volumeFarmer: "VOLUME FARMER",
  claimAirdrop: "CLAIM AIRDROP",
  waitDelay: "WAIT / DELAY",
  loop: "LOOP",
  priceCheck: "PRICE CHECK",
  gasOptimizer: "GAS OPTIMIZER",
};

const SEVERITY_COLORS: Record<string, string> = {
  info: "#38bdf8",
  success: "#34d399",
  warning: "#fbbf24",
  urgent: "#f87171",
};

const WALLET_CHAINS = [
  { id: "solana", label: "Solana", color: "#9945FF" },
  { id: "ethereum", label: "Ethereum", color: "#627EEA" },
  { id: "arbitrum", label: "Arbitrum", color: "#28A0F0" },
  { id: "base", label: "Base", color: "#0052FF" },
  { id: "optimism", label: "Optimism", color: "#FF0420" },
  { id: "polygon", label: "Polygon", color: "#8247E5" },
];

function shortAddr(addr: string) {
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
  if (chain === "solana") return /^[1-9A-HJ-NP-Za-km-z]{87,88}$/.test(key);
  return /^(0x)?[0-9a-fA-F]{64}$/.test(key);
}

function maskKey(key: string) {
  if (!key) return "";
  return key.slice(0, 4) + "••••••••" + key.slice(-4);
}

function chainColor(chainId: string) {
  return WALLET_CHAINS.find((c) => c.id === chainId)?.color ?? "#64748b";
}

function FieldGroup({ children }: { children: React.ReactNode }) {
  return <div className="space-y-1.5">{children}</div>;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[9px] font-mono font-bold tracking-widest text-slate-500 uppercase">
      {children}
    </div>
  );
}

function StyledInput(props: React.ComponentProps<typeof Input>) {
  return (
    <Input
      {...props}
      className={`h-8 bg-slate-950 border-slate-700/80 text-cyan-100 text-xs font-mono
        focus:border-cyan-500 focus:ring-0 focus:ring-offset-0
        placeholder:text-slate-600 transition-colors ${props.className ?? ""}`}
    />
  );
}

function StyledTextarea(
  props: React.ComponentProps<"textarea"> & { rows?: number },
) {
  return (
    <textarea
      {...props}
      className={`w-full bg-slate-950 border border-slate-700/80 text-cyan-100 text-xs font-mono
        rounded-md px-3 py-2 focus:outline-none focus:border-cyan-500
        placeholder:text-slate-600 resize-none transition-colors ${props.className ?? ""}`}
    />
  );
}

function StyledCheckbox({
  id,
  checked,
  onChange,
  label,
}: {
  id: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label: string;
}) {
  return (
    <label
      htmlFor={id}
      className="flex items-center gap-2.5 cursor-pointer group"
    >
      <div className="relative">
        <input
          type="checkbox"
          id={id}
          checked={checked}
          onChange={onChange}
          className="sr-only"
        />
        <div
          className={`w-4 h-4 rounded border transition-all ${checked ? "bg-cyan-500 border-cyan-500" : "bg-slate-950 border-slate-600 group-hover:border-cyan-500/50"}`}
        >
          {checked && (
            <svg
              viewBox="0 0 10 8"
              className="w-full h-full p-0.5 text-slate-950"
            >
              <path
                d="M1 4l2.5 2.5L9 1"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
          )}
        </div>
      </div>
      <span className="text-xs font-mono text-slate-400 group-hover:text-cyan-400 transition-colors">
        {label}
      </span>
    </label>
  );
}

function StyledSelect({
  options,
  value,
  onChange,
  accent,
  placeholder,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  accent: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownHeight = Math.min(options.length * 36 + 8, 220);
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const showAbove = spaceBelow < dropdownHeight && rect.top > dropdownHeight;
    setDropdownStyle({
      position: "fixed",
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      zIndex: 99999,
      top: showAbove
        ? `${rect.top - dropdownHeight - 4}px`
        : `${rect.bottom + 4}px`,
    });
  }, [options.length]);

  const handleOpen = () => {
    updatePosition();
    setOpen((o) => !o);
  };

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      )
        return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, updatePosition]);

  const dropdown = open ? (
    <div
      ref={dropdownRef}
      style={{
        ...dropdownStyle,
        background: "rgba(2, 6, 23, 0.99)",
        border: `1px solid ${accent}44`,
        borderRadius: "8px",
        boxShadow: `0 16px 48px rgba(0,0,0,0.9), 0 0 24px ${accent}15`,
        backdropFilter: "blur(24px)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "1px",
          background: `linear-gradient(90deg, ${accent}90, transparent 70%)`,
        }}
      />
      <div style={{ padding: "4px 0", maxHeight: "210px", overflowY: "auto" }}>
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-mono cursor-pointer transition-all duration-100"
              style={
                active
                  ? { background: `${accent}18`, color: accent }
                  : {
                      color: "rgba(148,163,184,0.75)",
                      background: "transparent",
                    }
              }
              onMouseEnter={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    `${accent}0d`;
                  (e.currentTarget as HTMLButtonElement).style.color =
                    "rgba(203,213,225,0.9)";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "transparent";
                  (e.currentTarget as HTMLButtonElement).style.color =
                    "rgba(148,163,184,0.75)";
                }
              }}
            >
              <span>{opt.label}</span>
              {active && (
                <Check className="w-3 h-3 shrink-0" style={{ color: accent }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  ) : null;

  return (
    <div className="relative w-full">
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        className="w-full h-8 flex items-center justify-between px-3 rounded-md text-xs font-mono transition-all duration-150 cursor-pointer"
        style={{
          background: open ? `${accent}12` : "rgba(2, 6, 23, 0.9)",
          border: open
            ? `1px solid ${accent}55`
            : "1px solid rgba(51,65,85,0.8)",
          color: selected ? "#a5f3fc" : "rgba(100,116,139,0.6)",
        }}
      >
        <span className="truncate">
          {selected ? selected.label : (placeholder ?? "Select...")}
        </span>
        <ChevronDown
          className="w-3 h-3 shrink-0 ml-2"
          style={{
            color: accent,
            opacity: 0.7,
            transition: "transform 200ms",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>
      {typeof document !== "undefined" && dropdown
        ? createPortal(dropdown, document.body)
        : null}
    </div>
  );
}

const CHAINS_EVM = [
  { value: "Ethereum", label: "Ethereum" },
  { value: "Arbitrum", label: "Arbitrum" },
  { value: "Optimism", label: "Optimism" },
  { value: "Polygon", label: "Polygon" },
  { value: "Base", label: "Base" },
  { value: "Avalanche", label: "Avalanche" },
  { value: "BSC", label: "BSC" },
  { value: "zkSync", label: "zkSync" },
  { value: "Linea", label: "Linea" },
];

const BRIDGE_PROTOCOL_CHAINS: Record<
  string,
  { value: string; label: string }[]
> = {
  Across: [
    "Ethereum",
    "Arbitrum",
    "Optimism",
    "Polygon",
    "Base",
    "Linea",
    "zkSync",
  ].map((c) => ({ value: c, label: c })),
  Hop: ["Ethereum", "Arbitrum", "Optimism", "Polygon", "Base"].map((c) => ({
    value: c,
    label: c,
  })),
  Synapse: [
    "Ethereum",
    "Arbitrum",
    "Optimism",
    "Polygon",
    "Base",
    "Avalanche",
    "BSC",
  ].map((c) => ({ value: c, label: c })),
};

// ── MultiWallet Panel ─────────────────────────────────────────────────────────
function MultiWalletPanel({
  nodeId,
  data,
  accent,
  updateField,
  updateNodeData,
}: {
  nodeId: string;
  data: Record<string, unknown>;
  accent: string;
  updateField: (f: string, v: unknown) => void;
  updateNodeData: (id: string, d: Record<string, unknown>) => void;
}) {
  const { wallets: connectedWallets } = useWallet();
  const wallets: WalletEntry[] = Array.isArray(data.wallets)
    ? (data.wallets as WalletEntry[])
    : [];
  const executeSequentially = Boolean(data.executeSequentially ?? true);
  const selectedChain = (data.chain as string) || "solana";

  const [showAddForm, setShowAddForm] = useState(false);
  const [addMode, setAddMode] = useState<"manual" | "connected">("manual");
  const [newAddress, setNewAddress] = useState("");
  const [newPrivateKey, setNewPrivateKey] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newChain, setNewChain] = useState(selectedChain);
  const [showNewKey, setShowNewKey] = useState(false);
  const [showKeyId, setShowKeyId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const readyCount = wallets.filter((w) => w.enabled && w.privateKey).length;
  const hasMissingKeys = wallets.some((w) => w.enabled && !w.privateKey);

  const resetAddForm = () => {
    setNewAddress("");
    setNewPrivateKey("");
    setNewLabel("");
    setNewChain(selectedChain);
    setShowNewKey(false);
    setAddMode("manual");
  };

  const addManualWallet = () => {
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
    updateNodeData(nodeId, { wallets: [...wallets, entry] });
    resetAddForm();
    setShowAddForm(false);
  };

  const importConnectedWallet = (cw: (typeof connectedWallets)[0]) => {
    if (wallets.find((w) => w.address === cw.address)) return;
    const entry: WalletEntry = {
      id: `w-${Date.now()}`,
      address: cw.address,
      privateKey: "",
      label: cw.label,
      chain: cw.type === "phantom" ? "solana" : "ethereum",
      enabled: true,
      walletType: cw.type === "phantom" ? "phantom" : "metamask",
    };
    updateNodeData(nodeId, { wallets: [...wallets, entry] });
    setShowAddForm(false);
    resetAddForm();
  };

  const removeWallet = (wid: string) =>
    updateNodeData(nodeId, { wallets: wallets.filter((w) => w.id !== wid) });
  const toggleWallet = (wid: string) =>
    updateNodeData(nodeId, {
      wallets: wallets.map((w) =>
        w.id === wid ? { ...w, enabled: !w.enabled } : w,
      ),
    });
  const updatePrivateKey = (wid: string, key: string) =>
    updateNodeData(nodeId, {
      wallets: wallets.map((w) =>
        w.id === wid ? { ...w, privateKey: key } : w,
      ),
    });
  const updateWalletLabel = (wid: string, label: string) =>
    updateNodeData(nodeId, {
      wallets: wallets.map((w) => (w.id === wid ? { ...w, label } : w)),
    });
  const copyAddress = (wid: string, addr: string) => {
    navigator.clipboard.writeText(addr).catch(() => {});
    setCopiedId(wid);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="space-y-3">
      <div
        className="rounded-lg px-3 py-2"
        style={{
          background: "rgba(249,115,22,0.06)",
          border: "1px solid rgba(249,115,22,0.12)",
        }}
      >
        <p className="text-[9px] font-mono text-orange-300/70 leading-relaxed">
          Runs all downstream nodes (Swap, Bridge, etc.) once per wallet. A
          private key is required on each wallet to sign transactions.
        </p>
      </div>

      <FieldGroup>
        <FieldLabel>Execution Mode</FieldLabel>
        <div className="grid grid-cols-2 gap-1">
          {(
            [
              {
                label: "Sequential",
                desc: "One at a time",
                value: true,
                Icon: List,
              },
              {
                label: "Parallel",
                desc: "All at once",
                value: false,
                Icon: Shuffle,
              },
            ] as const
          ).map(({ label, desc, value, Icon }) => (
            <button
              key={label}
              onClick={() => updateField("executeSequentially", value)}
              className="p-2 rounded-lg cursor-pointer transition-all flex flex-col items-start gap-0.5 border text-left"
              style={
                executeSequentially === value
                  ? {
                      background: `${accent}12`,
                      color: accent,
                      borderColor: `${accent}44`,
                    }
                  : {
                      background: "rgba(15,23,42,0.4)",
                      color: "rgba(148,163,184,0.35)",
                      borderColor: "rgba(51,65,85,0.35)",
                    }
              }
            >
              <div className="flex items-center gap-1.5">
                <Icon className="w-3 h-3" />
                <span className="text-[9px] font-mono font-bold">{label}</span>
              </div>
              <span className="text-[8px] font-mono opacity-60 pl-[18px]">
                {desc}
              </span>
            </button>
          ))}
        </div>
      </FieldGroup>

      <FieldGroup>
        <FieldLabel>Default Network</FieldLabel>
        <StyledSelect
          accent={accent}
          value={selectedChain}
          onChange={(v) => updateField("chain", v)}
          options={WALLET_CHAINS.map((c) => ({ value: c.id, label: c.label }))}
        />
      </FieldGroup>

      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <FieldLabel>Wallets</FieldLabel>
            <p className="text-[8px] font-mono text-slate-600 mt-0.5">
              {wallets.length === 0
                ? "None added yet"
                : `${readyCount}/${wallets.length} ready to execute`}
            </p>
          </div>
          <button
            onClick={() => {
              if (showAddForm) resetAddForm();
              setShowAddForm((v) => !v);
            }}
            className="flex items-center gap-1 text-[9px] font-mono font-bold cursor-pointer transition-all px-2 py-1.5 rounded border"
            style={{
              color: showAddForm ? "rgba(148,163,184,0.5)" : accent,
              borderColor: showAddForm ? "rgba(51,65,85,0.35)" : `${accent}35`,
              background: showAddForm ? "transparent" : `${accent}0d`,
            }}
          >
            <Plus className="w-3 h-3" />
            {showAddForm ? "Cancel" : "Add Wallet"}
          </button>
        </div>

        {hasMissingKeys && !showAddForm && (
          <div
            className="flex items-start gap-2 px-2.5 py-2 rounded-lg mb-2"
            style={{
              background: "rgba(239,68,68,0.05)",
              border: "1px solid rgba(239,68,68,0.15)",
            }}
          >
            <KeyRound className="w-3 h-3 text-red-400 shrink-0 mt-px" />
            <p className="text-[8px] font-mono text-red-400/70 leading-relaxed">
              Some wallets are missing a private key — they'll be skipped during
              execution. Click the key icon on a wallet to add one.
            </p>
          </div>
        )}

        {showAddForm && (
          <div
            className="rounded-xl p-3 space-y-2.5 mb-3"
            style={{
              background: "rgba(2,6,23,0.95)",
              border: `1px solid ${accent}22`,
            }}
          >
            <div
              className="text-[9px] font-mono font-bold tracking-wider"
              style={{ color: accent }}
            >
              ADD WALLET
            </div>
            <div className="grid grid-cols-2 gap-1">
              {(["manual", "connected"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setAddMode(m)}
                  className="py-1.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider cursor-pointer transition-all border"
                  style={
                    addMode === m
                      ? {
                          background: `${accent}15`,
                          color: accent,
                          borderColor: `${accent}40`,
                        }
                      : {
                          background: "transparent",
                          color: "rgba(100,116,139,0.4)",
                          borderColor: "rgba(51,65,85,0.35)",
                        }
                  }
                >
                  {m === "manual" ? "Enter Manually" : "Import Connected"}
                </button>
              ))}
            </div>

            {addMode === "connected" ? (
              <div className="space-y-1.5">
                <p className="text-[8px] font-mono text-slate-600 leading-relaxed">
                  Wallets connected via Phantom or MetaMask. You'll still need
                  to add the private key manually after importing.
                </p>
                {connectedWallets.length === 0 ? (
                  <div className="py-4 text-center text-[9px] font-mono text-slate-600 border border-dashed border-slate-700/40 rounded-lg">
                    No wallets connected yet
                  </div>
                ) : (
                  connectedWallets.map((cw) => {
                    const alreadyAdded = wallets.find(
                      (w) => w.address === cw.address,
                    );
                    return (
                      <div
                        key={cw.address}
                        className="flex items-center gap-2 px-2.5 py-2 rounded-lg"
                        style={{
                          background: "rgba(15,23,42,0.8)",
                          border: "1px solid rgba(51,65,85,0.3)",
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] font-mono font-bold text-slate-200 truncate">
                            {cw.label}
                          </div>
                          <div className="text-[8px] font-mono text-slate-500 mt-0.5">
                            {shortAddr(cw.address)}
                          </div>
                          <div className="text-[7px] font-mono text-slate-700 capitalize mt-0.5">
                            {cw.type} ·{" "}
                            {cw.type === "phantom" ? "Solana" : "Ethereum"}
                          </div>
                        </div>
                        <button
                          onClick={() => importConnectedWallet(cw)}
                          disabled={!!alreadyAdded}
                          className="px-2 py-1 rounded text-[8px] font-mono font-bold cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed border flex-shrink-0"
                          style={
                            alreadyAdded
                              ? {
                                  color: "rgba(100,116,139,0.4)",
                                  borderColor: "rgba(51,65,85,0.4)",
                                }
                              : {
                                  color: accent,
                                  borderColor: `${accent}40`,
                                  background: `${accent}0d`,
                                }
                          }
                        >
                          {alreadyAdded ? "Added" : "Import"}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div>
                  <div className="text-[7px] font-mono text-slate-600 uppercase tracking-widest mb-1">
                    Label (optional)
                  </div>
                  <input
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="e.g. Farming Wallet 1"
                    autoComplete="off"
                    name="mw-label-x9"
                    className="w-full h-7 px-2.5 rounded bg-slate-950 border border-slate-700/60 text-cyan-100 text-[10px] font-mono placeholder:text-slate-700 focus:border-cyan-500/50 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <div className="text-[7px] font-mono text-slate-600 uppercase tracking-widest mb-1">
                    Wallet Address (Public Key)
                  </div>
                  <input
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    placeholder={
                      newChain === "solana"
                        ? "7xKX... (Solana base58)"
                        : "0x1234... (EVM hex)"
                    }
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    name="mw-pubkey-x9"
                    className={`w-full h-7 px-2.5 rounded bg-slate-950 text-cyan-100 text-[10px] font-mono placeholder:text-slate-700 focus:outline-none transition-colors border ${
                      newAddress && !isValidAddress(newAddress)
                        ? "border-red-500/50"
                        : "border-slate-700/60 focus:border-cyan-500/50"
                    }`}
                  />
                  {newAddress && !isValidAddress(newAddress) && (
                    <p className="text-[7px] font-mono text-red-400/80 mt-1">
                      Invalid address format
                    </p>
                  )}
                </div>
                <div>
                  <div className="text-[7px] font-mono text-slate-600 uppercase tracking-widest mb-1">
                    Private Key{" "}
                    <span className="text-red-400/80">*required</span>
                  </div>
                  <div className="relative">
                    <input
                      value={newPrivateKey}
                      onChange={(e) => setNewPrivateKey(e.target.value)}
                      type={showNewKey ? "text" : "password"}
                      placeholder={
                        newChain === "solana"
                          ? "Base58 key (87-88 chars)"
                          : "Hex key (64 chars, with or without 0x)"
                      }
                      autoComplete="new-password"
                      name="mw-privkey-x9"
                      className={`w-full h-7 px-2.5 pr-8 rounded bg-slate-950 text-cyan-100 text-[10px] font-mono placeholder:text-slate-700 focus:outline-none transition-colors border ${
                        newPrivateKey &&
                        !isValidPrivateKey(newPrivateKey, newChain)
                          ? "border-red-500/50"
                          : "border-slate-700/60 focus:border-cyan-500/50"
                      }`}
                    />
                    <button
                      onClick={() => setShowNewKey((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-slate-600 hover:text-slate-400 transition-colors"
                    >
                      {showNewKey ? (
                        <EyeOff className="w-3 h-3" />
                      ) : (
                        <Eye className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                  <div className="flex items-start gap-1 mt-1 px-0.5">
                    <span className="text-amber-500 text-[9px] mt-px leading-none">
                      ⚠
                    </span>
                    <p className="text-[7px] font-mono text-slate-700 leading-relaxed">
                      Stored in localStorage. Use a dedicated farming wallet
                      only — never your main wallet.
                    </p>
                  </div>
                </div>
                <div>
                  <div className="text-[7px] font-mono text-slate-600 uppercase tracking-widest mb-1">
                    Network
                  </div>
                  <StyledSelect
                    accent={accent}
                    value={newChain}
                    onChange={setNewChain}
                    options={WALLET_CHAINS.map((c) => ({
                      value: c.id,
                      label: c.label,
                    }))}
                  />
                </div>
                <button
                  onClick={addManualWallet}
                  disabled={
                    !newAddress.trim() ||
                    !newPrivateKey.trim() ||
                    !isValidAddress(newAddress)
                  }
                  className="w-full h-7 rounded text-[9px] font-mono font-bold uppercase tracking-wider cursor-pointer transition-all flex items-center justify-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed border mt-1"
                  style={{
                    background: `${accent}12`,
                    borderColor: `${accent}35`,
                    color: accent,
                  }}
                >
                  <Plus className="w-3 h-3" /> Add Wallet
                </button>
              </div>
            )}
          </div>
        )}

        <div
          className="space-y-1.5"
          style={{ maxHeight: "260px", overflowY: "auto", overflowX: "hidden" }}
        >
          {wallets.length === 0 && !showAddForm && (
            <div className="py-5 text-center border border-dashed border-slate-700/30 rounded-xl">
              <div className="text-[10px] font-mono text-slate-600">
                No wallets added
              </div>
              <div className="text-[8px] font-mono text-slate-700 mt-0.5">
                Click "Add Wallet" above to get started
              </div>
            </div>
          )}
          {wallets.map((w, i) => (
            <div
              key={w.id}
              className="rounded-lg overflow-hidden"
              style={{
                border: `1px solid ${w.enabled ? "rgba(51,65,85,0.45)" : "rgba(51,65,85,0.18)"}`,
                opacity: w.enabled ? 1 : 0.55,
              }}
            >
              <div
                className="flex items-center gap-2 px-2.5 py-2"
                style={{ background: "rgba(15,23,42,0.75)" }}
              >
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className="text-[7px] font-mono text-slate-700">
                    #{i + 1}
                  </span>
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: chainColor(w.chain) }}
                    title={w.chain}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  {editingId === w.id ? (
                    <input
                      autoFocus
                      value={w.label}
                      onChange={(e) => updateWalletLabel(w.id, e.target.value)}
                      onBlur={() => setEditingId(null)}
                      onKeyDown={(e) => e.key === "Enter" && setEditingId(null)}
                      className="w-full bg-transparent text-[10px] font-mono font-bold focus:outline-none border-b border-cyan-500/40 text-cyan-300"
                    />
                  ) : (
                    <button
                      onClick={() => setEditingId(w.id)}
                      className="text-[10px] font-mono font-bold text-slate-200 truncate block w-full text-left hover:text-cyan-300 transition-colors"
                      title="Click to rename"
                    >
                      {w.label}
                    </button>
                  )}
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[8px] font-mono text-slate-500">
                      {shortAddr(w.address)}
                    </span>
                    <span className="text-[7px] font-mono text-slate-700 capitalize">
                      · {w.chain}
                    </span>
                    {w.address && !isValidAddress(w.address) && (
                      <AlertTriangle className="w-2.5 h-2.5 text-amber-400 flex-shrink-0" />
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => copyAddress(w.id, w.address)}
                    title="Copy full address"
                    className="p-1 rounded cursor-pointer transition-colors hover:bg-slate-700/40"
                    style={{
                      color:
                        copiedId === w.id
                          ? "#34d399"
                          : "rgba(100,116,139,0.45)",
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
                    className="px-1.5 py-0.5 rounded text-[7px] font-mono font-bold cursor-pointer transition-all border"
                    style={
                      w.enabled
                        ? {
                            background: `${accent}12`,
                            color: accent,
                            borderColor: `${accent}30`,
                          }
                        : {
                            background: "rgba(51,65,85,0.2)",
                            color: "rgba(100,116,139,0.4)",
                            borderColor: "rgba(51,65,85,0.3)",
                          }
                    }
                  >
                    {w.enabled ? "ON" : "OFF"}
                  </button>
                  <button
                    onClick={() => removeWallet(w.id)}
                    className="p-1 rounded cursor-pointer text-slate-600 hover:text-red-400 transition-colors"
                    title="Remove wallet"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <div
                className="px-2.5 py-1.5 flex items-center gap-2"
                style={{
                  background: "rgba(2,6,23,0.5)",
                  borderTop: "1px solid rgba(51,65,85,0.18)",
                }}
              >
                <KeyRound
                  className="w-3 h-3 flex-shrink-0"
                  style={{ color: w.privateKey ? "#34d399" : "#f87171" }}
                />
                <div className="flex-1 min-w-0">
                  {showKeyId === w.id ? (
                    <input
                      value={w.privateKey}
                      onChange={(e) => updatePrivateKey(w.id, e.target.value)}
                      placeholder="Paste private key here..."
                      autoFocus
                      autoComplete="off"
                      name={`mw-pk-${w.id}`}
                      onBlur={() => setShowKeyId(null)}
                      className="w-full bg-transparent text-[9px] font-mono focus:outline-none text-cyan-300"
                    />
                  ) : (
                    <button
                      onClick={() => setShowKeyId(w.id)}
                      className="text-left w-full cursor-pointer"
                    >
                      <span
                        className="text-[9px] font-mono"
                        style={{
                          color: w.privateKey
                            ? "#34d399"
                            : "rgba(248,113,113,0.65)",
                        }}
                      >
                        {w.privateKey
                          ? maskKey(w.privateKey)
                          : "No private key — click to add"}
                      </span>
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setShowKeyId(showKeyId === w.id ? null : w.id)}
                  className="cursor-pointer text-slate-600 hover:text-slate-400 transition-colors flex-shrink-0"
                >
                  {showKeyId === w.id ? (
                    <EyeOff className="w-3 h-3" />
                  ) : (
                    <Eye className="w-3 h-3" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function NodePropertiesPanel() {
  const selectedNode = useFlowStore((s) =>
    s.selectedNodeId
      ? (s.nodes.find((n) => n.id === s.selectedNodeId) ?? null)
      : null,
  );
  const setSelectedNode = useFlowStore((s) => s.setSelectedNode);
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const deleteNode = useFlowStore((s) => s.deleteNode);
  const { isConnected: tgConnected, openBot } = useTelegram();

  if (!selectedNode) return null;

  const defaultAccent = NODE_COLORS[selectedNode.type ?? ""] ?? "#22d3ee";
  const accent =
    typeof selectedNode.data.customColor === "string"
      ? selectedNode.data.customColor
      : defaultAccent;
  const nodeLabel =
    NODE_LABELS[selectedNode.type ?? ""] ?? selectedNode.type?.toUpperCase();

  const handleClose = () => setSelectedNode(null);
  const handleDelete = () => {
    deleteNode(selectedNode.id);
    setSelectedNode(null);
  };
  const updateField = (field: string, value: unknown) =>
    updateNodeData(selectedNode.id, { [field]: value });

  const renderFields = () => {
    switch (selectedNode.type) {
      case "trigger": {
        const triggerType = str(selectedNode.data.triggerType, "schedule");
        const schedulePreset = str(selectedNode.data.schedulePreset, "Daily");
        return (
          <>
            <FieldGroup>
              <FieldLabel>Trigger Type</FieldLabel>
              <StyledSelect
                accent={accent}
                value={triggerType}
                onChange={(v) => updateField("triggerType", v)}
                options={[
                  { value: "schedule", label: "Schedule" },
                  { value: "price", label: "Price Alert" },
                  { value: "wallet", label: "Wallet Event" },
                  { value: "manual", label: "Manual" },
                ]}
              />
            </FieldGroup>
            {triggerType === "schedule" && (
              <>
                <FieldGroup>
                  <FieldLabel>Frequency</FieldLabel>
                  <StyledSelect
                    accent={accent}
                    value={schedulePreset}
                    onChange={(v) => updateField("schedulePreset", v)}
                    options={[
                      { value: "Hourly", label: "Hourly" },
                      { value: "Every 6h", label: "Every 6 Hours" },
                      { value: "Daily", label: "Daily" },
                      { value: "Weekly", label: "Weekly" },
                      { value: "Custom", label: "Custom Cron" },
                    ]}
                  />
                </FieldGroup>
                {(schedulePreset === "Daily" ||
                  schedulePreset === "Weekly") && (
                  <FieldGroup>
                    <FieldLabel>Time (UTC)</FieldLabel>
                    <StyledInput
                      type="time"
                      value={str(selectedNode.data.scheduleTime, "03:00")}
                      onChange={(e) =>
                        updateField("scheduleTime", e.target.value)
                      }
                    />
                  </FieldGroup>
                )}
                {schedulePreset === "Custom" && (
                  <FieldGroup>
                    <FieldLabel>Cron Expression</FieldLabel>
                    <StyledInput
                      placeholder="0 */6 * * *"
                      value={str(selectedNode.data.cronExpression)}
                      onChange={(e) =>
                        updateField("cronExpression", e.target.value)
                      }
                    />
                  </FieldGroup>
                )}
              </>
            )}
            {triggerType === "price" && (
              <>
                <FieldGroup>
                  <FieldLabel>Token</FieldLabel>
                  <StyledInput
                    placeholder="SOL, ETH, BTC..."
                    value={str(selectedNode.data.token, "SOL")}
                    onChange={(e) =>
                      updateField("token", e.target.value.toUpperCase())
                    }
                  />
                </FieldGroup>
                <FieldGroup>
                  <FieldLabel>Condition</FieldLabel>
                  <StyledSelect
                    accent={accent}
                    value={str(selectedNode.data.priceCondition, "Above")}
                    onChange={(v) => updateField("priceCondition", v)}
                    options={[
                      { value: "Above", label: "Above" },
                      { value: "Below", label: "Below" },
                      { value: "Crosses Up", label: "Crosses Up" },
                      { value: "Crosses Down", label: "Crosses Down" },
                    ]}
                  />
                </FieldGroup>
                <FieldGroup>
                  <FieldLabel>Target Price (USD)</FieldLabel>
                  <StyledInput
                    type="number"
                    placeholder="0.00"
                    value={str(selectedNode.data.priceTarget)}
                    onChange={(e) => updateField("priceTarget", e.target.value)}
                  />
                </FieldGroup>
              </>
            )}
            {triggerType === "wallet" && (
              <>
                <FieldGroup>
                  <FieldLabel>Event Type</FieldLabel>
                  <StyledSelect
                    accent={accent}
                    value={str(selectedNode.data.walletEvent, "Incoming TX")}
                    onChange={(v) => updateField("walletEvent", v)}
                    options={[
                      { value: "Incoming TX", label: "Incoming TX" },
                      { value: "Outgoing TX", label: "Outgoing TX" },
                      { value: "Balance Change", label: "Balance Change" },
                      { value: "Token Received", label: "Token Received" },
                    ]}
                  />
                </FieldGroup>
                <FieldGroup>
                  <FieldLabel>Min Amount (optional)</FieldLabel>
                  <StyledInput
                    type="number"
                    placeholder="0.00"
                    value={str(selectedNode.data.minAmount)}
                    onChange={(e) => updateField("minAmount", e.target.value)}
                  />
                </FieldGroup>
              </>
            )}
            {triggerType === "manual" && (
              <p className="text-[10px] font-mono text-slate-500 leading-relaxed py-1">
                // fires when flow is manually executed from the toolbar
              </p>
            )}
          </>
        );
      }

      case "multiWallet":
        return (
          <MultiWalletPanel
            nodeId={selectedNode.id}
            data={selectedNode.data as Record<string, unknown>}
            accent={accent}
            updateField={updateField}
            updateNodeData={updateNodeData}
          />
        );

      case "swap":
        return (
          <>
            <div className="grid grid-cols-2 gap-2">
              <FieldGroup>
                <FieldLabel>From Token</FieldLabel>
                <StyledInput
                  placeholder="USDC"
                  value={str(selectedNode.data.fromToken)}
                  onChange={(e) => updateField("fromToken", e.target.value)}
                />
              </FieldGroup>
              <FieldGroup>
                <FieldLabel>To Token</FieldLabel>
                <StyledInput
                  placeholder="SOL"
                  value={str(selectedNode.data.toToken)}
                  onChange={(e) => updateField("toToken", e.target.value)}
                />
              </FieldGroup>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <FieldGroup>
                <FieldLabel>Amount</FieldLabel>
                <StyledInput
                  type="number"
                  placeholder="10"
                  value={str(selectedNode.data.amount)}
                  onChange={(e) => updateField("amount", e.target.value)}
                />
              </FieldGroup>
              <FieldGroup>
                <FieldLabel>Slippage %</FieldLabel>
                <StyledInput
                  type="number"
                  step="0.1"
                  placeholder="1"
                  value={str(selectedNode.data.slippage)}
                  onChange={(e) => updateField("slippage", e.target.value)}
                />
              </FieldGroup>
            </div>
            <FieldGroup>
              <FieldLabel>DEX</FieldLabel>
              <StyledSelect
                accent={accent}
                value={str(selectedNode.data.dex, "jupiter")}
                onChange={(v) => updateField("dex", v)}
                options={[
                  { value: "jupiter", label: "Jupiter" },
                  { value: "uniswap", label: "Uniswap" },
                  { value: "raydium", label: "Raydium" },
                  { value: "pancakeswap", label: "PancakeSwap" },
                ]}
              />
            </FieldGroup>
          </>
        );

      case "bridge": {
        const bridgeProtocol = str(selectedNode.data.bridgeProtocol, "Across");
        const bridgeChains =
          BRIDGE_PROTOCOL_CHAINS[bridgeProtocol] ??
          BRIDGE_PROTOCOL_CHAINS.Across;
        const currentFrom = bridgeChains.find(
          (c) => c.value === str(selectedNode.data.fromChain),
        )
          ? str(selectedNode.data.fromChain)
          : bridgeChains[0].value;
        const toChainOptions = bridgeChains.filter(
          (c) => c.value !== currentFrom,
        );
        const currentTo = toChainOptions.find(
          (c) => c.value === str(selectedNode.data.toChain),
        )
          ? str(selectedNode.data.toChain)
          : (toChainOptions[0]?.value ?? "");
        return (
          <>
            <FieldGroup>
              <FieldLabel>Bridge Protocol</FieldLabel>
              <StyledSelect
                accent={accent}
                value={bridgeProtocol}
                onChange={(v) => {
                  const newChains =
                    BRIDGE_PROTOCOL_CHAINS[v] ?? BRIDGE_PROTOCOL_CHAINS.Across;
                  const newFrom = newChains.find((c) => c.value === currentFrom)
                    ? currentFrom
                    : newChains[0].value;
                  const newTo = newChains.find(
                    (c) => c.value === currentTo && c.value !== newFrom,
                  )
                    ? currentTo
                    : (newChains.find((c) => c.value !== newFrom)?.value ??
                      newChains[0].value);
                  updateNodeData(selectedNode.id, {
                    bridgeProtocol: v,
                    fromChain: newFrom,
                    toChain: newTo,
                  });
                }}
                options={[
                  { value: "Across", label: "Across" },
                  { value: "Hop", label: "Hop" },
                  { value: "Synapse", label: "Synapse" },
                ]}
              />
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>From Chain</FieldLabel>
              <StyledSelect
                accent={accent}
                value={currentFrom}
                onChange={(v) => {
                  const newTo =
                    currentTo === v
                      ? (bridgeChains.find((c) => c.value !== v)?.value ??
                        bridgeChains[0].value)
                      : currentTo;
                  updateNodeData(selectedNode.id, {
                    fromChain: v,
                    toChain: newTo,
                  });
                }}
                options={bridgeChains}
              />
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>To Chain</FieldLabel>
              <StyledSelect
                accent={accent}
                value={currentTo}
                onChange={(v) => updateField("toChain", v)}
                options={toChainOptions}
              />
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Amount (USD)</FieldLabel>
              <StyledInput
                type="number"
                placeholder="100"
                value={str(selectedNode.data.amountUsd, "100")}
                onChange={(e) => updateField("amountUsd", e.target.value)}
              />
            </FieldGroup>
          </>
        );
      }

      case "chainSwitch":
        return (
          <>
            <FieldGroup>
              <FieldLabel>Current Chain</FieldLabel>
              <StyledSelect
                accent={accent}
                value={str(selectedNode.data.currentChain, "Ethereum")}
                onChange={(v) => updateField("currentChain", v)}
                options={CHAINS_EVM}
              />
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Target Chain</FieldLabel>
              <StyledSelect
                accent={accent}
                value={str(selectedNode.data.targetChain, "Arbitrum")}
                onChange={(v) => updateField("targetChain", v)}
                options={CHAINS_EVM.filter(
                  (c) =>
                    c.value !== str(selectedNode.data.currentChain, "Ethereum"),
                )}
              />
            </FieldGroup>
          </>
        );

      case "alert": {
        const alertType = str(selectedNode.data.alertType, "Telegram");
        return (
          <>
            <FieldGroup>
              <FieldLabel>Severity</FieldLabel>
              <div className="grid grid-cols-4 gap-1">
                {(["info", "success", "warning", "urgent"] as const).map(
                  (s) => {
                    const active =
                      str(selectedNode.data.severity, "info") === s;
                    const color = SEVERITY_COLORS[s];
                    return (
                      <button
                        key={s}
                        onClick={() => updateField("severity", s)}
                        className="h-7 rounded-lg border text-[8px] font-mono font-bold uppercase tracking-widest transition-all cursor-pointer"
                        style={
                          active
                            ? {
                                color,
                                borderColor: `${color}66`,
                                background: `${color}18`,
                              }
                            : {
                                color: "rgba(148,163,184,0.4)",
                                borderColor: "rgba(51,65,85,0.8)",
                                background: "transparent",
                              }
                        }
                      >
                        {s}
                      </button>
                    );
                  },
                )}
              </div>
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Channel</FieldLabel>
              <StyledSelect
                accent={accent}
                value={alertType}
                onChange={(v) => updateField("alertType", v)}
                options={[
                  { value: "Telegram", label: "Telegram" },
                  { value: "Discord", label: "Discord" },
                  { value: "Email", label: "Email" },
                  { value: "Webhook", label: "Webhook" },
                ]}
              />
            </FieldGroup>
            {alertType === "Telegram" && (
              <div
                className="rounded-lg p-3 space-y-2"
                style={{
                  background: tgConnected
                    ? "rgba(34,197,94,0.06)"
                    : "rgba(34,158,217,0.06)",
                  border: `1px solid ${tgConnected ? "rgba(34,197,94,0.2)" : "rgba(34,158,217,0.2)"}`,
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {tgConnected ? (
                      <CheckCircle2 className="w-3 h-3 text-green-400" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-cyan-500/60" />
                    )}
                    <span
                      className={`text-[10px] font-mono font-bold ${tgConnected ? "text-green-400" : "text-cyan-400"}`}
                    >
                      {tgConnected ? "Bot connected" : "Bot not connected"}
                    </span>
                  </div>
                  {!tgConnected && (
                    <button
                      onClick={openBot}
                      className="flex items-center gap-1 text-[8px] font-mono font-bold uppercase tracking-widest px-2 py-1 rounded border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 transition-all cursor-pointer"
                    >
                      Connect <ExternalLink className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
                <p className="text-[9px] font-mono text-slate-500 leading-relaxed">
                  {tgConnected
                    ? "Alerts will be sent to your Telegram private chat."
                    : "Click Connect — the bot opens with your token. Hit Start in Telegram and this will update automatically."}
                </p>
              </div>
            )}
            {(alertType === "Discord" || alertType === "Webhook") && (
              <FieldGroup>
                <FieldLabel>Webhook URL</FieldLabel>
                <StyledInput
                  placeholder="https://discord.com/api/webhooks/..."
                  value={str(selectedNode.data.webhookUrl)}
                  onChange={(e) => updateField("webhookUrl", e.target.value)}
                />
              </FieldGroup>
            )}
            {alertType === "Email" && (
              <>
                <FieldGroup>
                  <FieldLabel>To Address</FieldLabel>
                  <StyledInput
                    placeholder="you@example.com"
                    value={str(selectedNode.data.emailTo)}
                    onChange={(e) => updateField("emailTo", e.target.value)}
                  />
                </FieldGroup>
                <FieldGroup>
                  <FieldLabel>Subject</FieldLabel>
                  <StyledInput
                    placeholder="Flow Alert"
                    value={str(selectedNode.data.emailSubject)}
                    onChange={(e) =>
                      updateField("emailSubject", e.target.value)
                    }
                  />
                </FieldGroup>
              </>
            )}
            <FieldGroup>
              <FieldLabel>Message</FieldLabel>
              <StyledTextarea
                rows={3}
                placeholder="Flow completed successfully!"
                value={str(selectedNode.data.message)}
                onChange={(e) => updateField("message", e.target.value)}
              />
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Cooldown (seconds)</FieldLabel>
              <StyledInput
                type="number"
                min={0}
                placeholder="0 = no cooldown"
                value={str(selectedNode.data.cooldown, "0")}
                onChange={(e) =>
                  updateField("cooldown", Number(e.target.value))
                }
              />
            </FieldGroup>
          </>
        );
      }

      case "condition": {
        const conditionType = str(selectedNode.data.conditionType, "price");
        return (
          <>
            <FieldGroup>
              <FieldLabel>Condition Type</FieldLabel>
              <StyledSelect
                accent={accent}
                value={conditionType}
                onChange={(v) => updateField("conditionType", v)}
                options={[
                  { value: "price", label: "Price" },
                  { value: "balance", label: "Balance" },
                  { value: "gas", label: "Gas Fee" },
                  { value: "custom", label: "Custom Expression" },
                ]}
              />
            </FieldGroup>
            {conditionType === "price" && (
              <FieldGroup>
                <FieldLabel>Token</FieldLabel>
                <StyledInput
                  placeholder="ETH"
                  value={str(selectedNode.data.token)}
                  onChange={(e) => updateField("token", e.target.value)}
                />
              </FieldGroup>
            )}
            <FieldGroup>
              <FieldLabel>Operator</FieldLabel>
              <StyledSelect
                accent={accent}
                value={str(selectedNode.data.operator, ">")}
                onChange={(v) => updateField("operator", v)}
                options={[
                  { value: ">", label: "Greater than ( > )" },
                  { value: "<", label: "Less than ( < )" },
                  { value: "=", label: "Equal to ( = )" },
                  { value: ">=", label: "Greater or equal ( >= )" },
                  { value: "<=", label: "Less or equal ( <= )" },
                ]}
              />
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Value</FieldLabel>
              <StyledInput
                placeholder="100"
                value={str(selectedNode.data.value)}
                onChange={(e) => updateField("value", e.target.value)}
              />
            </FieldGroup>
            {conditionType === "custom" && (
              <FieldGroup>
                <FieldLabel>Expression</FieldLabel>
                <StyledInput
                  placeholder="balance > 1000 && gas < 20"
                  value={str(selectedNode.data.expression)}
                  onChange={(e) => updateField("expression", e.target.value)}
                />
              </FieldGroup>
            )}
          </>
        );
      }

      case "walletConnect": {
        const wAddress = str(selectedNode.data.address);
        const wNetwork = str(selectedNode.data.network);
        const wBalance = str(selectedNode.data.balance);
        const isConnected = !!wAddress;
        const walletTypeVal = str(selectedNode.data.walletType, "phantom");
        const isSolana = ["phantom", "backpack", "solflare"].includes(
          walletTypeVal,
        );
        const shortWAddr =
          wAddress.length > 10
            ? `${wAddress.slice(0, 6)}…${wAddress.slice(-4)}`
            : wAddress;

        return (
          <>
            <FieldGroup>
              <FieldLabel>Wallet Type</FieldLabel>
              <StyledSelect
                accent={accent}
                value={walletTypeVal}
                onChange={(v) => updateField("walletType", v)}
                options={[
                  { value: "phantom", label: "Phantom (Solana)" },
                  { value: "backpack", label: "Backpack (Solana)" },
                  { value: "solflare", label: "Solflare (Solana)" },
                  { value: "metamask", label: "MetaMask (EVM)" },
                  { value: "rabby", label: "Rabby (EVM)" },
                  { value: "coinbase", label: "Coinbase Wallet (EVM)" },
                ]}
              />
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Status</FieldLabel>
              <div
                className="h-8 flex items-center gap-2 px-3 rounded-md text-xs font-mono"
                style={{
                  background: "rgba(2,6,23,0.9)",
                  border: isConnected
                    ? "1px solid rgba(52,211,153,0.3)"
                    : "1px solid rgba(51,65,85,0.8)",
                }}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: isConnected ? "#34d399" : "#475569" }}
                />
                <span
                  className="flex-1"
                  style={{ color: isConnected ? "#34d399" : "#475569" }}
                >
                  {isConnected ? "Connected" : "Not connected — use the node"}
                </span>
                {wNetwork && (
                  <span
                    className="text-[9px] font-mono px-1.5 py-0.5 rounded flex-shrink-0"
                    style={{
                      background: `${accent}18`,
                      border: `1px solid ${accent}33`,
                      color: accent,
                    }}
                  >
                    {wNetwork}
                  </span>
                )}
              </div>
            </FieldGroup>
            {isConnected ? (
              <FieldGroup>
                <FieldLabel>Connected Address</FieldLabel>
                <div
                  className="h-8 flex items-center justify-between px-3 rounded-md"
                  style={{
                    background: "rgba(2,6,23,0.9)",
                    border: "1px solid rgba(51,65,85,0.8)",
                  }}
                >
                  <span className="text-xs font-mono text-cyan-100 truncate">
                    {shortWAddr}
                  </span>
                  {wBalance && (
                    <span
                      className="text-[9px] font-mono flex-shrink-0 ml-2"
                      style={{ color: accent }}
                    >
                      {wBalance}
                    </span>
                  )}
                </div>
              </FieldGroup>
            ) : (
              <FieldGroup>
                <FieldLabel>Address (manual override)</FieldLabel>
                <StyledInput
                  placeholder={
                    isSolana ? "7xKX… (Solana base58)" : "0x1234… (EVM hex)"
                  }
                  value={wAddress}
                  onChange={(e) => updateField("address", e.target.value)}
                  className="font-mono"
                />
                <div className="text-[8px] font-mono text-slate-600 mt-0.5">
                  // Use the Connect button on the node to auto-fill
                </div>
              </FieldGroup>
            )}
          </>
        );
      }

      case "lendStake":
        return (
          <>
            <FieldGroup>
              <FieldLabel>Action</FieldLabel>
              <StyledSelect
                accent={accent}
                value={str(selectedNode.data.actionType, "lend")}
                onChange={(v) => updateField("actionType", v)}
                options={[
                  { value: "lend", label: "Lend" },
                  { value: "stake", label: "Stake" },
                  { value: "unstake", label: "Unstake" },
                  { value: "withdraw", label: "Withdraw" },
                ]}
              />
            </FieldGroup>
            <div className="grid grid-cols-2 gap-2">
              <FieldGroup>
                <FieldLabel>Token</FieldLabel>
                <StyledInput
                  placeholder="USDC"
                  value={str(selectedNode.data.token)}
                  onChange={(e) => updateField("token", e.target.value)}
                />
              </FieldGroup>
              <FieldGroup>
                <FieldLabel>Amount</FieldLabel>
                <StyledInput
                  type="number"
                  placeholder="100"
                  value={str(selectedNode.data.amount)}
                  onChange={(e) => updateField("amount", e.target.value)}
                />
              </FieldGroup>
            </div>
            <FieldGroup>
              <FieldLabel>Protocol</FieldLabel>
              <StyledSelect
                accent={accent}
                value={str(selectedNode.data.protocol, "aave")}
                onChange={(v) => updateField("protocol", v)}
                options={[
                  { value: "aave", label: "AAVE" },
                  { value: "compound", label: "Compound" },
                  { value: "kamino", label: "Kamino" },
                  { value: "marginfi", label: "MarginFi" },
                  { value: "lido", label: "Lido" },
                  { value: "jito", label: "Jito" },
                ]}
              />
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Chain</FieldLabel>
              <StyledSelect
                accent={accent}
                value={str(selectedNode.data.chain, "Ethereum")}
                onChange={(v) => updateField("chain", v)}
                options={CHAINS_EVM}
              />
            </FieldGroup>
          </>
        );

      case "twitter": {
        const taskType = str(selectedNode.data.taskType, "follow");
        return (
          <>
            <FieldGroup>
              <FieldLabel>Task Type</FieldLabel>
              <StyledSelect
                accent={accent}
                value={taskType}
                onChange={(v) => updateField("taskType", v)}
                options={[
                  { value: "follow", label: "Follow" },
                  { value: "like", label: "Like" },
                  { value: "retweet", label: "Retweet" },
                  { value: "quote", label: "Quote Tweet" },
                  { value: "tweet", label: "Post Tweet" },
                ]}
              />
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Target</FieldLabel>
              <StyledInput
                placeholder="@username or tweet URL"
                value={str(selectedNode.data.target)}
                onChange={(e) => updateField("target", e.target.value)}
              />
            </FieldGroup>
            {(taskType === "quote" || taskType === "tweet") && (
              <FieldGroup>
                <FieldLabel>Tweet Text</FieldLabel>
                <StyledTextarea
                  rows={3}
                  placeholder="gm frens"
                  value={str(selectedNode.data.tweetText)}
                  onChange={(e) => updateField("tweetText", e.target.value)}
                />
              </FieldGroup>
            )}
          </>
        );
      }

      case "discord": {
        const taskType = str(selectedNode.data.taskType, "join");
        const hasToken = str(selectedNode.data.discordToken).length > 10;
        // Which fields each task type needs
        const needsServer = taskType === "join";
        const needsChannel =
          taskType === "message" || taskType === "react" || taskType === "role";
        const needsMessage = taskType === "message";
        const needsMessageId = taskType === "react" || taskType === "role";
        const needsEmoji = taskType === "react" || taskType === "role";

        return (
          <>
            {/* Discord token — required for all tasks */}
            <FieldGroup>
              <FieldLabel>Discord Token</FieldLabel>
              <div className="relative">
                <StyledInput
                  type="password"
                  placeholder="Your Discord user token"
                  value={str(selectedNode.data.discordToken)}
                  onChange={(e) => updateField("discordToken", e.target.value)}
                  className="font-mono pr-8"
                  autoComplete="off"
                />
              </div>
              <div
                className="rounded px-2 py-1.5 mt-1"
                style={{
                  background: "rgba(239,68,68,0.05)",
                  border: "1px solid rgba(239,68,68,0.15)",
                }}
              >
                <p className="text-[7px] font-mono text-red-400/60 leading-relaxed">
                  ⚠ Use a dedicated farming account only. Selfbotting violates
                  Discord ToS. Never use your main account.
                </p>
              </div>
            </FieldGroup>

            {/* Task type */}
            <FieldGroup>
              <FieldLabel>Task Type</FieldLabel>
              <StyledSelect
                accent={accent}
                value={taskType}
                onChange={(v) => updateField("taskType", v)}
                options={[
                  { value: "join", label: "Join Server" },
                  { value: "message", label: "Send Message" },
                  { value: "react", label: "React to Message" },
                  { value: "role", label: "Get Role (reaction)" },
                ]}
              />
            </FieldGroup>

            {/* Server invite — only for join */}
            {needsServer && (
              <FieldGroup>
                <FieldLabel>Server Invite</FieldLabel>
                <StyledInput
                  placeholder="discord.gg/abc123 or https://discord.gg/abc"
                  value={str(selectedNode.data.serverId)}
                  onChange={(e) => updateField("serverId", e.target.value)}
                />
              </FieldGroup>
            )}

            {/* Channel ID — for message / react / role */}
            {needsChannel && (
              <FieldGroup>
                <FieldLabel>Channel ID</FieldLabel>
                <StyledInput
                  placeholder="1234567890123456789"
                  value={str(selectedNode.data.channelId)}
                  onChange={(e) => updateField("channelId", e.target.value)}
                  className="font-mono"
                />
              </FieldGroup>
            )}

            {/* Message text — for send message */}
            {needsMessage && (
              <FieldGroup>
                <FieldLabel>Message</FieldLabel>
                <StyledTextarea
                  rows={2}
                  placeholder="gm!"
                  value={str(selectedNode.data.message)}
                  onChange={(e) => updateField("message", e.target.value)}
                />
              </FieldGroup>
            )}

            {/* Message ID — for react / role */}
            {needsMessageId && (
              <FieldGroup>
                <FieldLabel>Message ID</FieldLabel>
                <StyledInput
                  placeholder="1234567890123456789"
                  value={str(selectedNode.data.messageId)}
                  onChange={(e) => updateField("messageId", e.target.value)}
                  className="font-mono"
                />
                <div className="text-[8px] font-mono text-slate-600 mt-0.5">
                  // Right-click message → Copy Message ID (developer mode
                  required)
                </div>
              </FieldGroup>
            )}

            {/* Emoji — for react / role */}
            {needsEmoji && (
              <FieldGroup>
                <FieldLabel>Emoji</FieldLabel>
                <StyledInput
                  placeholder="👍  or  customname:123456789"
                  value={str(selectedNode.data.emoji, "👍")}
                  onChange={(e) => updateField("emoji", e.target.value)}
                />
              </FieldGroup>
            )}

            {/* Status indicator */}
            <div
              className="rounded-lg px-3 py-2 flex items-center justify-between"
              style={{
                background: "rgba(2,6,23,0.9)",
                border: hasToken
                  ? "1px solid rgba(52,211,153,0.2)"
                  : "1px solid rgba(51,65,85,0.4)",
              }}
            >
              <div className="flex items-center gap-1.5">
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: hasToken ? "#34d399" : "#475569" }}
                />
                <span
                  className="text-[9px] font-mono"
                  style={{ color: hasToken ? "#34d399" : "#475569" }}
                >
                  {hasToken ? "Token set — ready to execute" : "Token required"}
                </span>
              </div>
            </div>
          </>
        );
      }

      // ─────────────────────────────────────────────────────────────────────────────
      // DROP THIS INTO NodePropertiesPanel.tsx
      // Replace the entire `case "galxe":` block (currently ~13 lines) with this.
      // ─────────────────────────────────────────────────────────────────────────────

      case "galxe": {
        const hasToken = str(selectedNode.data.galxeToken ?? "").length > 10;
        const hasWallet =
          str(selectedNode.data.walletPublicKey ?? "").length > 10;
        return (
          <>
            {/* Galxe access token — required for ALL actions */}
            <FieldGroup>
              <FieldLabel>Galxe Access Token</FieldLabel>
              <div className="relative">
                <StyledInput
                  type="password"
                  placeholder="Your Galxe access token"
                  value={str(selectedNode.data.galxeToken)}
                  onChange={(e) => updateField("galxeToken", e.target.value)}
                  className="font-mono pr-8"
                  autoComplete="off"
                />
              </div>
              <div
                className="rounded px-2 py-1.5 mt-1"
                style={{
                  background: "rgba(167,139,250,0.05)",
                  border: "1px solid rgba(167,139,250,0.15)",
                }}
              >
                <p className="text-[7px] font-mono text-violet-400/60 leading-relaxed">
                  Get your token: galxe.com → Settings → Access Token. Required
                  for all actions.
                </p>
              </div>
            </FieldGroup>

            {/* Wallet address — read-only, set by WalletConnectNode upstream */}
            <FieldGroup>
              <FieldLabel>Wallet Address</FieldLabel>
              <div
                className="h-8 flex items-center justify-between px-3 rounded-md"
                style={{
                  background: "rgba(2,6,23,0.9)",
                  border: hasWallet
                    ? "1px solid rgba(52,211,153,0.3)"
                    : "1px solid rgba(248,113,113,0.25)",
                }}
              >
                {hasWallet ? (
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                    <span className="text-[10px] font-mono text-emerald-400">
                      {str(selectedNode.data.walletPublicKey).slice(0, 6)}…
                      {str(selectedNode.data.walletPublicKey).slice(-4)}
                    </span>
                  </div>
                ) : (
                  <span className="text-[10px] font-mono text-red-400/70">
                    Connect via WalletConnect node upstream
                  </span>
                )}
              </div>
            </FieldGroup>

            <FieldGroup>
              <FieldLabel>Campaign Name</FieldLabel>
              <StyledInput
                placeholder="Project XYZ Campaign"
                value={str(selectedNode.data.campaignName)}
                onChange={(e) => updateField("campaignName", e.target.value)}
              />
            </FieldGroup>

            <FieldGroup>
              <FieldLabel>Campaign URL</FieldLabel>
              <StyledInput
                placeholder="https://galxe.com/Project/campaign/AliasXYZ"
                value={str(selectedNode.data.campaignUrl)}
                onChange={(e) => updateField("campaignUrl", e.target.value)}
              />
              <div className="text-[8px] font-mono text-slate-600 mt-0.5">
                // Full campaign URL — alias is parsed automatically
              </div>
            </FieldGroup>

            <FieldGroup>
              <FieldLabel>Action</FieldLabel>
              <StyledSelect
                accent={accent}
                value={str(selectedNode.data.action, "complete")}
                onChange={(v) => updateField("action", v)}
                options={[
                  { value: "complete", label: "Complete Tasks" },
                  { value: "claim", label: "Claim OAT" },
                  { value: "check", label: "Check Eligibility" },
                ]}
              />
            </FieldGroup>

            {/* Status indicator */}
            <div
              className="rounded-lg px-3 py-2 flex items-center justify-between"
              style={{
                background: "rgba(2,6,23,0.9)",
                border: hasToken
                  ? "1px solid rgba(52,211,153,0.2)"
                  : "1px solid rgba(51,65,85,0.4)",
              }}
            >
              <div className="flex items-center gap-1.5">
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: hasToken ? "#34d399" : "#475569" }}
                />
                <span
                  className="text-[9px] font-mono"
                  style={{ color: hasToken ? "#34d399" : "#475569" }}
                >
                  {hasToken ? "Token set — ready to execute" : "Token required"}
                </span>
              </div>
            </div>
          </>
        );
      }

      // ── VOLUME FARMER ─────────────────────────────────────────────────────────
      // All fields wired to exactly what VolumeFarmerNode.tsx reads from data
      case "volumeFarmer": {
        const vfTokenPair = str(selectedNode.data.tokenPair, "sol-usdc-sol");
        const vfWallet = str(
          (selectedNode.data.walletPublicKey as string | undefined) ??
            (selectedNode.data.connectedWallet as string | undefined),
          "",
        );
        const vfIsCustom = vfTokenPair === "custom";

        return (
          <>
            {/* Wallet status — read-only, populated by WalletConnectNode upstream */}
            <FieldGroup>
              <FieldLabel>Connected Wallet</FieldLabel>
              <div
                className="h-8 flex items-center justify-between px-3 rounded-md"
                style={{
                  background: "rgba(2,6,23,0.9)",
                  border:
                    vfWallet.length > 30
                      ? "1px solid rgba(52,211,153,0.3)"
                      : "1px solid rgba(248,113,113,0.25)",
                }}
              >
                {vfWallet.length > 30 ? (
                  <>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                      <span className="text-[10px] font-mono text-emerald-400">
                        {vfWallet.slice(0, 6)}…{vfWallet.slice(-4)}
                      </span>
                    </div>
                    <span className="text-[8px] font-mono text-slate-600">
                      from WalletConnect
                    </span>
                  </>
                ) : (
                  <span className="text-[10px] font-mono text-red-400/70">
                    No wallet — connect via WalletConnect node
                  </span>
                )}
              </div>
            </FieldGroup>

            {/* Token pair */}
            <FieldGroup>
              <FieldLabel>Token Pair</FieldLabel>
              <StyledSelect
                accent={accent}
                value={vfTokenPair}
                onChange={(v) => updateField("tokenPair", v)}
                options={[
                  {
                    value: "sol-usdc-sol",
                    label: "SOL → USDC → SOL (round trip)",
                  },
                  { value: "sol-usdc", label: "SOL → USDC" },
                  { value: "usdc-sol", label: "USDC → SOL" },
                  { value: "sol-bonk", label: "SOL → BONK" },
                  { value: "sol-jup", label: "SOL → JUP" },
                  { value: "custom", label: "Custom pair (enter mints)" },
                ]}
              />
            </FieldGroup>

            {/* Custom mint fields */}
            {vfIsCustom && (
              <>
                <FieldGroup>
                  <FieldLabel>Input Token Mint</FieldLabel>
                  <StyledInput
                    placeholder="So111...112 (SOL mint address)"
                    value={str(selectedNode.data.customInputMint)}
                    onChange={(e) =>
                      updateField("customInputMint", e.target.value)
                    }
                    className="font-mono text-[10px]"
                  />
                </FieldGroup>
                <FieldGroup>
                  <FieldLabel>Output Token Mint</FieldLabel>
                  <StyledInput
                    placeholder="EPjFW...t1v (USDC mint address)"
                    value={str(selectedNode.data.customOutputMint)}
                    onChange={(e) =>
                      updateField("customOutputMint", e.target.value)
                    }
                    className="font-mono text-[10px]"
                  />
                </FieldGroup>
              </>
            )}

            {/* Swap count / amount / target */}
            <div className="grid grid-cols-3 gap-2">
              <FieldGroup>
                <FieldLabel>Swaps</FieldLabel>
                <StyledInput
                  type="number"
                  min={1}
                  placeholder="10"
                  value={str(selectedNode.data.swapCount)}
                  onChange={(e) => updateField("swapCount", e.target.value)}
                />
              </FieldGroup>
              <FieldGroup>
                <FieldLabel>$ / Swap</FieldLabel>
                <StyledInput
                  type="number"
                  min={0.01}
                  step="0.01"
                  placeholder="5"
                  value={str(selectedNode.data.swapAmount)}
                  onChange={(e) => updateField("swapAmount", e.target.value)}
                />
              </FieldGroup>
              <FieldGroup>
                <FieldLabel>Target $</FieldLabel>
                <StyledInput
                  type="number"
                  placeholder="optional"
                  value={str(selectedNode.data.targetVolume)}
                  onChange={(e) => updateField("targetVolume", e.target.value)}
                />
              </FieldGroup>
            </div>

            {/* DEX + Chain */}
            <div className="grid grid-cols-2 gap-2">
              <FieldGroup>
                <FieldLabel>DEX</FieldLabel>
                <StyledSelect
                  accent={accent}
                  value={str(selectedNode.data.dex, "jupiter")}
                  onChange={(v) => updateField("dex", v)}
                  options={[
                    { value: "jupiter", label: "Jupiter" },
                    { value: "raydium", label: "Raydium" },
                    { value: "uniswap", label: "Uniswap" },
                    { value: "pancakeswap", label: "PancakeSwap" },
                  ]}
                />
              </FieldGroup>
              <FieldGroup>
                <FieldLabel>Chain</FieldLabel>
                <StyledSelect
                  accent={accent}
                  value={str(selectedNode.data.chain, "solana")}
                  onChange={(v) => updateField("chain", v)}
                  options={[
                    { value: "solana", label: "Solana" },
                    { value: "arbitrum", label: "Arbitrum" },
                    { value: "base", label: "Base" },
                    { value: "ethereum", label: "Ethereum" },
                    { value: "optimism", label: "Optimism" },
                    { value: "polygon", label: "Polygon" },
                  ]}
                />
              </FieldGroup>
            </div>

            {/* Slippage + Delay */}
            <div className="grid grid-cols-2 gap-2">
              <FieldGroup>
                <FieldLabel>Slippage</FieldLabel>
                <StyledSelect
                  accent={accent}
                  value={str(selectedNode.data.slippageBps, "50")}
                  onChange={(v) => updateField("slippageBps", Number(v))}
                  options={[
                    { value: "10", label: "0.1%" },
                    { value: "25", label: "0.25%" },
                    { value: "50", label: "0.5%" },
                    { value: "100", label: "1%" },
                    { value: "200", label: "2%" },
                    { value: "300", label: "3%" },
                  ]}
                />
              </FieldGroup>
              <FieldGroup>
                <FieldLabel>Delay</FieldLabel>
                <StyledSelect
                  accent={accent}
                  value={str(selectedNode.data.delayMs, "1500")}
                  onChange={(v) => updateField("delayMs", Number(v))}
                  options={[
                    { value: "500", label: "0.5s" },
                    { value: "1000", label: "1s" },
                    { value: "1500", label: "1.5s" },
                    { value: "2000", label: "2s" },
                    { value: "3000", label: "3s" },
                    { value: "5000", label: "5s" },
                  ]}
                />
              </FieldGroup>
            </div>

            <StyledCheckbox
              id="randomize-vol"
              checked={bool(selectedNode.data.randomizeAmounts)}
              onChange={(e) =>
                updateField("randomizeAmounts", e.target.checked)
              }
              label="Randomize amounts (±20% variance)"
            />

            <div
              className="rounded-lg px-3 py-2"
              style={{
                background: "rgba(245,158,11,0.05)",
                border: "1px solid rgba(245,158,11,0.12)",
              }}
            >
              <p className="text-[8px] font-mono text-amber-400/50 leading-relaxed">
                Real on-chain swaps via Jupiter v6. Wallet must be connected
                upstream via WalletConnect node. Phantom signs each tx.
              </p>
            </div>
          </>
        );
      }

      case "claimAirdrop":
        return (
          <>
            <FieldGroup>
              <FieldLabel>Project Name</FieldLabel>
              <StyledInput
                placeholder="ProjectXYZ"
                value={str(selectedNode.data.projectName)}
                onChange={(e) => updateField("projectName", e.target.value)}
              />
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Contract Address</FieldLabel>
              <StyledInput
                placeholder="0x..."
                value={str(selectedNode.data.contractAddress)}
                onChange={(e) => updateField("contractAddress", e.target.value)}
                className="font-mono"
              />
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Chain</FieldLabel>
              <StyledSelect
                accent={accent}
                value={str(selectedNode.data.chain, "Ethereum")}
                onChange={(v) => updateField("chain", v)}
                options={CHAINS_EVM}
              />
            </FieldGroup>
            <StyledCheckbox
              id="auto-sell"
              checked={bool(selectedNode.data.autoSell)}
              onChange={(e) => updateField("autoSell", e.target.checked)}
              label="Auto-sell after claim"
            />
          </>
        );

      case "waitDelay":
        return (
          <>
            <div className="grid grid-cols-2 gap-2">
              <FieldGroup>
                <FieldLabel>Duration</FieldLabel>
                <StyledInput
                  type="number"
                  placeholder="60"
                  value={str(selectedNode.data.duration)}
                  onChange={(e) => updateField("duration", e.target.value)}
                />
              </FieldGroup>
              <FieldGroup>
                <FieldLabel>Unit</FieldLabel>
                <StyledSelect
                  accent={accent}
                  value={str(selectedNode.data.unit, "seconds")}
                  onChange={(v) => updateField("unit", v)}
                  options={[
                    { value: "seconds", label: "Seconds" },
                    { value: "minutes", label: "Minutes" },
                    { value: "hours", label: "Hours" },
                    { value: "days", label: "Days" },
                  ]}
                />
              </FieldGroup>
            </div>
            <StyledCheckbox
              id="randomize"
              checked={bool(selectedNode.data.randomize)}
              onChange={(e) => updateField("randomize", e.target.checked)}
              label="Add random variance"
            />
            {selectedNode.data.randomize === true && (
              <FieldGroup>
                <FieldLabel>Variance %</FieldLabel>
                <StyledInput
                  type="number"
                  placeholder="10"
                  value={str(selectedNode.data.randomRange)}
                  onChange={(e) => updateField("randomRange", e.target.value)}
                />
              </FieldGroup>
            )}
          </>
        );

      case "loop":
        return (
          <>
            <FieldGroup>
              <FieldLabel>Iterations</FieldLabel>
              <StyledInput
                type="number"
                placeholder="leave empty for infinite"
                value={str(selectedNode.data.iterations)}
                onChange={(e) => updateField("iterations", e.target.value)}
              />
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Break Condition</FieldLabel>
              <StyledInput
                placeholder="balance > 1000"
                value={str(selectedNode.data.breakCondition)}
                onChange={(e) => updateField("breakCondition", e.target.value)}
              />
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Delay Between Loops</FieldLabel>
              <div className="grid grid-cols-2 gap-2">
                <StyledInput
                  type="number"
                  placeholder="0"
                  value={str(selectedNode.data.loopDelay)}
                  onChange={(e) => updateField("loopDelay", e.target.value)}
                />
                <StyledSelect
                  accent={accent}
                  value={str(selectedNode.data.loopDelayUnit, "seconds")}
                  onChange={(v) => updateField("loopDelayUnit", v)}
                  options={[
                    { value: "seconds", label: "Seconds" },
                    { value: "minutes", label: "Minutes" },
                    { value: "hours", label: "Hours" },
                  ]}
                />
              </div>
            </FieldGroup>
          </>
        );

      case "priceCheck":
        return (
          <>
            <FieldGroup>
              <FieldLabel>Token Symbol</FieldLabel>
              <StyledInput
                placeholder="ETH, SOL, PEPE..."
                value={str(selectedNode.data.token)}
                onChange={(e) =>
                  updateField("token", e.target.value.toUpperCase())
                }
              />
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Price Source</FieldLabel>
              <StyledSelect
                accent={accent}
                value={str(selectedNode.data.priceSource, "coingecko")}
                onChange={(v) => updateField("priceSource", v)}
                options={[
                  { value: "coingecko", label: "CoinGecko" },
                  { value: "coinmarketcap", label: "CoinMarketCap" },
                  { value: "dexscreener", label: "DexScreener" },
                  { value: "jupiter", label: "Jupiter (Solana)" },
                  { value: "chainlink", label: "Chainlink Oracle" },
                ]}
              />
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Alert Threshold ($)</FieldLabel>
              <StyledInput
                type="number"
                placeholder="optional"
                value={str(selectedNode.data.alertThreshold)}
                onChange={(e) => updateField("alertThreshold", e.target.value)}
              />
            </FieldGroup>
          </>
        );

      case "gasOptimizer": {
        const strategy = str(selectedNode.data.strategy, "priority");
        return (
          <>
            <FieldGroup>
              <FieldLabel>Strategy</FieldLabel>
              <StyledSelect
                accent={accent}
                value={strategy}
                onChange={(v) => updateField("strategy", v)}
                options={[
                  { value: "priority", label: "Priority Fee" },
                  { value: "jito", label: "Jito Bundle" },
                  { value: "wait", label: "Wait for Low Fee" },
                ]}
              />
            </FieldGroup>
            {(strategy === "priority" || strategy === "wait") && (
              <FieldGroup>
                <FieldLabel>Fee Level</FieldLabel>
                <StyledSelect
                  accent={accent}
                  value={str(selectedNode.data.urgency, "medium")}
                  onChange={(v) => updateField("urgency", v)}
                  options={[
                    { value: "low", label: "Low (p25)" },
                    { value: "medium", label: "Medium (p50)" },
                    { value: "high", label: "High (p75)" },
                  ]}
                />
              </FieldGroup>
            )}
            {strategy === "wait" && (
              <FieldGroup>
                <FieldLabel>Max Fee (microlamports)</FieldLabel>
                <StyledInput
                  type="number"
                  placeholder="50000"
                  value={str(selectedNode.data.maxFee, "50000")}
                  onChange={(e) => updateField("maxFee", e.target.value)}
                />
              </FieldGroup>
            )}
            <FieldGroup>
              <FieldLabel>Timeout (minutes)</FieldLabel>
              <StyledInput
                type="number"
                placeholder="60"
                value={str(selectedNode.data.timeout, "60")}
                onChange={(e) => updateField("timeout", e.target.value)}
              />
            </FieldGroup>
            <div
              className="rounded-lg px-3 py-2"
              style={{
                background: "rgba(132,204,22,0.04)",
                border: "1px solid rgba(132,204,22,0.15)",
              }}
            >
              <div className="text-[8px] font-mono text-slate-500 leading-relaxed">
                // Solana only · microlamports · live data from{" "}
                {strategy === "jito"
                  ? "bundles.jito.wtf + Solana RPC"
                  : "Solana Mainnet RPC"}
              </div>
            </div>
          </>
        );
      }

      default:
        return (
          <p className="text-xs font-mono text-slate-600">
            // no properties available
          </p>
        );
    }
  };

  return (
    <div
      className="absolute top-4 right-4 w-72 z-10 flex flex-col rounded-xl"
      style={{
        background: "rgba(2, 6, 23, 0.95)",
        border: `1px solid ${accent}33`,
        boxShadow: `0 0 0 1px ${accent}11, 0 24px 48px rgba(0,0,0,0.7), 0 0 24px ${accent}15`,
        backdropFilter: "blur(20px)",
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: `1px solid ${accent}20` }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <ChevronRight
            className="w-3 h-3 shrink-0"
            style={{ color: accent }}
          />
          <span
            className="text-[10px] font-mono font-bold tracking-widest truncate"
            style={{ color: accent }}
          >
            {nodeLabel}
          </span>
        </div>
        <button
          onClick={handleClose}
          className="shrink-0 w-5 h-5 rounded flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
      <div
        className="h-px w-full shrink-0"
        style={{
          background: `linear-gradient(90deg, ${accent}80, transparent 60%)`,
        }}
      />
      <div
        className="flex flex-col gap-3 p-4 overflow-y-auto"
        style={{ maxHeight: "calc(100vh - 180px)" }}
      >
        {renderFields()}
      </div>
      <div
        className="px-4 py-3 shrink-0"
        style={{ borderTop: `1px solid ${accent}15` }}
      >
        <button
          onClick={handleDelete}
          className="w-full h-8 rounded flex items-center justify-center gap-2 text-xs font-mono text-red-400/60 border border-red-500/20 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/5 transition-all duration-150"
        >
          <Trash2 className="w-3 h-3" />
          delete_node()
        </button>
      </div>
    </div>
  );
}
