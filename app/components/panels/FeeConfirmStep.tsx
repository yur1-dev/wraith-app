"use client";

import { useState } from "react";
import {
  Loader2,
  ShieldCheck,
  Zap,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import {
  collectProtocolFee,
  getFeeDisplay,
  type FeeResult,
} from "@/lib/fee/feeCollector";

interface FeeConfirmStepProps {
  walletType: "phantom" | "metamask";
  onFeePaid: (signature: string) => void;
  onSkip?: () => void; // for dev mode only
  onCancel: () => void;
}

export function FeeConfirmStep({
  walletType,
  onFeePaid,
  onSkip,
  onCancel,
}: FeeConfirmStepProps) {
  const [status, setStatus] = useState<
    "idle" | "waiting" | "confirming" | "error"
  >("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const fee = getFeeDisplay(walletType);
  const isDev = process.env.NODE_ENV === "development";

  const handlePay = async () => {
    setStatus("waiting");
    setErrorMsg("");

    const result: FeeResult = await collectProtocolFee(walletType);

    if (!result.success) {
      setStatus("error");
      setErrorMsg(result.error);
      return;
    }

    setStatus("confirming");

    // Optionally verify on server
    try {
      const res = await fetch("/api/verify-fee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signature: result.signature,
          walletType,
        }),
      });
      const data = await res.json();
      if (!data.verified) {
        setStatus("error");
        setErrorMsg(data.error || "Fee verification failed");
        return;
      }
    } catch {
      // If verify endpoint fails, still allow — server is best-effort
    }

    onFeePaid(result.signature);
  };

  const walletColor = walletType === "phantom" ? "#c084fc" : "#fbbf24";
  const walletName = walletType === "phantom" ? "Phantom" : "MetaMask";

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center">
      {/* Icon */}
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
        style={{
          background: `${walletColor}15`,
          border: `1px solid ${walletColor}30`,
        }}
      >
        <ShieldCheck className="w-8 h-8" style={{ color: walletColor }} />
      </div>

      <h3 className="text-base font-bold text-white mb-2">Protocol Fee</h3>
      <p className="text-xs text-slate-400 mb-6 max-w-xs leading-relaxed">
        A small fee is collected to run this flow. This keeps the platform
        running and funds future development.
      </p>

      {/* Fee breakdown */}
      <div
        className="w-full max-w-xs rounded-xl p-4 mb-6 text-left"
        style={{
          background: "rgba(15,23,42,0.6)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-500">Execution fee</span>
          <span className="text-sm font-bold" style={{ color: walletColor }}>
            {fee?.display}
          </span>
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-500">≈ USD value</span>
          <span className="text-xs text-slate-400">{fee?.usdApprox}</span>
        </div>
        <div
          className="pt-2 mt-2"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Paid via</span>
            <span
              className="text-xs font-medium"
              style={{ color: walletColor }}
            >
              {walletName}
            </span>
          </div>
        </div>
      </div>

      {/* Error */}
      {status === "error" && (
        <div
          className="w-full max-w-xs flex items-start gap-2 p-3 rounded-lg mb-4 text-left"
          style={{
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.2)",
          }}
        >
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-xs text-red-400">{errorMsg}</p>
        </div>
      )}

      {/* Pay button */}
      <button
        onClick={handlePay}
        disabled={status === "waiting" || status === "confirming"}
        className="w-full max-w-xs h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 mb-3 transition-all"
        style={{
          background:
            status === "waiting" || status === "confirming"
              ? "rgba(255,255,255,0.05)"
              : `linear-gradient(135deg, ${walletColor}cc, ${walletColor}88)`,
          color:
            status === "waiting" || status === "confirming"
              ? "#64748b"
              : "white",
          border: "none",
          cursor:
            status === "waiting" || status === "confirming"
              ? "not-allowed"
              : "pointer",
          boxShadow:
            status === "idle" || status === "error"
              ? `0 0 20px ${walletColor}30`
              : "none",
        }}
      >
        {status === "waiting" && (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Waiting for {walletName}...
          </>
        )}
        {status === "confirming" && (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Confirming on chain...
          </>
        )}
        {(status === "idle" || status === "error") && (
          <>
            <Zap className="w-4 h-4" />
            Pay {fee?.display} & Execute
          </>
        )}
      </button>

      {/* Cancel */}
      <button
        onClick={onCancel}
        className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
      >
        Cancel
      </button>

      {/* Dev skip */}
      {isDev && onSkip && (
        <button
          onClick={onSkip}
          className="mt-2 text-[10px] text-slate-700 hover:text-yellow-600 transition-colors"
        >
          [DEV] Skip fee
        </button>
      )}
    </div>
  );
}
