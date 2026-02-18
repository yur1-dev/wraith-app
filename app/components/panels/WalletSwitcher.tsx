"use client";

import { useState } from "react";
import { useWallet, ConnectedWallet } from "@/lib/hooks/useWallet";
import {
  X,
  Check,
  Trash2,
  Plus,
  Pencil,
  Wallet,
  Copy,
  ExternalLink,
  ChevronDown,
} from "lucide-react";

interface WalletSwitcherProps {
  onClose: () => void;
  onAddWallet: () => void;
}

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function WalletIcon({
  type,
  size = 20,
}: {
  type: "phantom" | "metamask";
  size?: number;
}) {
  if (type === "phantom") {
    return (
      <svg width={size} height={size} viewBox="0 0 128 128" fill="none">
        <rect width="128" height="128" rx="64" fill="#AB9FF2" />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M110.584 64.9142C110.584 42.1406 92.9919 23.5859 71.4803 23.5859C49.9687 23.5859 32.3762 42.1406 32.3762 64.9142C32.3762 87.6879 49.9687 106.243 71.4803 106.243C73.2931 106.243 75.0742 106.113 76.8167 105.861L89.5492 101.645L91.5846 95.7227L79.0617 99.7988C76.6372 100.303 74.1046 100.573 71.5048 100.573C53.7024 100.573 39.2588 84.6071 39.2588 64.9142C39.2588 45.2214 53.7024 29.2554 71.5048 29.2554C89.3072 29.2554 103.751 45.2214 103.751 64.9142V68.9827C103.751 72.1649 101.196 74.7478 98.0442 74.7478C94.8927 74.7478 92.3371 72.1649 92.3371 68.9827V52.5811H85.9371V55.561C83.2337 53.1856 79.5969 51.7302 75.6142 51.7302C67.0253 51.7302 60.065 58.7459 60.065 67.4041C60.065 76.0622 67.0253 83.078 75.6142 83.078C80.1428 83.078 84.2183 81.1386 87.1073 78.0444C88.9949 81.1141 92.3088 83.2217 96.0786 83.2217C101.978 83.2217 106.752 78.3965 106.752 72.4363V64.9142H110.584ZM75.6142 76.4652C70.6437 76.4652 66.6133 72.3975 66.6133 67.4041C66.6133 62.4107 70.6437 58.343 75.6142 58.343C80.5847 58.343 84.615 62.4107 84.615 67.4041C84.615 72.3975 80.5847 76.4652 75.6142 76.4652Z"
          fill="white"
        />
      </svg>
    );
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 212 189"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M201.77 0L117.72 61.28l15.35-36.3z"
        fill="#E17726"
        stroke="#E17726"
      />
      <path
        d="M10.23 0l83.33 61.85L78.93 24.98zM172.04 136.28l-22.4 34.18 47.96 13.2 13.77-46.67zM0.66 137l13.7 46.67 47.9-13.2-22.33-34.18z"
        fill="#E27625"
        stroke="#E27625"
      />
      <path
        d="M59.76 82.35L46.4 102.62l47.4 2.12-1.6-51.03zM152.24 82.35l-32.8-49.28-1.27 51.67 47.37-2.12zM62.26 170.46l28.6-13.76-24.7-19.26zM121.14 156.7l28.6 13.76-3.9-33.02z"
        fill="#E27625"
        stroke="#E27625"
      />
      <path
        d="M149.74 170.46l-28.6-13.76 2.3 18.7-.26 7.93zM62.26 170.46l26.56 12.87-.2-7.93 2.24-18.7z"
        fill="#D5BFB2"
        stroke="#D5BFB2"
      />
      <path
        d="M89.22 128.7l-23.8-6.97 16.79-7.7zM122.78 128.7l6.97-14.67 16.86 7.7z"
        fill="#233447"
        stroke="#233447"
      />
      <path
        d="M62.26 170.46l4.03-34.18-26.36.73zM145.71 136.28l4.03 34.18 22.33-33.45zM165.84 102.62l-47.37 2.12 4.37 24.5 6.97-14.67 16.86 7.7zM65.42 121.73l16.79-7.7 6.97 14.67 4.44-24.5-47.4-2.12z"
        fill="#CC6228"
        stroke="#CC6228"
      />
      <path
        d="M46.4 102.62l19.87 38.8-.67-19.26zM146.4 122.16l-.73 19.26 19.94-38.8zM93.8 104.74l-4.44 24.5 5.57 28.74 1.27-37.9zM118.47 104.74l-2.34 15.27 1.14 37.97 5.63-28.74z"
        fill="#E27625"
        stroke="#E27625"
      />
      <path
        d="M122.78 128.7l-5.63 28.74 4.03 2.76 24.7-19.26.73-19.26zM65.42 121.73l.67 19.26 24.7 19.26 4.03-2.76-5.57-28.74z"
        fill="#F5841F"
        stroke="#F5841F"
      />
      <path
        d="M123.1 183.33l.27-7.93-2.1-1.76H90.73l-1.97 1.76.2 7.93-26.7-12.87 9.3 7.57 18.8 13.07h32.28l18.87-13.07 9.3-7.57z"
        fill="#C0AC9D"
        stroke="#C0AC9D"
      />
      <path
        d="M121.14 156.7l-4.03-2.76H94.89l-4.03 2.76-2.24 18.7 1.97-1.76h30.54l2.1 1.76z"
        fill="#161616"
        stroke="#161616"
      />
      <path
        d="M204.97 65.53l7.03-33.58-10.47-31.95-80.4 59.64 30.93 26.16 43.7 12.78 9.63-11.24-4.17-3.03 6.64-6.04-5.1-3.93 6.64-5.1zM0 31.95l7.03 33.58-4.5 3.37 6.64 5.1-5.04 3.93 6.64 6.04-4.17 3.03 9.57 11.24 43.7-12.78 30.93-26.16L10.47 0z"
        fill="#763E1A"
        stroke="#763E1A"
      />
      <path
        d="M195.76 98.58l-43.7-12.78 13.17 19.82-19.94 38.8 26.3-.33h39.27zM59.94 85.8L16.24 98.58 1.44 143.1h39.2l26.23.33-19.87-38.8zM118.47 104.74l2.77-47.83 12.65-34.1H78.11l12.58 34.1 2.84 47.83 1.07 15.4.07 37.83h23.78l.13-37.83z"
        fill="#F5841F"
        stroke="#F5841F"
      />
    </svg>
  );
}

export function WalletSwitcher({ onClose, onAddWallet }: WalletSwitcherProps) {
  const {
    wallets,
    activeWalletAddress,
    setActiveWallet,
    disconnectWallet,
    disconnectAll,
    updateLabel,
  } = useWallet();

  const [editingAddress, setEditingAddress] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const handleCopy = async (address: string) => {
    await navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 1500);
  };

  const handleStartEdit = (w: ConnectedWallet) => {
    setEditingAddress(w.address);
    setEditValue(w.label);
  };

  const handleSaveEdit = (address: string) => {
    if (editValue.trim()) updateLabel(address, editValue.trim());
    setEditingAddress(null);
  };

  const accentColor = (type: "phantom" | "metamask") =>
    type === "phantom" ? "#c084fc" : "#fbbf24";

  const accentBg = (type: "phantom" | "metamask") =>
    type === "phantom" ? "rgba(168,85,247,0.12)" : "rgba(245,158,11,0.12)";

  const accentBorder = (type: "phantom" | "metamask", active: boolean) =>
    active
      ? type === "phantom"
        ? "rgba(168,85,247,0.5)"
        : "rgba(245,158,11,0.5)"
      : "rgba(148,163,184,0.1)";

  return (
    <div
      className="absolute right-0 top-12 z-50 w-80 rounded-2xl overflow-hidden"
      style={{
        background: "rgba(2, 6, 23, 0.98)",
        border: "1px solid rgba(34,211,238,0.2)",
        boxShadow:
          "0 20px 60px rgba(0,0,0,0.8), 0 0 40px rgba(34,211,238,0.05)",
        backdropFilter: "blur(20px)",
      }}
    >
      {/* Accent line */}
      <div
        className="h-px w-full"
        style={{
          background:
            "linear-gradient(90deg, transparent, #22d3ee, #818cf8, transparent)",
        }}
      />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-semibold text-white">Wallets</span>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full font-mono"
            style={{
              background: "rgba(34,211,238,0.1)",
              border: "1px solid rgba(34,211,238,0.2)",
              color: "#22d3ee",
            }}
          >
            {wallets.length}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Wallet list */}
      <div className="p-2 space-y-1 max-h-72 overflow-y-auto">
        {wallets.map((w) => {
          const isActive = w.address === activeWalletAddress;
          const isEditing = editingAddress === w.address;

          return (
            <div
              key={w.address}
              className="rounded-xl p-3 transition-all duration-150 cursor-pointer group"
              style={{
                background: isActive ? accentBg(w.type) : "rgba(15,23,42,0.4)",
                border: `1px solid ${accentBorder(w.type, isActive)}`,
              }}
              onClick={() => !isEditing && setActiveWallet(w.address)}
            >
              <div className="flex items-center gap-3">
                {/* Icon */}
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: accentBg(w.type) }}
                >
                  <WalletIcon type={w.type} size={20} />
                </div>

                {/* Label + address */}
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveEdit(w.address);
                        if (e.key === "Escape") setEditingAddress(null);
                      }}
                      onBlur={() => handleSaveEdit(w.address)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full text-sm font-medium bg-transparent border-b outline-none text-white"
                      style={{ borderColor: accentColor(w.type) }}
                    />
                  ) : (
                    <div
                      className="text-sm font-medium truncate"
                      style={{
                        color: isActive ? accentColor(w.type) : "#e2e8f0",
                      }}
                    >
                      {w.label}
                    </div>
                  )}
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                    {shortenAddress(w.address)}
                  </div>
                </div>

                {/* Active check */}
                {isActive && (
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: accentColor(w.type) }}
                  >
                    <Check className="w-3 h-3 text-black" />
                  </div>
                )}
              </div>

              {/* Action buttons (show on hover or active) */}
              <div
                className="flex items-center gap-1 mt-2 pt-2 border-t opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ borderColor: "rgba(255,255,255,0.05)" }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  title="Copy address"
                  onClick={() => handleCopy(w.address)}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  {copiedAddress === w.address ? (
                    <Check className="w-3 h-3 text-green-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  {copiedAddress === w.address ? "Copied" : "Copy"}
                </button>
                <button
                  title="Rename"
                  onClick={() => handleStartEdit(w)}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <Pencil className="w-3 h-3" />
                  Rename
                </button>
                {w.type === "metamask" && (
                  <a
                    href={`https://etherscan.io/address/${w.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Explorer
                  </a>
                )}
                <button
                  title="Disconnect"
                  onClick={() => disconnectWallet(w.address)}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-red-500 hover:text-red-400 hover:bg-red-500/10 transition-colors ml-auto"
                >
                  <Trash2 className="w-3 h-3" />
                  Remove
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer actions */}
      <div className="p-2 border-t border-white/5 space-y-1">
        <button
          onClick={onAddWallet}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
          style={{
            background: "rgba(34,211,238,0.05)",
            border: "1px solid rgba(34,211,238,0.15)",
            color: "#22d3ee",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background =
              "rgba(34,211,238,0.1)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background =
              "rgba(34,211,238,0.05)";
          }}
        >
          <Plus className="w-4 h-4" />
          Add Wallet
        </button>

        {wallets.length > 1 && (
          <button
            onClick={disconnectAll}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-red-400 hover:bg-red-500/5 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Disconnect All
          </button>
        )}
      </div>
    </div>
  );
}
