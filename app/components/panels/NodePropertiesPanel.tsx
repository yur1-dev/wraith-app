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
  ChevronUp,
  Check,
  Plus,
  Copy,
  KeyRound,
  Eye,
  EyeOff,
  Shuffle,
  List,
  AlertTriangle,
  ArrowLeftRight,
} from "lucide-react";
import { useTelegram } from "@/lib/hooks/useTelegram";
import { useWallet } from "@/lib/hooks/useWallet";
import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import type { WalletEntry } from "@/app/components/nodes/MultiWalletNode";

// ─── Utilities ───────────────────────────────────────────────────────────────
const str = (val: unknown, fallback = ""): string =>
  typeof val === "string" ? val : fallback;
const bool = (val: unknown, fallback = false): boolean =>
  typeof val === "boolean" ? val : fallback;

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

// ─── Static data ─────────────────────────────────────────────────────────────
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

const TOKENS_BY_CHAIN: Record<string, string[]> = {
  solana: [
    "SOL",
    "USDC",
    "USDT",
    "BONK",
    "JTO",
    "WIF",
    "JUP",
    "PYTH",
    "RAY",
    "ORCA",
  ],
  ethereum: ["ETH", "USDC", "USDT", "WBTC", "DAI", "WETH"],
  arbitrum: ["ETH", "USDC", "USDT", "ARB", "WBTC", "GMX"],
  base: ["ETH", "USDC", "WETH", "cbETH"],
  optimism: ["ETH", "USDC", "USDT", "WBTC", "DAI"],
  polygon: ["MATIC", "USDC", "USDT", "WBTC", "DAI"],
};

const SWAP_CHAINS = [
  "solana",
  "ethereum",
  "arbitrum",
  "base",
  "optimism",
  "polygon",
];

const DEX_BY_CHAIN: Record<string, string[]> = {
  solana: ["Jupiter", "Orca", "Raydium"],
  ethereum: ["1inch", "Paraswap", "Uniswap"],
  arbitrum: ["1inch", "Paraswap", "Camelot"],
  base: ["1inch", "Paraswap", "Aerodrome"],
  optimism: ["1inch", "Paraswap", "Velodrome"],
  polygon: ["1inch", "Paraswap", "QuickSwap"],
};

const TOKEN_COLORS: Record<string, string> = {
  SOL: "#9945FF",
  ETH: "#627EEA",
  USDC: "#2775CA",
  USDT: "#26A17B",
  WBTC: "#F7931A",
  ARB: "#28A0F0",
  MATIC: "#8247E5",
  JUP: "#C7F284",
  BONK: "#F5A623",
  WIF: "#E8823A",
  JTO: "#4ECDC4",
  PYTH: "#E6007A",
  RAY: "#4A90D9",
  ORCA: "#00C2FF",
  GMX: "#00AFFA",
  DAI: "#F5AC37",
  WETH: "#627EEA",
  cbETH: "#627EEA",
};

const SLIPPAGE_PRESETS = [0.1, 0.5, 1.0, 3.0];

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

function chainColor(chainId: string) {
  return WALLET_CHAINS.find((c) => c.id === chainId)?.color ?? "#64748b";
}

// ─── Primitive UI ─────────────────────────────────────────────────────────────
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

function TokenBadge({ token }: { token: string }) {
  const color = TOKEN_COLORS[token] ?? "#64748b";
  return (
    <div
      className="flex items-center gap-1 rounded-md font-mono font-bold px-1.5 py-0.5 text-[9px]"
      style={{
        background: `${color}22`,
        border: `1px solid ${color}44`,
        color,
      }}
    >
      {token}
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

function TimePickerInput({
  value,
  onChange,
  accent,
}: {
  value: string;
  onChange: (v: string) => void;
  accent: string;
}) {
  const parts = value.split(":");
  const hours = Math.min(23, Math.max(0, parseInt(parts[0] ?? "0", 10) || 0));
  const minutes = Math.min(59, Math.max(0, parseInt(parts[1] ?? "0", 10) || 0));
  const pad = (n: number) => String(n).padStart(2, "0");
  const spinH = (dir: 1 | -1) =>
    onChange(`${pad((hours + dir + 24) % 24)}:${pad(minutes)}`);
  const spinM = (dir: 1 | -1) =>
    onChange(`${pad(hours)}:${pad((minutes + dir * 5 + 60) % 60)}`);

  const DrumCol = ({
    val,
    onUp,
    onDown,
    lbl,
  }: {
    val: number;
    onUp: () => void;
    onDown: () => void;
    lbl: string;
  }) => (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={onUp}
        className="w-8 h-6 flex items-center justify-center rounded-t cursor-pointer"
        style={{
          background: `${accent}18`,
          border: `1px solid ${accent}25`,
          borderBottom: "none",
          color: `${accent}80`,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background =
            `${accent}30`;
          (e.currentTarget as HTMLButtonElement).style.color = accent;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background =
            `${accent}18`;
          (e.currentTarget as HTMLButtonElement).style.color = `${accent}80`;
        }}
      >
        <ChevronUp className="w-3 h-3" />
      </button>
      <div
        className="w-8 h-9 flex items-center justify-center font-mono font-bold select-none"
        style={{
          background: "rgba(2,6,23,0.9)",
          border: `1px solid ${accent}35`,
          color: accent,
          fontSize: 17,
        }}
      >
        {pad(val)}
      </div>
      <button
        type="button"
        onClick={onDown}
        className="w-8 h-6 flex items-center justify-center rounded-b cursor-pointer"
        style={{
          background: `${accent}18`,
          border: `1px solid ${accent}25`,
          borderTop: "none",
          color: `${accent}80`,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background =
            `${accent}30`;
          (e.currentTarget as HTMLButtonElement).style.color = accent;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background =
            `${accent}18`;
          (e.currentTarget as HTMLButtonElement).style.color = `${accent}80`;
        }}
      >
        <ChevronDown className="w-3 h-3" />
      </button>
      <span className="text-[7px] font-mono text-slate-600 uppercase tracking-widest mt-1">
        {lbl}
      </span>
    </div>
  );

  return (
    <div className="flex items-center gap-2">
      <DrumCol
        val={hours}
        onUp={() => spinH(1)}
        onDown={() => spinH(-1)}
        lbl="hr"
      />
      <span className="text-slate-500 font-mono font-bold text-lg mb-4 select-none">
        :
      </span>
      <DrumCol
        val={minutes}
        onUp={() => spinM(1)}
        onDown={() => spinM(-1)}
        lbl="min"
      />
      <span
        className="mb-4 text-[8px] font-mono font-bold uppercase tracking-widest px-1.5 py-0.5 rounded self-center"
        style={{
          color: `${accent}80`,
          background: `${accent}12`,
          border: `1px solid ${accent}20`,
          marginBottom: "18px",
        }}
      >
        UTC
      </span>
    </div>
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
  const [dropStyle, setDropStyle] = useState<React.CSSProperties>({});
  const trigRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  const calcPos = useCallback(() => {
    if (!trigRef.current) return;
    const r = trigRef.current.getBoundingClientRect();
    const h = Math.min(options.length * 36 + 8, 220);
    const below = window.innerHeight - r.bottom - 8;
    setDropStyle({
      position: "fixed",
      left: `${r.left}px`,
      width: `${r.width}px`,
      zIndex: 99999,
      top: below < h && r.top > h ? `${r.top - h - 4}px` : `${r.bottom + 4}px`,
    });
  }, [options.length]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (trigRef.current?.contains(t) || dropRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener("scroll", calcPos, true);
    window.addEventListener("resize", calcPos);
    return () => {
      window.removeEventListener("scroll", calcPos, true);
      window.removeEventListener("resize", calcPos);
    };
  }, [open, calcPos]);

  const dropdown = open ? (
    <div
      ref={dropRef}
      style={{
        ...dropStyle,
        background: "rgba(2,6,23,0.99)",
        border: `1px solid ${accent}44`,
        borderRadius: "8px",
        boxShadow: `0 16px 48px rgba(0,0,0,0.9)`,
        backdropFilter: "blur(24px)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: 1,
          background: `linear-gradient(90deg, ${accent}90, transparent 70%)`,
        }}
      />
      <div style={{ padding: "4px 0", maxHeight: 210, overflowY: "auto" }}>
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
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-mono cursor-pointer transition-all"
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
        ref={trigRef}
        type="button"
        onClick={() => {
          calcPos();
          setOpen((o) => !o);
        }}
        className="w-full h-8 flex items-center justify-between px-3 rounded-md text-xs font-mono transition-all cursor-pointer"
        style={{
          background: open ? `${accent}12` : "rgba(2,6,23,0.9)",
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

// ─── MultiWallet sub-panel ────────────────────────────────────────────────────
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

  // ── FIX: keep a ref that's always current so mutators never close over stale wallets ──
  const walletsRef = useRef<WalletEntry[]>(wallets);
  useEffect(() => {
    walletsRef.current = wallets;
  }, [wallets]);

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

  const resetForm = () => {
    setNewAddress("");
    setNewPrivateKey("");
    setNewLabel("");
    setNewChain(selectedChain);
    setShowNewKey(false);
    setAddMode("manual");
  };

  // ── FIX: all mutators now read from walletsRef.current, never the stale closure ──

  const addWallet = () => {
    if (!newAddress.trim() || !newPrivateKey.trim()) return;
    updateNodeData(nodeId, {
      wallets: [
        ...walletsRef.current,
        {
          id: `w-${Date.now()}`,
          address: newAddress.trim(),
          privateKey: newPrivateKey.trim(),
          label: newLabel.trim() || `Wallet ${walletsRef.current.length + 1}`,
          chain: newChain,
          enabled: true,
          walletType: "manual",
        } as WalletEntry,
      ],
    });
    resetForm();
    setShowAddForm(false);
  };

  const importConnected = (cw: (typeof connectedWallets)[0]) => {
    if (walletsRef.current.find((w) => w.address === cw.address)) return;
    updateNodeData(nodeId, {
      wallets: [
        ...walletsRef.current,
        {
          id: `w-${Date.now()}`,
          address: cw.address,
          privateKey: "",
          label: cw.label,
          chain: cw.type === "phantom" ? "solana" : "ethereum",
          enabled: true,
          walletType: cw.type === "phantom" ? "phantom" : "metamask",
        } as WalletEntry,
      ],
    });
    setShowAddForm(false);
    resetForm();
  };

  const removeWallet = (id: string) =>
    updateNodeData(nodeId, {
      wallets: walletsRef.current.filter((w) => w.id !== id),
    });

  const toggleWallet = (id: string) =>
    updateNodeData(nodeId, {
      wallets: walletsRef.current.map((w) =>
        w.id === id ? { ...w, enabled: !w.enabled } : w,
      ),
    });

  const updatePK = (id: string, key: string) =>
    updateNodeData(nodeId, {
      wallets: walletsRef.current.map((w) =>
        w.id === id ? { ...w, privateKey: key } : w,
      ),
    });

  const updateWalletLabel = (id: string, label: string) =>
    updateNodeData(nodeId, {
      wallets: walletsRef.current.map((w) =>
        w.id === id ? { ...w, label } : w,
      ),
    });

  const copyAddr = (id: string, addr: string) => {
    navigator.clipboard.writeText(addr).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="space-y-3">
      {/* Execution mode */}
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

      {/* Default network */}
      <FieldGroup>
        <FieldLabel>Default Network</FieldLabel>
        <StyledSelect
          accent={accent}
          value={selectedChain}
          onChange={(v) => updateField("chain", v)}
          options={WALLET_CHAINS.map((c) => ({ value: c.id, label: c.label }))}
        />
      </FieldGroup>

      {/* Wallet list header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <FieldLabel>Wallets</FieldLabel>
            <p className="text-[8px] font-mono text-slate-600 mt-0.5">
              {wallets.length === 0
                ? "None added"
                : `${readyCount}/${wallets.length} ready`}
            </p>
          </div>
          <button
            onClick={() => {
              if (showAddForm) resetForm();
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
            {showAddForm ? "Cancel" : "Add"}
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
            <p className="text-[8px] font-mono text-red-400/70">
              Some wallets missing private key — will be skipped.
            </p>
          </div>
        )}

        {/* Add form */}
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
                  {m === "manual" ? "Manual" : "Import"}
                </button>
              ))}
            </div>

            {addMode === "connected" ? (
              <div className="space-y-1.5">
                {connectedWallets.length === 0 ? (
                  <div className="py-4 text-center text-[9px] font-mono text-slate-600 border border-dashed border-slate-700/40 rounded-lg">
                    No wallets connected
                  </div>
                ) : (
                  connectedWallets.map((cw) => {
                    const added = wallets.find((w) => w.address === cw.address);
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
                          <div className="text-[8px] font-mono text-slate-500">
                            {shortAddr(cw.address)}
                          </div>
                        </div>
                        <button
                          onClick={() => importConnected(cw)}
                          disabled={!!added}
                          className="px-2 py-1 rounded text-[8px] font-mono font-bold cursor-pointer transition-all disabled:opacity-40 border shrink-0"
                          style={
                            added
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
                          {added ? "Added" : "Import"}
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
                    placeholder="Farming Wallet 1"
                    autoComplete="off"
                    name="mw-lbl"
                    className="w-full h-7 px-2.5 rounded bg-slate-950 border border-slate-700/60 text-cyan-100 text-[10px] font-mono placeholder:text-slate-700 focus:border-cyan-500/50 focus:outline-none transition-colors"
                  />
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
                <div>
                  <div className="text-[7px] font-mono text-slate-600 uppercase tracking-widest mb-1">
                    Public Address
                  </div>
                  <input
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    placeholder={
                      newChain === "solana" ? "7xKX… base58" : "0x… hex"
                    }
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    name="mw-pub"
                    className={`w-full h-7 px-2.5 rounded bg-slate-950 text-cyan-100 text-[10px] font-mono placeholder:text-slate-700 focus:outline-none transition-colors border ${newAddress && !isValidAddress(newAddress) ? "border-red-500/50" : "border-slate-700/60 focus:border-cyan-500/50"}`}
                  />
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
                          ? "Base58 (87–88 chars)"
                          : "Hex 64 chars"
                      }
                      autoComplete="new-password"
                      name="mw-pk"
                      className={`w-full h-7 px-2.5 pr-8 rounded bg-slate-950 text-cyan-100 text-[10px] font-mono placeholder:text-slate-700 focus:outline-none transition-colors border ${newPrivateKey && !isValidPrivateKey(newPrivateKey, newChain) ? "border-red-500/50" : "border-slate-700/60 focus:border-cyan-500/50"}`}
                    />
                    <button
                      onClick={() => setShowNewKey((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors"
                    >
                      {showNewKey ? (
                        <EyeOff className="w-3 h-3" />
                      ) : (
                        <Eye className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>
                <button
                  onClick={addWallet}
                  disabled={
                    !newAddress.trim() ||
                    !newPrivateKey.trim() ||
                    !isValidAddress(newAddress)
                  }
                  className="w-full h-7 rounded text-[9px] font-mono font-bold uppercase tracking-wider cursor-pointer transition-all flex items-center justify-center gap-1.5 disabled:opacity-30 border mt-1"
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

        {/* Wallet list */}
        <div
          className="space-y-1.5"
          style={{ maxHeight: 260, overflowY: "auto" }}
        >
          {wallets.length === 0 && !showAddForm && (
            <div className="py-5 text-center border border-dashed border-slate-700/30 rounded-xl">
              <div className="text-[10px] font-mono text-slate-600">
                No wallets added
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
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[7px] font-mono text-slate-700">
                    #{i + 1}
                  </span>
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: chainColor(w.chain) }}
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
                      <AlertTriangle className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => copyAddr(w.id, w.address)}
                    className="p-1 rounded cursor-pointer hover:bg-slate-700/40 transition-colors"
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
                            borderColor: "rgba(51,65,65,0.3)",
                          }
                    }
                  >
                    {w.enabled ? "ON" : "OFF"}
                  </button>
                  <button
                    onClick={() => removeWallet(w.id)}
                    className="p-1 rounded cursor-pointer text-slate-600 hover:text-red-400 transition-colors"
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
                  className="w-3 h-3 shrink-0"
                  style={{ color: w.privateKey ? "#34d399" : "#f87171" }}
                />
                <div className="flex-1 min-w-0">
                  {showKeyId === w.id ? (
                    <input
                      value={w.privateKey}
                      onChange={(e) => updatePK(w.id, e.target.value)}
                      placeholder="Paste private key…"
                      autoFocus
                      autoComplete="off"
                      name={`pk-${w.id}`}
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
                          : "No key — click to add"}
                      </span>
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setShowKeyId(showKeyId === w.id ? null : w.id)}
                  className="cursor-pointer text-slate-600 hover:text-slate-400 transition-colors shrink-0"
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

// ─── Swap sub-panel ───────────────────────────────────────────────────────────
function SwapPanel({
  data,
  accent,
  updateField,
  updateNodeData,
  nodeId,
}: {
  data: Record<string, unknown>;
  accent: string;
  updateField: (f: string, v: unknown) => void;
  updateNodeData: (id: string, d: Record<string, unknown>) => void;
  nodeId: string;
}) {
  const chain = str(data.chain, "solana");
  const fromToken = str(data.fromToken, "SOL").toUpperCase();
  const toToken = str(data.toToken, "USDC").toUpperCase();
  const slippage = parseFloat(str(data.slippage, "0.5"));
  const dex = str(data.dex, "auto");
  const tokens = TOKENS_BY_CHAIN[chain] ?? TOKENS_BY_CHAIN.solana;
  const dexOptions = ["auto", ...(DEX_BY_CHAIN[chain] ?? [])];
  const [fromDrop, setFromDrop] = useState(false);
  const [toDrop, setToDrop] = useState(false);

  return (
    <div className="space-y-3">
      <FieldGroup>
        <FieldLabel>Chain</FieldLabel>
        <div className="grid grid-cols-3 gap-1">
          {SWAP_CHAINS.map((c) => (
            <button
              key={c}
              onClick={() => {
                const nt = TOKENS_BY_CHAIN[c] ?? [];
                const nf = nt.includes(fromToken) ? fromToken : nt[0];
                const to = nt.find((t) => t !== nf) ?? nt[1] ?? nt[0];
                updateNodeData(nodeId, {
                  chain: c,
                  fromToken: nf,
                  toToken: to,
                });
              }}
              className="py-1.5 rounded-lg text-[8px] font-mono font-bold capitalize tracking-wider cursor-pointer transition-all"
              style={
                chain === c
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
              {c === "ethereum"
                ? "ETH"
                : c === "arbitrum"
                  ? "ARB"
                  : c === "optimism"
                    ? "OP"
                    : c.slice(0, 4)}
            </button>
          ))}
        </div>
      </FieldGroup>

      <div className="grid grid-cols-[1fr,auto,1fr] gap-1.5 items-end">
        <FieldGroup>
          <FieldLabel>From</FieldLabel>
          <div className="relative">
            <button
              onClick={() => {
                setFromDrop((v) => !v);
                setToDrop(false);
              }}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer"
              style={{
                background: "rgba(2,6,23,0.9)",
                border: `1px solid ${fromDrop ? accent + "55" : "rgba(51,65,85,0.8)"}`,
              }}
            >
              <TokenBadge token={fromToken} />
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>
            {fromDrop && (
              <div
                className="absolute top-[calc(100%+4px)] left-0 right-0 rounded-lg overflow-hidden z-10"
                style={{
                  background: "rgba(2,6,23,0.98)",
                  border: `1px solid ${accent}33`,
                }}
              >
                {tokens
                  .filter((t) => t !== toToken)
                  .map((t) => (
                    <button
                      key={t}
                      onClick={() => {
                        updateField("fromToken", t);
                        setFromDrop(false);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-white/5 cursor-pointer"
                    >
                      <TokenBadge token={t} />
                    </button>
                  ))}
              </div>
            )}
          </div>
        </FieldGroup>
        <button
          onClick={() => {
            updateField("fromToken", toToken);
            updateField("toToken", fromToken);
          }}
          className="mb-0.5 w-7 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-all"
          style={{
            background: `${accent}10`,
            border: `1px solid ${accent}22`,
            color: accent,
          }}
        >
          <ArrowLeftRight className="w-3 h-3" />
        </button>
        <FieldGroup>
          <FieldLabel>To</FieldLabel>
          <div className="relative">
            <button
              onClick={() => {
                setToDrop((v) => !v);
                setFromDrop(false);
              }}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer"
              style={{
                background: "rgba(2,6,23,0.9)",
                border: `1px solid ${toDrop ? accent + "55" : "rgba(51,65,85,0.8)"}`,
              }}
            >
              <TokenBadge token={toToken} />
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>
            {toDrop && (
              <div
                className="absolute top-[calc(100%+4px)] left-0 right-0 rounded-lg overflow-hidden z-10"
                style={{
                  background: "rgba(2,6,23,0.98)",
                  border: `1px solid ${accent}33`,
                }}
              >
                {tokens
                  .filter((t) => t !== fromToken)
                  .map((t) => (
                    <button
                      key={t}
                      onClick={() => {
                        updateField("toToken", t);
                        setToDrop(false);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-white/5 cursor-pointer"
                    >
                      <TokenBadge token={t} />
                    </button>
                  ))}
              </div>
            )}
          </div>
        </FieldGroup>
      </div>

      <FieldGroup>
        <FieldLabel>Amount ({fromToken})</FieldLabel>
        <input
          type="text"
          inputMode="decimal"
          value={str(data.amount, "1")}
          onChange={(e) => {
            if (/^\d*\.?\d*$/.test(e.target.value))
              updateField("amount", e.target.value);
          }}
          placeholder="1"
          className="w-full h-8 px-3 rounded-md text-[11px] font-mono text-cyan-100 focus:outline-none"
          style={{
            background: "rgba(2,6,23,0.9)",
            border: "1px solid rgba(51,65,85,0.8)",
          }}
          onFocus={(e) => (e.target.style.borderColor = accent)}
          onBlur={(e) => (e.target.style.borderColor = "rgba(51,65,85,0.8)")}
        />
      </FieldGroup>

      <FieldGroup>
        <FieldLabel>Slippage</FieldLabel>
        <div className="grid grid-cols-4 gap-1">
          {SLIPPAGE_PRESETS.map((s) => (
            <button
              key={s}
              onClick={() => updateField("slippage", s)}
              className="py-1.5 rounded-lg text-[8px] font-mono font-bold tracking-wider cursor-pointer transition-all"
              style={
                slippage === s
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
              {s}%
            </button>
          ))}
        </div>
      </FieldGroup>

      <FieldGroup>
        <FieldLabel>DEX / Aggregator</FieldLabel>
        <div className="space-y-1">
          {dexOptions.map((d) => (
            <button
              key={d}
              onClick={() => updateField("dex", d)}
              className="w-full py-1.5 px-2.5 rounded-lg text-left cursor-pointer transition-all"
              style={
                dex === d
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
              <span
                className="text-[9px] font-mono font-bold"
                style={{ color: dex === d ? accent : "rgba(148,163,184,0.6)" }}
              >
                {d === "auto" ? "Auto (Best Route)" : d}
              </span>
            </button>
          ))}
        </div>
      </FieldGroup>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
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

  // ── Responsive ──────────────────────────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (!selectedNode) return null;

  const accent =
    typeof selectedNode.data.customColor === "string"
      ? selectedNode.data.customColor
      : (NODE_COLORS[selectedNode.type ?? ""] ?? "#22d3ee");
  const nodeLabel =
    NODE_LABELS[selectedNode.type ?? ""] ?? selectedNode.type?.toUpperCase();

  const handleClose = () => setSelectedNode(null);
  const handleDelete = () => {
    deleteNode(selectedNode.id);
    setSelectedNode(null);
  };
  const updateField = (field: string, value: unknown) =>
    updateNodeData(selectedNode.id, { [field]: value });

  // ─── Field renderers ───────────────────────────────────────────────────────
  const renderFields = () => {
    switch (selectedNode.type) {
      case "trigger": {
        const tt = str(selectedNode.data.triggerType, "schedule");
        const sp = str(selectedNode.data.schedulePreset, "Daily");
        return (
          <>
            <FieldGroup>
              <FieldLabel>Type</FieldLabel>
              <StyledSelect
                accent={accent}
                value={tt}
                onChange={(v) => updateField("triggerType", v)}
                options={[
                  { value: "schedule", label: "Schedule" },
                  { value: "price", label: "Price Alert" },
                  { value: "wallet", label: "Wallet Event" },
                  { value: "manual", label: "Manual" },
                ]}
              />
            </FieldGroup>
            {tt === "schedule" && (
              <>
                <FieldGroup>
                  <FieldLabel>Frequency</FieldLabel>
                  <StyledSelect
                    accent={accent}
                    value={sp}
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
                {(sp === "Daily" || sp === "Weekly") && (
                  <FieldGroup>
                    <FieldLabel>Time (UTC)</FieldLabel>
                    <TimePickerInput
                      value={str(selectedNode.data.scheduleTime, "03:00")}
                      onChange={(v) => updateField("scheduleTime", v)}
                      accent={accent}
                    />
                  </FieldGroup>
                )}
                {sp === "Custom" && (
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
            {tt === "price" && (
              <>
                <FieldGroup>
                  <FieldLabel>Token</FieldLabel>
                  <StyledInput
                    placeholder="SOL, ETH…"
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
            {tt === "wallet" && (
              <>
                <FieldGroup>
                  <FieldLabel>Event</FieldLabel>
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
                  <FieldLabel>Min Amount</FieldLabel>
                  <StyledInput
                    type="number"
                    placeholder="0.00"
                    value={str(selectedNode.data.minAmount)}
                    onChange={(e) => updateField("minAmount", e.target.value)}
                  />
                </FieldGroup>
              </>
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
          <SwapPanel
            nodeId={selectedNode.id}
            data={selectedNode.data as Record<string, unknown>}
            accent={accent}
            updateField={updateField}
            updateNodeData={updateNodeData}
          />
        );

      case "bridge": {
        const bp = str(selectedNode.data.bridgeProtocol, "Across");
        const chains =
          BRIDGE_PROTOCOL_CHAINS[bp] ?? BRIDGE_PROTOCOL_CHAINS.Across;
        const from = chains.find(
          (c) => c.value === str(selectedNode.data.fromChain),
        )
          ? str(selectedNode.data.fromChain)
          : chains[0].value;
        const toOpts = chains.filter((c) => c.value !== from);
        const to = toOpts.find(
          (c) => c.value === str(selectedNode.data.toChain),
        )
          ? str(selectedNode.data.toChain)
          : (toOpts[0]?.value ?? "");
        return (
          <>
            <FieldGroup>
              <FieldLabel>Protocol</FieldLabel>
              <StyledSelect
                accent={accent}
                value={bp}
                onChange={(v) => {
                  const nc =
                    BRIDGE_PROTOCOL_CHAINS[v] ?? BRIDGE_PROTOCOL_CHAINS.Across;
                  const nf = nc.find((c) => c.value === from)
                    ? from
                    : nc[0].value;
                  const nt =
                    nc.find((c) => c.value !== nf)?.value ?? nc[0].value;
                  updateNodeData(selectedNode.id, {
                    bridgeProtocol: v,
                    fromChain: nf,
                    toChain: nt,
                  });
                }}
                options={[
                  { value: "Across", label: "Across" },
                  { value: "Hop", label: "Hop" },
                  { value: "Synapse", label: "Synapse" },
                ]}
              />
            </FieldGroup>
            <div className="grid grid-cols-[1fr,auto,1fr] gap-1.5 items-end">
              <FieldGroup>
                <FieldLabel>From</FieldLabel>
                <StyledSelect
                  accent={accent}
                  value={from}
                  onChange={(v) => {
                    const nt =
                      to === v
                        ? (chains.find((c) => c.value !== v)?.value ??
                          chains[0].value)
                        : to;
                    updateNodeData(selectedNode.id, {
                      fromChain: v,
                      toChain: nt,
                    });
                  }}
                  options={chains}
                />
              </FieldGroup>
              <div className="mb-0.5 flex items-end justify-center pb-1">
                <ArrowLeftRight
                  className="w-3 h-3"
                  style={{ color: `${accent}60` }}
                />
              </div>
              <FieldGroup>
                <FieldLabel>To</FieldLabel>
                <StyledSelect
                  accent={accent}
                  value={to}
                  onChange={(v) => updateField("toChain", v)}
                  options={toOpts}
                />
              </FieldGroup>
            </div>
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
              <FieldLabel>From</FieldLabel>
              <StyledSelect
                accent={accent}
                value={str(selectedNode.data.currentChain, "Ethereum")}
                onChange={(v) => updateField("currentChain", v)}
                options={CHAINS_EVM}
              />
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>To</FieldLabel>
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
        const at = str(selectedNode.data.alertType, "Telegram");
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
                value={at}
                onChange={(v) => updateField("alertType", v)}
                options={[
                  { value: "Telegram", label: "Telegram" },
                  { value: "Discord", label: "Discord" },
                  { value: "Email", label: "Email" },
                  { value: "Webhook", label: "Webhook" },
                ]}
              />
            </FieldGroup>
            {at === "Telegram" && (
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
                      {tgConnected ? "Bot connected" : "Not connected"}
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
              </div>
            )}
            {(at === "Discord" || at === "Webhook") && (
              <FieldGroup>
                <FieldLabel>Webhook URL</FieldLabel>
                <StyledInput
                  placeholder="https://..."
                  value={str(selectedNode.data.webhookUrl)}
                  onChange={(e) => updateField("webhookUrl", e.target.value)}
                />
              </FieldGroup>
            )}
            {at === "Email" && (
              <>
                <FieldGroup>
                  <FieldLabel>To</FieldLabel>
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
                placeholder="Flow completed!"
                value={str(selectedNode.data.message)}
                onChange={(e) => updateField("message", e.target.value)}
              />
            </FieldGroup>
          </>
        );
      }

      case "condition": {
        const ct = str(selectedNode.data.conditionType, "price");
        return (
          <>
            <FieldGroup>
              <FieldLabel>Type</FieldLabel>
              <StyledSelect
                accent={accent}
                value={ct}
                onChange={(v) => updateField("conditionType", v)}
                options={[
                  { value: "price", label: "Price" },
                  { value: "balance", label: "Balance" },
                  { value: "gas", label: "Gas Fee" },
                  { value: "custom", label: "Custom Expression" },
                ]}
              />
            </FieldGroup>
            {ct === "price" && (
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
                  { value: ">", label: ">" },
                  { value: "<", label: "<" },
                  { value: "=", label: "=" },
                  { value: ">=", label: ">=" },
                  { value: "<=", label: "<=" },
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
            {ct === "custom" && (
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
        const wt = str(selectedNode.data.walletType, "phantom");
        const addr = str(selectedNode.data.address);
        const connected = !!addr;
        return (
          <>
            <FieldGroup>
              <FieldLabel>Provider</FieldLabel>
              <StyledSelect
                accent={accent}
                value={wt}
                onChange={(v) => updateField("walletType", v)}
                options={[
                  { value: "phantom", label: "Phantom (Solana)" },
                  { value: "backpack", label: "Backpack (Solana)" },
                  { value: "solflare", label: "Solflare (Solana)" },
                  { value: "metamask", label: "MetaMask (EVM)" },
                  { value: "rabby", label: "Rabby (EVM)" },
                  { value: "coinbase", label: "Coinbase (EVM)" },
                ]}
              />
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Status</FieldLabel>
              <div
                className="h-8 flex items-center gap-2 px-3 rounded-md text-xs font-mono"
                style={{
                  background: "rgba(2,6,23,0.9)",
                  border: connected
                    ? "1px solid rgba(52,211,153,0.3)"
                    : "1px solid rgba(51,65,85,0.8)",
                }}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: connected ? "#34d399" : "#475569" }}
                />
                <span style={{ color: connected ? "#34d399" : "#475569" }}>
                  {connected ? shortAddr(addr) : "Not connected"}
                </span>
                {str(selectedNode.data.network) && (
                  <span
                    className="text-[9px] font-mono px-1.5 py-0.5 rounded ml-auto"
                    style={{
                      background: `${accent}18`,
                      border: `1px solid ${accent}33`,
                      color: accent,
                    }}
                  >
                    {str(selectedNode.data.network)}
                  </span>
                )}
              </div>
            </FieldGroup>
            {!connected && (
              <FieldGroup>
                <FieldLabel>Address Override</FieldLabel>
                <StyledInput
                  placeholder={
                    ["phantom", "backpack", "solflare"].includes(wt)
                      ? "7xKX… base58"
                      : "0x… hex"
                  }
                  value={addr}
                  onChange={(e) => updateField("address", e.target.value)}
                  className="font-mono"
                />
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
        const tt = str(selectedNode.data.taskType, "follow");
        return (
          <>
            <FieldGroup>
              <FieldLabel>Task</FieldLabel>
              <StyledSelect
                accent={accent}
                value={tt}
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
            {(tt === "quote" || tt === "tweet") && (
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
        const tt = str(selectedNode.data.taskType, "join");
        const hasToken = str(selectedNode.data.discordToken).length > 10;
        return (
          <>
            <FieldGroup>
              <FieldLabel>Token</FieldLabel>
              <StyledInput
                type="password"
                placeholder="Discord user token"
                value={str(selectedNode.data.discordToken)}
                onChange={(e) => updateField("discordToken", e.target.value)}
                className="font-mono"
                autoComplete="off"
              />
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Task</FieldLabel>
              <StyledSelect
                accent={accent}
                value={tt}
                onChange={(v) => updateField("taskType", v)}
                options={[
                  { value: "join", label: "Join Server" },
                  { value: "message", label: "Send Message" },
                  { value: "react", label: "React" },
                  { value: "role", label: "Get Role" },
                ]}
              />
            </FieldGroup>
            {tt === "join" && (
              <FieldGroup>
                <FieldLabel>Server Invite</FieldLabel>
                <StyledInput
                  placeholder="discord.gg/abc123"
                  value={str(selectedNode.data.serverId)}
                  onChange={(e) => updateField("serverId", e.target.value)}
                />
              </FieldGroup>
            )}
            {(tt === "message" || tt === "react" || tt === "role") && (
              <FieldGroup>
                <FieldLabel>Channel ID</FieldLabel>
                <StyledInput
                  placeholder="123456789"
                  value={str(selectedNode.data.channelId)}
                  onChange={(e) => updateField("channelId", e.target.value)}
                  className="font-mono"
                />
              </FieldGroup>
            )}
            {tt === "message" && (
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
            {(tt === "react" || tt === "role") && (
              <>
                <FieldGroup>
                  <FieldLabel>Message ID</FieldLabel>
                  <StyledInput
                    placeholder="123456789"
                    value={str(selectedNode.data.messageId)}
                    onChange={(e) => updateField("messageId", e.target.value)}
                    className="font-mono"
                  />
                </FieldGroup>
                <FieldGroup>
                  <FieldLabel>Emoji</FieldLabel>
                  <StyledInput
                    placeholder="👍"
                    value={str(selectedNode.data.emoji, "👍")}
                    onChange={(e) => updateField("emoji", e.target.value)}
                  />
                </FieldGroup>
              </>
            )}
            {tt === "role" && (
              <FieldGroup>
                <FieldLabel>Role ID</FieldLabel>
                <StyledInput
                  placeholder="Role ID (optional)"
                  value={str(selectedNode.data.roleId)}
                  onChange={(e) => updateField("roleId", e.target.value)}
                  className="font-mono"
                />
              </FieldGroup>
            )}
            <div
              className="h-7 flex items-center gap-2 px-3 rounded-md"
              style={{
                background: "rgba(2,6,23,0.9)",
                border: hasToken
                  ? "1px solid rgba(52,211,153,0.2)"
                  : "1px solid rgba(51,65,85,0.4)",
              }}
            >
              <div
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: hasToken ? "#34d399" : "#475569" }}
              />
              <span
                className="text-[9px] font-mono"
                style={{ color: hasToken ? "#34d399" : "#475569" }}
              >
                {hasToken ? "Token set" : "Token required"}
              </span>
            </div>
          </>
        );
      }

      case "galxe": {
        const hasToken = str(selectedNode.data.galxeToken ?? "").length > 10;
        const injectedWallet = str(selectedNode.data.walletPublicKey ?? "");
        const hasWallet = injectedWallet.length > 10;
        return (
          <>
            <FieldGroup>
              <FieldLabel>Access Token</FieldLabel>
              <StyledInput
                type="password"
                placeholder="Galxe access token"
                value={str(selectedNode.data.galxeToken)}
                onChange={(e) => updateField("galxeToken", e.target.value)}
                className="font-mono"
                autoComplete="off"
              />
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Campaign Name</FieldLabel>
              <StyledInput
                placeholder="e.g. Arbitrum Odyssey"
                value={str(selectedNode.data.campaignName)}
                onChange={(e) => updateField("campaignName", e.target.value)}
              />
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Wallet</FieldLabel>
              <div
                className="h-8 flex items-center px-3 rounded-md"
                style={{
                  background: "rgba(2,6,23,0.9)",
                  border: hasWallet
                    ? "1px solid rgba(52,211,153,0.3)"
                    : "1px solid rgba(248,113,113,0.25)",
                }}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full mr-2 shrink-0"
                  style={{ background: hasWallet ? "#34d399" : "#f87171" }}
                />
                <span
                  className="text-[10px] font-mono"
                  style={{
                    color: hasWallet ? "#34d399" : "rgba(248,113,113,0.7)",
                  }}
                >
                  {hasWallet
                    ? shortAddr(injectedWallet)
                    : "Connect via WalletConnect node"}
                </span>
              </div>
            </FieldGroup>
            {!hasWallet && (
              <FieldGroup>
                <FieldLabel>Wallet Address (manual fallback)</FieldLabel>
                <StyledInput
                  placeholder="Solana pubkey or 0x EVM address"
                  value={str(selectedNode.data.manualWalletAddress)}
                  onChange={(e) => {
                    updateField("manualWalletAddress", e.target.value);
                    updateField("walletPublicKey", e.target.value || undefined);
                  }}
                  className="font-mono"
                />
              </FieldGroup>
            )}
            <FieldGroup>
              <FieldLabel>Campaign URL</FieldLabel>
              <StyledInput
                placeholder="https://galxe.com/Project/campaign/…"
                value={str(selectedNode.data.campaignUrl)}
                onChange={(e) => updateField("campaignUrl", e.target.value)}
              />
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
            <div
              className="h-7 flex items-center gap-2 px-3 rounded-md"
              style={{
                background: "rgba(2,6,23,0.9)",
                border:
                  hasToken && hasWallet
                    ? "1px solid rgba(52,211,153,0.2)"
                    : "1px solid rgba(51,65,85,0.4)",
              }}
            >
              <div
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{
                  background: hasToken && hasWallet ? "#34d399" : "#475569",
                }}
              />
              <span
                className="text-[9px] font-mono"
                style={{ color: hasToken && hasWallet ? "#34d399" : "#475569" }}
              >
                {hasToken && hasWallet
                  ? "Ready"
                  : !hasToken
                    ? "Token required"
                    : "Wallet required"}
              </span>
            </div>
          </>
        );
      }

      case "volumeFarmer": {
        const pair = str(selectedNode.data.tokenPair, "sol-usdc-sol");
        const wallet = str(
          (selectedNode.data.walletPublicKey as string | undefined) ??
            (selectedNode.data.connectedWallet as string | undefined),
          "",
        );
        return (
          <>
            <FieldGroup>
              <FieldLabel>Wallet</FieldLabel>
              <div
                className="h-8 flex items-center px-3 rounded-md"
                style={{
                  background: "rgba(2,6,23,0.9)",
                  border:
                    wallet.length > 30
                      ? "1px solid rgba(52,211,153,0.3)"
                      : "1px solid rgba(248,113,113,0.25)",
                }}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full mr-2 shrink-0"
                  style={{
                    background: wallet.length > 30 ? "#34d399" : "#f87171",
                  }}
                />
                <span
                  className="text-[10px] font-mono"
                  style={{
                    color:
                      wallet.length > 30 ? "#34d399" : "rgba(248,113,113,0.7)",
                  }}
                >
                  {wallet.length > 30
                    ? shortAddr(wallet)
                    : "Connect via WalletConnect node"}
                </span>
              </div>
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Pair</FieldLabel>
              <StyledSelect
                accent={accent}
                value={pair}
                onChange={(v) => updateField("tokenPair", v)}
                options={[
                  { value: "sol-usdc-sol", label: "SOL → USDC → SOL" },
                  { value: "sol-usdc", label: "SOL → USDC" },
                  { value: "usdc-sol", label: "USDC → SOL" },
                  { value: "sol-bonk", label: "SOL → BONK" },
                  { value: "sol-jup", label: "SOL → JUP" },
                  { value: "custom", label: "Custom pair" },
                ]}
              />
            </FieldGroup>
            {pair === "custom" && (
              <>
                <FieldGroup>
                  <FieldLabel>Input Mint</FieldLabel>
                  <StyledInput
                    placeholder="So111…112"
                    value={str(selectedNode.data.customInputMint)}
                    onChange={(e) =>
                      updateField("customInputMint", e.target.value)
                    }
                    className="font-mono text-[10px]"
                  />
                </FieldGroup>
                <FieldGroup>
                  <FieldLabel>Output Mint</FieldLabel>
                  <StyledInput
                    placeholder="EPjFW…t1v"
                    value={str(selectedNode.data.customOutputMint)}
                    onChange={(e) =>
                      updateField("customOutputMint", e.target.value)
                    }
                    className="font-mono text-[10px]"
                  />
                </FieldGroup>
              </>
            )}
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
                  placeholder="5"
                  value={str(selectedNode.data.swapAmount)}
                  onChange={(e) => updateField("swapAmount", e.target.value)}
                />
              </FieldGroup>
              <FieldGroup>
                <FieldLabel>Target $</FieldLabel>
                <StyledInput
                  type="number"
                  placeholder="∞"
                  value={str(selectedNode.data.targetVolume)}
                  onChange={(e) => updateField("targetVolume", e.target.value)}
                />
              </FieldGroup>
            </div>
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
                  ]}
                />
              </FieldGroup>
              <FieldGroup>
                <FieldLabel>Slippage</FieldLabel>
                <StyledSelect
                  accent={accent}
                  value={str(selectedNode.data.slippageBps, "50")}
                  onChange={(v) => updateField("slippageBps", Number(v))}
                  options={[
                    { value: "10", label: "0.1%" },
                    { value: "50", label: "0.5%" },
                    { value: "100", label: "1%" },
                    { value: "200", label: "2%" },
                  ]}
                />
              </FieldGroup>
            </div>
            <FieldGroup>
              <FieldLabel>Delay Between Swaps (ms)</FieldLabel>
              <StyledInput
                type="number"
                placeholder="1500"
                value={str(selectedNode.data.delayMs, "1500")}
                onChange={(e) =>
                  updateField(
                    "delayMs",
                    Math.max(500, parseInt(e.target.value) || 1500),
                  )
                }
              />
            </FieldGroup>
            <StyledCheckbox
              id="vf-rand"
              checked={bool(selectedNode.data.randomizeAmounts)}
              onChange={(e) =>
                updateField("randomizeAmounts", e.target.checked)
              }
              label="Randomize amounts ±20%"
            />
          </>
        );
      }

      case "claimAirdrop":
        return (
          <>
            <FieldGroup>
              <FieldLabel>Wallet Address (EVM)</FieldLabel>
              <StyledInput
                placeholder="0x…"
                value={str(selectedNode.data.walletAddress)}
                onChange={(e) => updateField("walletAddress", e.target.value)}
                className="font-mono"
              />
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Project</FieldLabel>
              <StyledInput
                placeholder="ProjectXYZ"
                value={str(selectedNode.data.projectName)}
                onChange={(e) => updateField("projectName", e.target.value)}
              />
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Contract</FieldLabel>
              <StyledInput
                placeholder="0x…"
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
              id="ca-sell"
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
              id="wd-rand"
              checked={bool(selectedNode.data.randomize)}
              onChange={(e) => updateField("randomize", e.target.checked)}
              label="Add random variance"
            />
            {bool(selectedNode.data.randomize) && (
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
                placeholder="∞ unlimited"
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
            <div className="grid grid-cols-2 gap-2">
              <FieldGroup>
                <FieldLabel>Loop Delay</FieldLabel>
                <StyledInput
                  type="number"
                  placeholder="0"
                  value={str(selectedNode.data.loopDelay)}
                  onChange={(e) => updateField("loopDelay", e.target.value)}
                />
              </FieldGroup>
              <FieldGroup>
                <FieldLabel>Unit</FieldLabel>
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
              </FieldGroup>
            </div>
          </>
        );

      case "priceCheck":
        return (
          <>
            <FieldGroup>
              <FieldLabel>Token</FieldLabel>
              <StyledInput
                placeholder="ETH, SOL…"
                value={str(selectedNode.data.token)}
                onChange={(e) =>
                  updateField("token", e.target.value.toUpperCase())
                }
              />
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Source</FieldLabel>
              <StyledSelect
                accent={accent}
                value={str(selectedNode.data.priceSource, "coingecko")}
                onChange={(v) => updateField("priceSource", v)}
                options={[
                  { value: "coingecko", label: "CoinGecko" },
                  { value: "coinmarketcap", label: "CoinMarketCap" },
                  { value: "dexscreener", label: "DexScreener" },
                  { value: "jupiter", label: "Jupiter" },
                  { value: "chainlink", label: "Chainlink" },
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
                    { value: "low", label: "Low" },
                    { value: "medium", label: "Medium" },
                    { value: "high", label: "High" },
                  ]}
                />
              </FieldGroup>
            )}
            {strategy === "jito" && (
              <>
                <FieldGroup>
                  <FieldLabel>Fee Level</FieldLabel>
                  <StyledSelect
                    accent={accent}
                    value={str(selectedNode.data.urgency, "medium")}
                    onChange={(v) => updateField("urgency", v)}
                    options={[
                      { value: "low", label: "Low" },
                      { value: "medium", label: "Medium" },
                      { value: "high", label: "High" },
                    ]}
                  />
                </FieldGroup>
                <FieldGroup>
                  <FieldLabel>Tip Override (lamports, 0 = auto)</FieldLabel>
                  <StyledInput
                    type="number"
                    placeholder="0"
                    value={str(selectedNode.data.jitoTipLamports, "0")}
                    onChange={(e) =>
                      updateField(
                        "jitoTipLamports",
                        Math.max(0, parseInt(e.target.value) || 0),
                      )
                    }
                  />
                </FieldGroup>
              </>
            )}
            {strategy === "wait" && (
              <FieldGroup>
                <FieldLabel>Max Fee (µL)</FieldLabel>
                <StyledInput
                  type="number"
                  placeholder="50000"
                  value={str(selectedNode.data.maxFee, "50000")}
                  onChange={(e) => updateField("maxFee", e.target.value)}
                />
              </FieldGroup>
            )}
            <FieldGroup>
              <FieldLabel>Timeout (min)</FieldLabel>
              <StyledInput
                type="number"
                placeholder="60"
                value={str(selectedNode.data.timeout, "60")}
                onChange={(e) => updateField("timeout", e.target.value)}
              />
            </FieldGroup>
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

  // ─── Shared inner content ──────────────────────────────────────────────────
  const header = (
    <>
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
          <span className="text-[7px] font-mono text-slate-700 shrink-0">
            {selectedNode.id.slice(0, 6)}
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
    </>
  );

  const footer = (
    <div
      className="px-4 py-3 shrink-0"
      style={{ borderTop: `1px solid ${accent}15` }}
    >
      <button
        onClick={handleDelete}
        className="w-full h-8 rounded flex items-center justify-center gap-2 text-xs font-mono text-red-400/60 border border-red-500/20 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/5 transition-all duration-150"
      >
        <Trash2 className="w-3 h-3" />
        delete node
      </button>
    </div>
  );

  // ─── Mobile: bottom sheet ──────────────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        {/* Backdrop */}
        <div
          onClick={handleClose}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 40,
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(3px)",
          }}
        />

        {/* Sheet */}
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 50,
            borderRadius: "18px 18px 0 0",
            background: "rgba(2,6,23,0.99)",
            border: `1px solid ${accent}33`,
            borderBottom: "none",
            boxShadow: `0 -8px 48px rgba(0,0,0,0.8), 0 0 24px ${accent}15`,
            backdropFilter: "blur(20px)",
            display: "flex",
            flexDirection: "column",
            maxHeight: "80vh",
            animation: "slideUp 0.25s cubic-bezier(0.32,0.72,0,1) forwards",
          }}
        >
          {/* Drag handle */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              paddingTop: 12,
              paddingBottom: 4,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                background: `${accent}40`,
              }}
            />
          </div>
          {header}
          <div
            className="flex flex-col gap-3 p-4 overflow-y-auto"
            style={{
              WebkitOverflowScrolling:
                "touch" as React.CSSProperties["WebkitOverflowScrolling"],
            }}
          >
            {renderFields()}
          </div>
          {/* Footer with safe-area bottom padding */}
          <div
            className="px-4 shrink-0"
            style={{
              borderTop: `1px solid ${accent}15`,
              paddingTop: 12,
              paddingBottom: "max(24px, env(safe-area-inset-bottom))",
            }}
          >
            <button
              onClick={handleDelete}
              className="w-full h-9 rounded-xl flex items-center justify-center gap-2 text-xs font-mono text-red-400/60 border border-red-500/20 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/5 transition-all"
            >
              <Trash2 className="w-3 h-3" />
              delete node
            </button>
          </div>
        </div>
      </>
    );
  }

  // ─── Desktop: right panel ──────────────────────────────────────────────────
  return (
    <div
      className="absolute top-4 right-4 w-72 z-10 flex flex-col rounded-xl"
      style={{
        background: "rgba(2,6,23,0.95)",
        border: `1px solid ${accent}33`,
        boxShadow: `0 0 0 1px ${accent}11, 0 24px 48px rgba(0,0,0,0.7), 0 0 24px ${accent}15`,
        backdropFilter: "blur(20px)",
      }}
    >
      {header}
      <div
        className="flex flex-col gap-3 p-4 overflow-y-auto"
        style={{ maxHeight: "calc(100vh - 180px)" }}
      >
        {renderFields()}
      </div>
      {footer}
    </div>
  );
}
