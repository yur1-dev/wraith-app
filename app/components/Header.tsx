"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  ChevronDown,
  LogOut,
  Copy,
  ExternalLink,
  Check,
  Wallet,
  LayoutTemplate,
  Menu,
  X,
  FlaskConical,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWallet } from "@/lib/hooks/useWallet";
import { WalletConnectModal } from "./WalletConnectModal";
import { TemplatesGallery } from "./TemplatesGallery";
import { FlowPersistence } from "./FlowPersistence";
import { useNetworkStore } from "@/lib/network/solana.config";

interface HeaderProps {
  onTemplateLoad?: () => void;
}

// ── Network Toggle Button ──────────────────────────────────────────────────────

function NetworkToggle() {
  const { network, toggle } = useNetworkStore();
  const [mounted, setMounted] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;

  const isDevnet = network === "devnet";
  const color = isDevnet ? "#facc15" : "#22c55e";
  const bg = isDevnet ? "rgba(250,204,21,0.08)" : "rgba(34,197,94,0.08)";
  const bdr = isDevnet ? "rgba(250,204,21,0.3)" : "rgba(34,197,94,0.3)";

  const handleToggle = () => {
    setAnimating(true);
    toggle();
    setTimeout(() => setAnimating(false), 400);
  };

  return (
    <button
      onClick={handleToggle}
      title={isDevnet ? "Switch to Mainnet" : "Switch to Devnet"}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: 6,
        height: 32,
        padding: "0 10px",
        borderRadius: 8,
        fontSize: 11,
        fontFamily: "monospace",
        fontWeight: 700,
        letterSpacing: "0.05em",
        background: bg,
        border: `1px solid ${bdr}`,
        color: color,
        cursor: "pointer",
        transition: "all 0.25s",
        userSelect: "none",
        overflow: "hidden",
        WebkitTextFillColor: color,
      }}
    >
      {/* Flash on switch */}
      <span
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 8,
          background: color,
          opacity: animating ? 0.12 : 0,
          transition: "opacity 0.3s",
          pointerEvents: "none",
        }}
      />

      {/* Icon */}
      <span
        style={{
          position: "relative",
          display: "flex",
          flexShrink: 0,
          transform: animating ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.3s",
        }}
      >
        {isDevnet ? (
          <FlaskConical size={12} color={color} />
        ) : (
          <Globe size={12} color={color} />
        )}
      </span>

      {/* Label — always visible, no Tailwind breakpoint */}
      <span
        style={{
          position: "relative",
          color: color,
          WebkitTextFillColor: color,
        }}
      >
        {isDevnet ? "DEVNET" : "MAINNET"}
      </span>

      {/* Sliding pill */}
      <span
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          width: 28,
          height: 16,
          borderRadius: 9999,
          background: isDevnet
            ? "rgba(250,204,21,0.15)"
            : "rgba(34,197,94,0.15)",
          border: `1px solid ${bdr}`,
          flexShrink: 0,
          transition: "all 0.25s",
        }}
      >
        <span
          style={{
            position: "absolute",
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: color,
            left: isDevnet ? 3 : "auto",
            right: isDevnet ? "auto" : 3,
            boxShadow: `0 0 6px ${color}`,
            transition: "all 0.25s",
          }}
        />
      </span>
    </button>
  );
}

// ── Main Header ────────────────────────────────────────────────────────────────

export function Header({ onTemplateLoad }: HeaderProps) {
  const walletAddress = useWallet((s) => s.walletAddress());
  const walletType = useWallet((s) => s.walletType());
  const isConnected = useWallet((s) => s.isConnected());
  const wallets = useWallet((s) => s.wallets);
  const disconnectAll = useWallet((s) => s.disconnectAll);
  const network = useNetworkStore((s) => s.network);

  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const truncateAddress = (address: string) =>
    `${address.slice(0, 4)}...${address.slice(-4)}`;

  const truncateAddressMobile = (address: string) =>
    `${address.slice(0, 4)}…${address.slice(-3)}`;

  const handleCopyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getExplorerUrl = () => {
    if (!walletAddress) return "#";
    if (walletType === "phantom") {
      // Use correct explorer based on current network
      return network === "devnet"
        ? `https://explorer.solana.com/address/${walletAddress}?cluster=devnet`
        : `https://solscan.io/account/${walletAddress}`;
    }
    return `https://etherscan.io/address/${walletAddress}`;
  };

  return (
    <>
      <header
        className="absolute top-0 left-0 right-0 z-50 h-14"
        style={{
          background: "rgba(2, 6, 23, 0.85)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          backdropFilter: "blur(20px)",
        }}
      >
        <div className="h-full px-3 sm:px-4 flex items-center justify-between gap-2">
          {/* ── Left: Logo + Nav ── */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="flex items-center gap-2">
              <Image
                src="/wraith-logo.png"
                alt="Wraith"
                width={36}
                height={36}
                className="flex-shrink-0 object-contain sm:w-[52px] sm:h-[52px]"
                priority
              />
              <span
                className="text-sm sm:text-base font-bold tracking-tight"
                style={{
                  background: "linear-gradient(90deg, #22d3ee, #818cf8)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Wraith
              </span>
              <span
                className="text-[10px] font-mono px-1.5 py-0.5 rounded hidden xs:block"
                style={{
                  background: "rgba(34,211,238,0.1)",
                  border: "1px solid rgba(34,211,238,0.2)",
                  color: "#22d3ee",
                }}
              >
                BETA
              </span>
            </div>

            <div
              className="h-5 w-px mx-0.5 sm:mx-1 hidden sm:block"
              style={{ background: "rgba(255,255,255,0.08)" }}
            />

            {/* Templates — hidden on small */}
            <button
              onClick={() => setTemplatesOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: "rgba(34,211,238,0.06)",
                border: "1px solid rgba(34,211,238,0.15)",
                color: "rgba(34,211,238,0.8)",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  "rgba(34,211,238,0.12)";
                (e.currentTarget as HTMLElement).style.color = "#22d3ee";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  "rgba(34,211,238,0.06)";
                (e.currentTarget as HTMLElement).style.color =
                  "rgba(34,211,238,0.8)";
              }}
            >
              <LayoutTemplate size={13} />
              Templates
            </button>
          </div>

          {/* ── Right ── */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* FlowPersistence — desktop only */}
            <div className="hidden sm:block">
              <FlowPersistence />
            </div>

            <div
              className="h-5 w-px hidden sm:block"
              style={{ background: "rgba(255,255,255,0.08)" }}
            />

            {/* ── NETWORK TOGGLE ── */}
            <NetworkToggle />

            <div
              className="h-5 w-px hidden sm:block"
              style={{ background: "rgba(255,255,255,0.08)" }}
            />

            {/* Wallet */}
            {mounted && isConnected && walletAddress ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 sm:h-9 gap-1.5 sm:gap-2 px-2 sm:px-3 cursor-pointer"
                    style={{
                      background: "rgba(34,211,238,0.08)",
                      border: "1px solid rgba(34,211,238,0.2)",
                    }}
                  >
                    <div
                      className="w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        background:
                          walletType === "phantom"
                            ? "rgba(168,85,247,0.3)"
                            : "rgba(245,158,11,0.3)",
                      }}
                    >
                      <Wallet
                        className="w-2.5 h-2.5 sm:w-3 sm:h-3"
                        style={{
                          color:
                            walletType === "phantom" ? "#a855f7" : "#f59e0b",
                        }}
                      />
                    </div>
                    <span className="text-[10px] sm:text-xs font-mono text-cyan-300">
                      <span className="sm:hidden">
                        {truncateAddressMobile(walletAddress)}
                      </span>
                      <span className="hidden sm:inline">
                        {truncateAddress(walletAddress)}
                      </span>
                    </span>
                    {wallets.length > 1 && (
                      <span
                        className="text-[9px] px-1 sm:px-1.5 py-0.5 rounded-full font-bold hidden xs:block"
                        style={{
                          background: "rgba(34,211,238,0.15)",
                          color: "#22d3ee",
                          border: "1px solid rgba(34,211,238,0.25)",
                        }}
                      >
                        {wallets.length}
                      </span>
                    )}
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        background: "#22c55e",
                        boxShadow: "0 0 6px #22c55e",
                      }}
                    />
                    <ChevronDown className="w-3 h-3 text-slate-400 hidden sm:block" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="end"
                  className="w-52 sm:w-56 p-1"
                  style={{
                    background: "rgba(2,6,23,0.98)",
                    border: "1px solid rgba(34,211,238,0.15)",
                    backdropFilter: "blur(20px)",
                  }}
                >
                  <div className="px-2 py-2 mb-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{
                          background: "#22c55e",
                          boxShadow: "0 0 6px #22c55e",
                        }}
                      />
                      <span className="text-[10px] text-green-400 font-mono font-semibold">
                        CONNECTED
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono ml-auto capitalize">
                        {walletType}
                      </span>
                    </div>
                    <p className="text-xs font-mono text-slate-300 truncate">
                      {walletAddress}
                    </p>
                    {wallets.length > 1 && (
                      <div className="mt-2 space-y-1">
                        {wallets.map((w) => (
                          <div
                            key={w.address}
                            className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500"
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{
                                background:
                                  w.type === "phantom" ? "#c084fc" : "#fbbf24",
                              }}
                            />
                            <span className="text-slate-400 truncate flex-1">
                              {w.label}
                            </span>
                            <span className="shrink-0">
                              {w.address.slice(0, 4)}…{w.address.slice(-4)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <DropdownMenuSeparator
                    style={{ background: "rgba(255,255,255,0.06)" }}
                  />
                  <DropdownMenuItem
                    onClick={handleCopyAddress}
                    className="gap-2 text-xs cursor-pointer"
                    style={{ color: "#94a3b8" }}
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-green-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    {copied ? "Copied!" : "Copy Address"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => window.open(getExplorerUrl(), "_blank")}
                    className="gap-2 text-xs cursor-pointer"
                    style={{ color: "#94a3b8" }}
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> View on Explorer
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setWalletModalOpen(true)}
                    className="gap-2 text-xs cursor-pointer"
                    style={{ color: "#94a3b8" }}
                  >
                    <Wallet className="w-3.5 h-3.5" /> Add Wallet
                  </DropdownMenuItem>
                  <DropdownMenuSeparator
                    style={{ background: "rgba(255,255,255,0.06)" }}
                  />
                  <DropdownMenuItem
                    onClick={disconnectAll}
                    className="gap-2 text-xs cursor-pointer"
                    style={{ color: "#f87171" }}
                  >
                    <LogOut className="w-3.5 h-3.5" /> Disconnect All
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                size="sm"
                onClick={() => setWalletModalOpen(true)}
                className="h-8 sm:h-9 px-3 sm:px-4 text-xs font-semibold cursor-pointer"
                style={{
                  background: "linear-gradient(135deg, #22d3ee, #818cf8)",
                  border: "none",
                  color: "white",
                  boxShadow: "0 0 20px rgba(34,211,238,0.2)",
                }}
              >
                <Wallet className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1.5" />
                Connect
              </Button>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="sm:hidden w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
              style={{
                background: mobileMenuOpen
                  ? "rgba(34,211,238,0.15)"
                  : "rgba(255,255,255,0.05)",
                border: "1px solid rgba(34,211,238,0.2)",
                color: "#22d3ee",
              }}
            >
              {mobileMenuOpen ? <X size={15} /> : <Menu size={15} />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div
            className="sm:hidden px-3 pb-3 pt-2 flex flex-col gap-2"
            style={{
              borderTop: "1px solid rgba(255,255,255,0.05)",
              background: "rgba(2,6,23,0.97)",
            }}
          >
            <button
              onClick={() => {
                setTemplatesOpen(true);
                setMobileMenuOpen(false);
              }}
              className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-xs font-medium"
              style={{
                background: "rgba(34,211,238,0.06)",
                border: "1px solid rgba(34,211,238,0.15)",
                color: "rgba(34,211,238,0.8)",
              }}
            >
              <LayoutTemplate size={14} />
              Templates
            </button>
            <div className="px-3 py-1">
              <FlowPersistence />
            </div>
          </div>
        )}
      </header>

      <WalletConnectModal
        open={walletModalOpen}
        onOpenChange={setWalletModalOpen}
      />
      <TemplatesGallery
        open={templatesOpen}
        onClose={() => setTemplatesOpen(false)}
        onAfterLoad={onTemplateLoad}
      />
    </>
  );
}
