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

export function Header() {
  const { walletAddress, walletType, isConnected, disconnect } = useWallet();
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const truncateAddress = (address: string) =>
    `${address.slice(0, 6)}...${address.slice(-4)}`;

  const handleCopyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getExplorerUrl = () => {
    if (!walletAddress) return "#";
    if (walletType === "phantom")
      return `https://solscan.io/account/${walletAddress}`;
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
        <div className="h-full px-4 flex items-center justify-between">
          {/* ── Left: Logo + Nav ── */}
          <div className="flex items-center gap-3">
            {/* Logo image → name */}
            <div className="flex items-center gap-2.5">
              {/* Logo — put wraith-logo.png in /public */}
              <Image
                src="/wraith-logo.png"
                alt="Wraith"
                width={52}
                height={52}
                className="flex-shrink-0 object-contain"
                priority
              />

              {/* Brand name */}
              <span
                className="text-base font-bold tracking-tight"
                style={{
                  background: "linear-gradient(90deg, #22d3ee, #818cf8)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Wraith
              </span>

              {/* Beta badge */}
              <span
                className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                style={{
                  background: "rgba(34,211,238,0.1)",
                  border: "1px solid rgba(34,211,238,0.2)",
                  color: "#22d3ee",
                }}
              >
                BETA
              </span>
            </div>

            {/* Divider */}
            <div
              className="h-5 w-px mx-1"
              style={{ background: "rgba(255,255,255,0.08)" }}
            />

            {/* Templates button */}
            <button
              onClick={() => setTemplatesOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: "rgba(34,211,238,0.06)",
                border: "1px solid rgba(34,211,238,0.15)",
                color: "rgba(34,211,238,0.8)",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  "rgba(34,211,238,0.12)";
                (e.currentTarget as HTMLElement).style.borderColor =
                  "rgba(34,211,238,0.3)";
                (e.currentTarget as HTMLElement).style.color = "#22d3ee";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  "rgba(34,211,238,0.06)";
                (e.currentTarget as HTMLElement).style.borderColor =
                  "rgba(34,211,238,0.15)";
                (e.currentTarget as HTMLElement).style.color =
                  "rgba(34,211,238,0.8)";
              }}
            >
              <LayoutTemplate size={13} />
              Templates
            </button>
          </div>

          {/* ── Right: Wallet ── */}
          <div className="flex items-center gap-2">
            {mounted && isConnected && walletAddress ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 gap-2 px-3"
                    style={{
                      background: "rgba(34,211,238,0.08)",
                      border: "1px solid rgba(34,211,238,0.2)",
                    }}
                  >
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center"
                      style={{
                        background:
                          walletType === "phantom"
                            ? "rgba(168,85,247,0.3)"
                            : "rgba(245,158,11,0.3)",
                      }}
                    >
                      <Wallet
                        className="w-3 h-3"
                        style={{
                          color:
                            walletType === "phantom" ? "#a855f7" : "#f59e0b",
                        }}
                      />
                    </div>
                    <span className="text-xs font-mono text-cyan-300">
                      {truncateAddress(walletAddress)}
                    </span>
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        background: "#22c55e",
                        boxShadow: "0 0 6px #22c55e",
                      }}
                    />
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="end"
                  className="w-56 p-1"
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
                    <ExternalLink className="w-3.5 h-3.5" />
                    View on Explorer
                  </DropdownMenuItem>

                  <DropdownMenuSeparator
                    style={{ background: "rgba(255,255,255,0.06)" }}
                  />

                  <DropdownMenuItem
                    onClick={disconnect}
                    className="gap-2 text-xs cursor-pointer"
                    style={{ color: "#f87171" }}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Disconnect
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                size="sm"
                onClick={() => setWalletModalOpen(true)}
                className="h-9 px-4 text-xs font-semibold"
                style={{
                  background: "linear-gradient(135deg, #22d3ee, #818cf8)",
                  border: "none",
                  color: "white",
                  boxShadow: "0 0 20px rgba(34,211,238,0.2)",
                }}
              >
                <Wallet className="w-3.5 h-3.5 mr-2" />
                Connect Wallet
              </Button>
            )}
          </div>
        </div>
      </header>

      <WalletConnectModal
        open={walletModalOpen}
        onOpenChange={setWalletModalOpen}
      />
      <TemplatesGallery
        open={templatesOpen}
        onClose={() => setTemplatesOpen(false)}
      />
    </>
  );
}
