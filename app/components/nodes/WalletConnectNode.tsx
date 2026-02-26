"use client";

import { memo, useState, useEffect, useCallback, useRef } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  Wallet2,
  MoreVertical,
  CheckCircle2,
  AlertTriangle,
  Link,
  Unlink,
  Loader2,
  Copy,
  Check,
} from "lucide-react";
import { useFlowStore } from "@/lib/hooks/useFlowStore";

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

const WALLET_TYPES = [
  { id: "phantom", label: "Phantom", color: "#9945FF", chain: "solana" },
  { id: "backpack", label: "Backpack", color: "#E33E3F", chain: "solana" },
  { id: "solflare", label: "Solflare", color: "#FC8A03", chain: "solana" },
  { id: "metamask", label: "MetaMask", color: "#f97316", chain: "evm" },
  { id: "rabby", label: "Rabby", color: "#8B5CF6", chain: "evm" },
  { id: "coinbase", label: "Coinbase", color: "#0052FF", chain: "evm" },
];

const SOL_RPC = "https://api.mainnet-beta.solana.com";

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

export const WalletConnectNode = memo(({ data, selected, id }: NodeProps) => {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);

  const walletType = String(data.walletType ?? "phantom");
  const address = data.address ? String(data.address) : null;
  const balance = data.balance ? String(data.balance) : null;
  const network = data.network ? String(data.network) : null;
  const customColor = data.customColor as string | undefined;

  const walletMeta =
    WALLET_TYPES.find((w) => w.id === walletType) ?? WALLET_TYPES[0];
  const accent = customColor ?? walletMeta.color;

  const [showPopover, setShowPopover] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus>(
    address ? "connected" : "disconnected",
  );
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  const update = (field: string, val: unknown) =>
    updateNodeData(id, { [field]: val });

  const prevWalletTypeRef = useRef(walletType);
  useEffect(() => {
    if (prevWalletTypeRef.current !== walletType) {
      prevWalletTypeRef.current = walletType;
      updateNodeData(id, { address: null, balance: null, network: null });
      setStatus("disconnected");
      setErrorMsg(null);
    }
  }, [walletType, id, updateNodeData]);

  useEffect(() => {
    setStatus(address ? "connected" : "disconnected");
  }, [address]);

  const fetchSolBalance = async (pubkey: string): Promise<string | null> => {
    try {
      const res = await fetch(SOL_RPC, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getBalance",
          params: [pubkey, { commitment: "confirmed" }],
        }),
      });
      const json = await res.json();
      const lamports = json?.result?.value;
      if (lamports == null) return null;
      const sol = lamports / 1e9;
      return `${sol.toFixed(4)} SOL`;
    } catch {
      return null;
    }
  };

  const getEvmProvider = (walletId: string): any => {
    const win = window as any;
    const eth = win.ethereum;
    if (!eth) return null;

    if (Array.isArray(eth.providers)) {
      const match = eth.providers.find((p: any) => {
        if (walletId === "metamask")
          return p.isMetaMask && !p.isRabby && !p.isBraveWallet;
        if (walletId === "rabby") return p.isRabby;
        if (walletId === "coinbase")
          return p.isCoinbaseWallet || p.isCoinbaseBrowser;
        return false;
      });
      if (match) return match;
    }

    if (walletId === "metamask" && eth.isMetaMask && !eth.isRabby) return eth;
    if (walletId === "rabby" && eth.isRabby) return eth;
    if (
      walletId === "coinbase" &&
      (eth.isCoinbaseWallet || eth.isCoinbaseBrowser)
    )
      return eth;

    return null;
  };

  const EVM_CHAINS: Record<string, string> = {
    "0x1": "Ethereum",
    "0xa": "Optimism",
    "0xa4b1": "Arbitrum",
    "0x89": "Polygon",
    "0x2105": "Base",
    "0x38": "BSC",
  };

  const connectEvm = async (provider: any) => {
    const accounts = await provider.request({ method: "eth_requestAccounts" });
    const addr: string | null = accounts?.[0] ?? null;
    if (!addr) return null;

    const chainId = await provider.request({ method: "eth_chainId" });
    const network = EVM_CHAINS[chainId] ?? `Chain ${parseInt(chainId, 16)}`;
    const rawBal = await provider.request({
      method: "eth_getBalance",
      params: [addr, "latest"],
    });
    const bal = parseInt(rawBal, 16) / 1e18;

    return { addr, network, balance: `${bal.toFixed(4)} ETH` };
  };

  const handleConnect = useCallback(async () => {
    setStatus("connecting");
    setErrorMsg(null);

    try {
      let addr: string | null = null;
      let network: string | null = null;
      let balance: string | null = null;

      if (walletType === "phantom") {
        const win = window as any;
        const provider = win.phantom?.solana ?? win.solana;
        if (!provider?.isPhantom) {
          setErrorMsg("Phantom not installed. Add the extension first.");
          setStatus("error");
          return;
        }
        const resp = await provider.connect();
        addr = resp.publicKey?.toString() ?? null;
        if (!addr) {
          setStatus("error");
          return;
        }
        network = "Solana";
        balance = await fetchSolBalance(addr);
      } else if (walletType === "backpack") {
        const win = window as any;
        const provider = win.backpack;
        if (!provider) {
          setErrorMsg("Backpack not installed. Add the extension first.");
          setStatus("error");
          return;
        }
        const resp = await provider.connect();
        addr = resp.publicKey?.toString() ?? null;
        if (!addr) {
          setStatus("error");
          return;
        }
        network = "Solana";
        balance = await fetchSolBalance(addr);
      } else if (walletType === "solflare") {
        const win = window as any;
        const provider = win.solflare;
        if (!provider?.isSolflare) {
          setErrorMsg("Solflare not installed. Add the extension first.");
          setStatus("error");
          return;
        }
        await provider.connect();
        addr = provider.publicKey?.toString() ?? null;
        if (!addr) {
          setStatus("error");
          return;
        }
        network = "Solana";
        balance = await fetchSolBalance(addr);
      } else if (walletType === "metamask") {
        const provider = getEvmProvider("metamask");
        if (!provider) {
          setErrorMsg("MetaMask not installed. Add the extension first.");
          setStatus("error");
          return;
        }
        const result = await connectEvm(provider);
        if (!result) {
          setStatus("error");
          return;
        }
        ({ addr, network, balance } = result);
      } else if (walletType === "rabby") {
        const provider = getEvmProvider("rabby");
        if (!provider) {
          setErrorMsg("Rabby not installed. Add the extension first.");
          setStatus("error");
          return;
        }
        const result = await connectEvm(provider);
        if (!result) {
          setStatus("error");
          return;
        }
        ({ addr, network, balance } = result);
      } else if (walletType === "coinbase") {
        const provider = getEvmProvider("coinbase");
        if (!provider) {
          setErrorMsg("Coinbase Wallet extension not installed.");
          setStatus("error");
          return;
        }
        const result = await connectEvm(provider);
        if (!result) {
          setStatus("error");
          return;
        }
        ({ addr, network, balance } = result);
      }

      if (addr) {
        updateNodeData(id, { address: addr, network, balance });
        setStatus("connected");
      } else {
        setStatus("error");
      }
    } catch (err: any) {
      const msg = err?.message ?? "";
      if (msg.includes("rejected") || err?.code === 4001) {
        setErrorMsg("Connection rejected by user.");
      } else {
        setErrorMsg(msg || "Connection failed.");
      }
      setStatus("error");
    }
  }, [walletType, id, updateNodeData]);

  const handleDisconnect = useCallback(() => {
    update("address", null);
    update("balance", null);
    update("network", null);
    setStatus("disconnected");
  }, [id]);

  const handleCopy = useCallback(() => {
    if (!address) return;
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [address]);

  const shortAddr = address
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : null;

  const statusConfig: Record<
    ConnectionStatus,
    { color: string; label: string; icon: React.ReactNode }
  > = {
    disconnected: {
      color: "#64748b",
      label: "Not connected",
      icon: <Unlink className="w-3 h-3" />,
    },
    connecting: {
      color: "#f59e0b",
      label: "Connecting…",
      icon: <Loader2 className="w-3 h-3 animate-spin" />,
    },
    connected: {
      color: "#34d399",
      label: "Connected",
      icon: <CheckCircle2 className="w-3 h-3" />,
    },
    error: {
      color: "#f87171",
      label: "Not installed",
      icon: <AlertTriangle className="w-3 h-3" />,
    },
  };

  const sc = statusConfig[status];

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
      {/* ── Header ── */}
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
            <Wallet2 className="w-3.5 h-3.5" style={{ color: accent }} />
          </div>
          <div>
            <div className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase">
              Wallet Connect
            </div>
            <div className="text-[9px] font-mono text-slate-600 capitalize">
              {walletMeta.label}
              {network && ` · ${network}`}
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

      {/* ── Body ── */}
      <div className="px-3 py-3 space-y-2 select-none">
        <div
          className="rounded-lg px-3 py-2 flex items-center justify-between"
          style={{
            background: "rgba(15,23,42,0.6)",
            border: `1px solid ${accent}22`,
          }}
        >
          <div className="flex items-center gap-2">
            <span style={{ color: sc.color }}>{sc.icon}</span>
            <span className="text-[9px] font-mono" style={{ color: sc.color }}>
              {sc.label}
            </span>
          </div>
          <div
            className="px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-widest"
            style={{
              background: `${accent}18`,
              border: `1px solid ${accent}33`,
              color: accent,
            }}
          >
            {walletMeta.label}
          </div>
        </div>

        {status === "connected" && shortAddr && (
          <div
            className="rounded-lg px-3 py-2 flex items-center justify-between"
            style={{
              background: "rgba(15,23,42,0.4)",
              border: "1px solid rgba(51,65,85,0.3)",
            }}
          >
            <div className="space-y-0.5">
              <div className="text-[8px] font-mono text-slate-600 uppercase tracking-widest">
                Address
              </div>
              <div className="text-[10px] font-mono text-slate-300">
                {shortAddr}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {balance && (
                <div
                  className="text-[9px] font-mono px-2 py-0.5 rounded"
                  style={{
                    background: `${accent}15`,
                    border: `1px solid ${accent}33`,
                    color: accent,
                  }}
                >
                  {balance}
                </div>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy();
                }}
                className="w-5 h-5 rounded flex items-center justify-center cursor-pointer transition-all"
                style={{
                  background: `${accent}15`,
                  border: `1px solid ${accent}33`,
                }}
                title="Copy address"
              >
                {copied ? (
                  <Check className="w-2.5 h-2.5 text-emerald-400" />
                ) : (
                  <Copy className="w-2.5 h-2.5" style={{ color: accent }} />
                )}
              </button>
            </div>
          </div>
        )}

        {status === "error" && (
          <div
            className="rounded-lg px-3 py-1.5 flex items-center gap-2"
            style={{
              background: "rgba(248,113,113,0.06)",
              border: "1px solid rgba(248,113,113,0.2)",
            }}
          >
            <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />
            <span className="text-[9px] font-mono text-red-400">
              {errorMsg ??
                `${walletMeta.label} not detected. Install the extension first.`}
            </span>
          </div>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            status === "connected" ? handleDisconnect() : handleConnect();
          }}
          disabled={status === "connecting"}
          className="w-full py-1.5 rounded-lg text-[9px] font-mono font-bold uppercase tracking-widest transition-all cursor-pointer"
          style={
            status === "connected"
              ? {
                  background: "rgba(248,113,113,0.08)",
                  border: "1px solid rgba(248,113,113,0.25)",
                  color: "#f87171",
                }
              : {
                  background: `${accent}18`,
                  border: `1px solid ${accent}44`,
                  color: accent,
                  opacity: status === "connecting" ? 0.6 : 1,
                }
          }
        >
          {status === "connecting" ? (
            <span className="flex items-center justify-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin" /> Connecting…
            </span>
          ) : status === "connected" ? (
            <span className="flex items-center justify-center gap-1.5">
              <Unlink className="w-3 h-3" /> Disconnect
            </span>
          ) : (
            <span className="flex items-center justify-center gap-1.5">
              <Link className="w-3 h-3" /> Connect Wallet
            </span>
          )}
        </button>
      </div>

      {/* ── Popover — color only ── */}
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

WalletConnectNode.displayName = "WalletConnectNode";
