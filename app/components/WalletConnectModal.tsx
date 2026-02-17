"use client";

import { useState } from "react";
import { useWallet } from "@/lib/hooks/useWallet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Shield, Zap, AlertCircle } from "lucide-react";

interface WalletConnectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WalletConnectModal({
  open,
  onOpenChange,
}: WalletConnectModalProps) {
  const { connectPhantom, connectMetaMask, isConnecting } = useWallet();
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<"phantom" | "metamask" | null>(
    null,
  );

  const handleConnect = async (type: "phantom" | "metamask") => {
    setError(null);
    setConnecting(type);

    try {
      if (type === "phantom") {
        await connectPhantom();
      } else {
        await connectMetaMask();
      }
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || "Failed to connect wallet");
    } finally {
      setConnecting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md overflow-hidden p-0 border-0"
        style={{
          background: "rgba(2, 6, 23, 0.98)",
          border: "1px solid rgba(34, 211, 238, 0.2)",
          boxShadow:
            "0 0 0 1px rgba(34,211,238,0.05), 0 24px 48px rgba(0,0,0,0.8), 0 0 60px rgba(34,211,238,0.05)",
          backdropFilter: "blur(20px)",
        }}
      >
        {/* Top accent line */}
        <div
          className="h-px w-full"
          style={{
            background:
              "linear-gradient(90deg, transparent, #22d3ee, #818cf8, transparent)",
          }}
        />

        <div className="p-6">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-lg font-bold text-white text-center">
              Connect Wallet
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-center text-sm">
              Connect your wallet to start automating DeFi flows
            </DialogDescription>
          </DialogHeader>

          {/* Wallet options */}
          <div className="space-y-3 mb-6">
            {/* Phantom */}
            <button
              onClick={() => handleConnect("phantom")}
              disabled={isConnecting || connecting !== null}
              className="w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: "rgba(20, 26, 42, 0.6)",
                border: "1px solid rgba(148, 163, 184, 0.1)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.border =
                  "1px solid rgba(168, 85, 247, 0.4)";
                (e.currentTarget as HTMLElement).style.background =
                  "rgba(168, 85, 247, 0.05)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.border =
                  "1px solid rgba(148, 163, 184, 0.1)";
                (e.currentTarget as HTMLElement).style.background =
                  "rgba(20, 26, 42, 0.6)";
              }}
            >
              {/* Phantom logo */}
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "rgba(168, 85, 247, 0.15)" }}
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 128 128"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect width="128" height="128" rx="64" fill="#AB9FF2" />
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M110.584 64.9142C110.584 42.1406 92.9919 23.5859 71.4803 23.5859C49.9687 23.5859 32.3762 42.1406 32.3762 64.9142C32.3762 87.6879 49.9687 106.243 71.4803 106.243C73.2931 106.243 75.0742 106.113 76.8167 105.861L89.5492 101.645L91.5846 95.7227L79.0617 99.7988C76.6372 100.303 74.1046 100.573 71.5048 100.573C53.7024 100.573 39.2588 84.6071 39.2588 64.9142C39.2588 45.2214 53.7024 29.2554 71.5048 29.2554C89.3072 29.2554 103.751 45.2214 103.751 64.9142V68.9827C103.751 72.1649 101.196 74.7478 98.0442 74.7478C94.8927 74.7478 92.3371 72.1649 92.3371 68.9827V52.5811H85.9371V55.561C83.2337 53.1856 79.5969 51.7302 75.6142 51.7302C67.0253 51.7302 60.065 58.7459 60.065 67.4041C60.065 76.0622 67.0253 83.078 75.6142 83.078C80.1428 83.078 84.2183 81.1386 87.1073 78.0444C88.9949 81.1141 92.3088 83.2217 96.0786 83.2217C101.978 83.2217 106.752 78.3965 106.752 72.4363V64.9142H110.584ZM75.6142 76.4652C70.6437 76.4652 66.6133 72.3975 66.6133 67.4041C66.6133 62.4107 70.6437 58.343 75.6142 58.343C80.5847 58.343 84.615 62.4107 84.615 67.4041C84.615 72.3975 80.5847 76.4652 75.6142 76.4652Z"
                    fill="white"
                  />
                </svg>
              </div>

              <div className="flex-1 text-left">
                <div className="font-semibold text-white text-sm">Phantom</div>
                <div className="text-xs text-slate-400">
                  Solana • Most Popular
                </div>
              </div>

              {connecting === "phantom" ? (
                <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
              ) : (
                <div className="text-xs text-slate-500 group-hover:text-purple-400 transition-colors">
                  Connect →
                </div>
              )}
            </button>

            {/* MetaMask */}
            <button
              onClick={() => handleConnect("metamask")}
              disabled={isConnecting || connecting !== null}
              className="w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: "rgba(20, 26, 42, 0.6)",
                border: "1px solid rgba(148, 163, 184, 0.1)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.border =
                  "1px solid rgba(245, 158, 11, 0.4)";
                (e.currentTarget as HTMLElement).style.background =
                  "rgba(245, 158, 11, 0.05)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.border =
                  "1px solid rgba(148, 163, 184, 0.1)";
                (e.currentTarget as HTMLElement).style.background =
                  "rgba(20, 26, 42, 0.6)";
              }}
            >
              {/* MetaMask logo */}
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "rgba(245, 158, 11, 0.15)" }}
              >
                <svg
                  width="28"
                  height="28"
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
              </div>

              <div className="flex-1 text-left">
                <div className="font-semibold text-white text-sm">MetaMask</div>
                <div className="text-xs text-slate-400">
                  Ethereum & EVM chains
                </div>
              </div>

              {connecting === "metamask" ? (
                <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
              ) : (
                <div className="text-xs text-slate-500 group-hover:text-amber-400 transition-colors">
                  Connect →
                </div>
              )}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div
              className="flex items-start gap-2 p-3 rounded-lg mb-4"
              style={{
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
              }}
            >
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          {/* Security note */}
          <div
            className="flex items-start gap-2 p-3 rounded-lg"
            style={{
              background: "rgba(34, 211, 238, 0.05)",
              border: "1px solid rgba(34, 211, 238, 0.1)",
            }}
          >
            <Shield className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-cyan-400 font-medium mb-0.5">
                Non-custodial & Secure
              </p>
              <p className="text-[11px] text-slate-500">
                We never store your private keys. All transactions are signed
                directly in your wallet.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
