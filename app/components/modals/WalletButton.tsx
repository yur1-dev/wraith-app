"use client";

import { useState, useRef, useEffect } from "react";
import { useWallet } from "@/lib/hooks/useWallet";
import { WalletSwitcher } from "@/app/components/panels/WalletSwitcher";
import { WalletConnectModal } from "@/app/components/WalletConnectModal";
import { Wallet, ChevronDown } from "lucide-react";

/**
 * Drop-in replacement for the existing wallet button in FlowControls.
 * Shows active wallet address + opens a switcher popover with all wallets.
 *
 * Usage in FlowControls.tsx — replace the existing wallet section with:
 *   import { WalletButton } from "@/components/WalletButton";
 *   // In JSX:
 *   <WalletButton />
 */
export function WalletButton() {
  const wallets = useWallet((s) => s.wallets);
  const active = useWallet((s) => s.activeWallet());
  const connected = useWallet((s) => s.isConnected());
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const walletCount = wallets.length;

  // Close switcher on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setSwitcherOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const accentColor = active?.type === "phantom" ? "#c084fc" : "#fbbf24";
  const accentBg =
    active?.type === "phantom"
      ? "rgba(168,85,247,0.12)"
      : active?.type === "metamask"
        ? "rgba(245,158,11,0.12)"
        : "rgba(34,211,238,0.08)";

  const shortAddress = active
    ? `${active.address.slice(0, 5)}…${active.address.slice(-4)}`
    : null;

  return (
    <div ref={containerRef} className="relative">
      {connected && active ? (
        <button
          onClick={() => setSwitcherOpen((o) => !o)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all"
          style={{
            background: switcherOpen ? accentBg : "rgba(15,23,42,0.6)",
            border: `1px solid ${switcherOpen ? accentColor + "60" : "rgba(148,163,184,0.15)"}`,
            color: switcherOpen ? accentColor : "#94a3b8",
          }}
          title="Manage wallets"
        >
          {/* Wallet type dot */}
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: accentColor }}
          />

          {/* Label + address */}
          <span className="hidden sm:inline text-[11px]">{active.label}</span>
          <span className="text-[11px] font-mono opacity-70 hidden md:inline">
            {shortAddress}
          </span>

          {/* Multi-wallet badge */}
          {walletCount > 1 && (
            <span
              className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
              style={{
                background: "rgba(34,211,238,0.15)",
                color: "#22d3ee",
                border: "1px solid rgba(34,211,238,0.25)",
              }}
            >
              {walletCount}
            </span>
          )}

          <ChevronDown
            className="w-3 h-3 transition-transform"
            style={{
              transform: switcherOpen ? "rotate(180deg)" : "rotate(0deg)",
            }}
          />
        </button>
      ) : (
        <button
          onClick={() => setConnectOpen(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all"
          style={{
            background: "rgba(34,211,238,0.06)",
            border: "1px solid rgba(34,211,238,0.2)",
            color: "#22d3ee",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background =
              "rgba(34,211,238,0.12)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background =
              "rgba(34,211,238,0.06)";
          }}
        >
          <Wallet className="w-4 h-4" />
          <span className="text-sm">Connect</span>
        </button>
      )}

      {/* Switcher popover */}
      {switcherOpen && (
        <WalletSwitcher
          onClose={() => setSwitcherOpen(false)}
          onAddWallet={() => {
            setSwitcherOpen(false);
            setConnectOpen(true);
          }}
        />
      )}

      {/* Connect modal */}
      <WalletConnectModal open={connectOpen} onOpenChange={setConnectOpen} />
    </div>
  );
}
