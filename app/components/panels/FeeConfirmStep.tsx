"use client";

import { useState, useEffect } from "react";
import {
  Loader2,
  ShieldCheck,
  Zap,
  AlertCircle,
  FlaskConical,
} from "lucide-react";
import {
  collectProtocolFee,
  getSolFeeDisplay,
  type FeeResult,
} from "@/lib/fee/feeCollector";
import { isDevnet, getNetworkDisplay } from "@/lib/network/solana.config";

interface FeeConfirmStepProps {
  walletType: "phantom" | "metamask";
  onFeePaid: (signature: string) => void;
  onSkip?: () => void;
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

  // Live fee display — fetches SOL price when dialog opens
  const [feeDisplay, setFeeDisplay] = useState("Loading price...");
  const [feeUsd, setFeeUsd] = useState("$0.79");
  const [priceLoaded, setPriceLoaded] = useState(false);

  const devnet = isDevnet();
  const netDisplay = getNetworkDisplay();
  const isDev =
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_DEV_MODE === "true";

  const walletColor = walletType === "phantom" ? "#c084fc" : "#fbbf24";
  const walletName = walletType === "phantom" ? "Phantom" : "MetaMask";
  const accentColor = devnet ? netDisplay.color : walletColor;

  // Fetch live price as soon as dialog opens
  useEffect(() => {
    if (walletType !== "phantom") {
      setFeeDisplay("~0.00032 ETH");
      setFeeUsd("$0.79");
      setPriceLoaded(true);
      return;
    }
    getSolFeeDisplay().then((info) => {
      setFeeDisplay(info.display);
      setFeeUsd(info.usdApprox);
      setPriceLoaded(true);
    });
  }, [walletType]);

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

    // Best-effort server verification
    try {
      const res = await fetch("/api/verify-fee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature: result.signature, walletType }),
      });
      const data = await res.json();
      if (!data.verified && !devnet) {
        setStatus("error");
        setErrorMsg(data.error || "Fee verification failed");
        return;
      }
    } catch {
      /* proceed anyway */
    }

    onFeePaid(result.signature);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-6 sm:py-8 text-center">
      {/* Icon */}
      <div
        className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center mb-4 sm:mb-5"
        style={{
          background: `${accentColor}15`,
          border: `1px solid ${accentColor}30`,
        }}
      >
        {devnet ? (
          <FlaskConical
            className="w-7 h-7 sm:w-8 sm:h-8"
            style={{ color: accentColor }}
          />
        ) : (
          <ShieldCheck
            className="w-7 h-7 sm:w-8 sm:h-8"
            style={{ color: accentColor }}
          />
        )}
      </div>

      <h3 className="text-base font-bold text-white mb-1">
        {devnet ? "Devnet — Test Fee" : "Protocol Fee"}
      </h3>

      {devnet && (
        <div
          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold mb-3"
          style={{
            background: netDisplay.bgColor,
            border: `1px solid ${netDisplay.borderColor}`,
            color: netDisplay.color,
          }}
        >
          <FlaskConical size={9} />
          DEVNET · No real funds
        </div>
      )}

      <p className="text-xs text-slate-400 mb-5 sm:mb-6 max-w-xs leading-relaxed">
        {devnet
          ? "Sends a tiny test amount to treasury on devnet — confirms your wallet and fee flow are working."
          : "A $0.79 fee is collected to run this flow. Amount is calculated at live SOL price."}
      </p>

      {/* Fee breakdown */}
      <div
        className="w-full max-w-xs rounded-xl p-3 sm:p-4 mb-5 sm:mb-6 text-left"
        style={{
          background: "rgba(15,23,42,0.6)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-500">
            {devnet ? "Test transaction" : "Execution fee"}
          </span>
          <span className="text-sm font-bold" style={{ color: accentColor }}>
            {priceLoaded ? (
              feeDisplay
            ) : (
              <span className="flex items-center gap-1 text-slate-500">
                <Loader2 size={12} className="animate-spin" /> fetching...
              </span>
            )}
          </span>
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-500">≈ USD value</span>
          <span className="text-xs text-slate-400">{feeUsd}</span>
        </div>
        <div
          className="pt-2 mt-2"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Network</span>
            <span
              className="text-xs font-mono font-bold"
              style={{ color: netDisplay.color }}
            >
              {devnet ? "DEVNET" : "MAINNET"}
            </span>
          </div>
          <div className="flex items-center justify-between mt-1">
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
          <p className="text-xs text-red-400 break-words">{errorMsg}</p>
        </div>
      )}

      {/* Pay button */}
      <button
        onClick={handlePay}
        disabled={
          status === "waiting" || status === "confirming" || !priceLoaded
        }
        className="w-full max-w-xs h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 mb-3 transition-all active:scale-[0.98]"
        style={{
          background:
            status === "waiting" || status === "confirming" || !priceLoaded
              ? "rgba(255,255,255,0.05)"
              : `linear-gradient(135deg, ${accentColor}cc, ${accentColor}88)`,
          color:
            status === "waiting" || status === "confirming" || !priceLoaded
              ? "#64748b"
              : "white",
          border: "none",
          cursor:
            status === "waiting" || status === "confirming" || !priceLoaded
              ? "not-allowed"
              : "pointer",
          boxShadow:
            (status === "idle" || status === "error") && priceLoaded
              ? `0 0 20px ${accentColor}30`
              : "none",
        }}
      >
        {status === "waiting" && (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Waiting for {walletName}...</span>
          </>
        )}
        {status === "confirming" && (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Confirming on chain...</span>
          </>
        )}
        {(status === "idle" || status === "error") && (
          <>
            <Zap className="w-4 h-4 shrink-0" />
            {!priceLoaded
              ? "Fetching price..."
              : devnet
                ? `Confirm in ${walletName} & Execute`
                : `Pay $0.79 & Execute`}
          </>
        )}
      </button>

      <button
        onClick={onCancel}
        className="text-xs text-slate-600 hover:text-slate-400 transition-colors py-1"
      >
        Cancel
      </button>

      {isDev && onSkip && (
        <button
          onClick={onSkip}
          className="mt-2 text-[10px] text-slate-700 hover:text-yellow-600 transition-colors py-1"
        >
          [DEV] Skip wallet prompt
        </button>
      )}
    </div>
  );
}
