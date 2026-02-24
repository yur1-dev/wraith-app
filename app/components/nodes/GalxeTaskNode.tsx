"use client";

import { memo, useState, useEffect, useCallback, useRef } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  MoreVertical,
  Trophy,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Hash,
  ExternalLink,
  Star,
  Gift,
  Search,
  Play,
  Eye,
  EyeOff,
  KeyRound,
} from "lucide-react";
import { useFlowStore } from "@/lib/hooks/useFlowStore";
import { executeGalxeTask, validateGalxeToken } from "@/lib/galxeClient";

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

type TaskStatus = "idle" | "running" | "done" | "error";

const ACTION_CONFIG: Record<
  string,
  { label: string; icon: React.ReactNode; desc: string }
> = {
  complete: {
    label: "Complete Tasks",
    icon: <Star className="w-3.5 h-3.5" />,
    desc: "Sync & complete all campaign tasks",
  },
  claim: {
    label: "Claim OAT",
    icon: <Gift className="w-3.5 h-3.5" />,
    desc: "Claim On-Chain Achievement Token",
  },
  check: {
    label: "Check Eligibility",
    icon: <Search className="w-3.5 h-3.5" />,
    desc: "Verify wallet eligibility",
  },
};

export const GalxeTaskNode = memo(({ data, selected, id }: NodeProps) => {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);

  // ── data ──────────────────────────────────────────────────────────────
  const campaignName = String(data.campaignName ?? "");
  const campaignUrl = String(data.campaignUrl ?? "");
  const action = String(data.action ?? "complete") as
    | "complete"
    | "claim"
    | "check";
  const galxeToken = String(data.galxeToken ?? "");
  // Wallet comes from upstream WalletConnectNode
  const walletAddress = String(
    (data.walletPublicKey as string | undefined) ??
      (data.connectedWallet as string | undefined) ??
      "",
  );
  const customColor = data.customColor as string | undefined;
  const accent = customColor ?? "#a78bfa";

  // ── local state ───────────────────────────────────────────────────────
  const [showPopover, setShowPopover] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [status, setStatus] = useState<TaskStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null); // null = unchecked
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tokenCheckRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const update = (field: string, val: unknown) =>
    updateNodeData(id, { [field]: val });

  useEffect(() => {
    setLastRun(data.lastRun ? String(data.lastRun) : null);
  }, [data.lastRun]);

  useEffect(() => {
    const close = () => setShowPopover(false);
    window.addEventListener("closeColorMenus", close);
    return () => window.removeEventListener("closeColorMenus", close);
  }, []);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      if (tokenCheckRef.current) clearTimeout(tokenCheckRef.current);
    };
  }, []);

  // ── Token validation (debounced) ──────────────────────────────────────
  useEffect(() => {
    if (!galxeToken || galxeToken.length < 10) {
      setTokenValid(null);
      return;
    }
    if (tokenCheckRef.current) clearTimeout(tokenCheckRef.current);
    tokenCheckRef.current = setTimeout(async () => {
      try {
        const result = await validateGalxeToken(galxeToken);
        setTokenValid(result.valid);
      } catch {
        setTokenValid(false);
      }
    }, 800);
  }, [galxeToken]);

  // ── derived / validation ──────────────────────────────────────────────
  const actionCfg = ACTION_CONFIG[action] ?? ACTION_CONFIG.complete;

  // Every field that must be filled before we allow execution
  const missingFields: string[] = [];
  if (!campaignUrl.trim()) missingFields.push("Campaign URL");
  if (!galxeToken.trim()) missingFields.push("Galxe token");
  if (tokenValid === false) missingFields.push("Valid token");
  if (!walletAddress.trim() && action !== "complete")
    missingFields.push("Wallet address");

  const canRun = status !== "running" && missingFields.length === 0;

  const notReadyReason =
    missingFields.length > 0 ? `Missing: ${missingFields.join(", ")}` : null;

  // URL display
  const displayUrl = campaignUrl
    .replace("https://", "")
    .replace("http://", "")
    .slice(0, 30);

  // Token display
  const maskedToken = galxeToken
    ? galxeToken.slice(0, 4) + "••••••••" + galxeToken.slice(-4)
    : "";

  // ── execute ───────────────────────────────────────────────────────────
  const handleRun = useCallback(async () => {
    if (!canRun) return;

    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }

    setStatus("running");
    setErrorMsg(null);
    setResultMsg(null);
    setStatusMsg("Validating token…");

    try {
      setStatusMsg(`${actionCfg.label}…`);

      const result = await executeGalxeTask({
        campaignUrl,
        action,
        galxeToken,
        walletAddress,
      });

      const now = new Date().toLocaleTimeString();
      setLastRun(now);
      setStatusMsg(null);
      setResultMsg(result.message);
      updateNodeData(id, {
        lastRun: now,
        lastStatus: "done",
        lastResult: result.message,
        resolvedCampaignName: result.campaignName,
      });
      setStatus("done");

      resetTimerRef.current = setTimeout(() => {
        setStatus("idle");
        resetTimerRef.current = null;
      }, 5000);
    } catch (err: unknown) {
      setStatusMsg(null);
      const msg = err instanceof Error ? err.message : "Task failed";
      setErrorMsg(msg);
      updateNodeData(id, { lastStatus: "error" });
      setStatus("error");
    }
  }, [
    canRun,
    action,
    actionCfg.label,
    campaignUrl,
    galxeToken,
    walletAddress,
    id,
    updateNodeData,
  ]);

  // ── status config ─────────────────────────────────────────────────────
  const statusConfig: Record<
    TaskStatus,
    { color: string; label: string; icon: React.ReactNode }
  > = {
    idle: {
      color: "#475569",
      label: "Ready",
      icon: <Hash className="w-3 h-3" />,
    },
    running: {
      color: accent,
      label: statusMsg ?? "Running…",
      icon: <Loader2 className="w-3 h-3 animate-spin" />,
    },
    done: {
      color: "#34d399",
      label: "Done",
      icon: <CheckCircle2 className="w-3 h-3" />,
    },
    error: {
      color: "#f87171",
      label: "Error",
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
            <Trophy className="w-3.5 h-3.5" style={{ color: accent }} />
          </div>
          <div>
            <div className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase">
              Galxe Task
            </div>
            <div className="text-[9px] font-mono text-slate-600">
              {actionCfg.label}
            </div>
          </div>
        </div>
        <button
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

      {/* Accent divider */}
      <div
        className="h-px w-full"
        style={{
          background: `linear-gradient(90deg, ${accent}80, transparent 60%)`,
        }}
      />

      {/* ── Body ── */}
      <div className="px-3 py-3 space-y-2 select-none">
        {/* Galxe token row */}
        <div
          className="rounded-lg px-3 py-2 flex items-center gap-2"
          style={{
            background: "rgba(15,23,42,0.6)",
            border: galxeToken
              ? tokenValid === true
                ? "1px solid rgba(52,211,153,0.3)"
                : tokenValid === false
                  ? "1px solid rgba(248,113,113,0.3)"
                  : `1px solid ${accent}22`
              : "1px solid rgba(51,65,85,0.25)",
          }}
        >
          <KeyRound
            className="w-3 h-3 flex-shrink-0"
            style={{
              color: !galxeToken
                ? "#475569"
                : tokenValid === true
                  ? "#34d399"
                  : tokenValid === false
                    ? "#f87171"
                    : accent,
            }}
          />
          <div className="flex-1 min-w-0">
            {galxeToken ? (
              <div
                className="text-[9px] font-mono truncate"
                style={{
                  color:
                    tokenValid === true
                      ? "#34d399"
                      : tokenValid === false
                        ? "#f87171"
                        : `${accent}aa`,
                }}
              >
                {showToken ? galxeToken : maskedToken}
              </div>
            ) : (
              <div className="text-[9px] font-mono text-slate-600">
                No token — set in panel
              </div>
            )}
          </div>
          {galxeToken && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowToken((v) => !v);
              }}
              className="flex-shrink-0 cursor-pointer text-slate-600 hover:text-slate-400 transition-colors"
            >
              {showToken ? (
                <EyeOff className="w-3 h-3" />
              ) : (
                <Eye className="w-3 h-3" />
              )}
            </button>
          )}
          {galxeToken && tokenValid === true && (
            <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
          )}
          {galxeToken && tokenValid === false && (
            <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0" />
          )}
        </div>

        {/* Campaign card */}
        <div
          className="rounded-lg px-3 py-2.5 flex items-start gap-2.5"
          style={{
            background: "rgba(15,23,42,0.6)",
            border: `1px solid ${accent}22`,
          }}
        >
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{
              background: `${accent}18`,
              border: `1px solid ${accent}33`,
            }}
          >
            <span style={{ color: accent }}>{actionCfg.icon}</span>
          </div>
          <div className="flex-1 min-w-0 space-y-0.5">
            <div
              className="text-[10px] font-mono font-bold truncate"
              style={{ color: accent }}
            >
              {campaignName || "No campaign name"}
            </div>
            <div className="flex items-center gap-1">
              <div className="text-[9px] font-mono text-slate-500 truncate flex-1">
                {campaignUrl ? displayUrl : "No URL set"}
              </div>
              {campaignUrl && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(
                      campaignUrl.startsWith("http")
                        ? campaignUrl
                        : `https://${campaignUrl}`,
                      "_blank",
                    );
                  }}
                  className="flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <ExternalLink className="w-2.5 h-2.5 text-slate-600 hover:text-slate-400" />
                </button>
              )}
            </div>
            <div className="text-[8px] font-mono text-slate-700">
              {actionCfg.desc}
            </div>
          </div>
        </div>

        {/* Live status while running */}
        {status === "running" && statusMsg && (
          <div
            className="rounded-lg px-3 py-1.5"
            style={{
              background: "rgba(15,23,42,0.4)",
              border: `1px solid ${accent}15`,
            }}
          >
            <div
              className="text-[8px] font-mono"
              style={{ color: `${accent}cc` }}
            >
              {statusMsg}
            </div>
          </div>
        )}

        {/* Result message on done */}
        {status === "done" && resultMsg && (
          <div
            className="rounded-lg px-3 py-1.5"
            style={{
              background: "rgba(52,211,153,0.06)",
              border: "1px solid rgba(52,211,153,0.2)",
            }}
          >
            <div className="text-[8px] font-mono text-emerald-400 leading-relaxed">
              {resultMsg}
            </div>
          </div>
        )}

        {/* Status row */}
        <div
          className="rounded-lg px-3 py-2 flex items-center justify-between"
          style={{
            background: "rgba(15,23,42,0.4)",
            border: "1px solid rgba(51,65,85,0.3)",
          }}
        >
          <div className="flex items-center gap-1.5">
            <span style={{ color: sc.color }}>{sc.icon}</span>
            <span className="text-[9px] font-mono" style={{ color: sc.color }}>
              {status === "error"
                ? (errorMsg ?? "Error")
                : status === "running"
                  ? (statusMsg ?? "Running…")
                  : sc.label}
            </span>
          </div>
          {status === "idle" && lastRun && (
            <span className="text-[8px] font-mono text-slate-700">
              last {lastRun}
            </span>
          )}
          {status === "idle" && !lastRun && notReadyReason && (
            <span className="text-[8px] font-mono text-slate-600 truncate max-w-[120px]">
              {notReadyReason}
            </span>
          )}
        </div>

        {/* Execute button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleRun();
          }}
          disabled={!canRun}
          className="w-full py-1.5 rounded-lg text-[9px] font-mono font-bold uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:cursor-not-allowed"
          style={{
            background:
              status === "done" ? "rgba(52,211,153,0.08)" : `${accent}18`,
            border:
              status === "done"
                ? "1px solid rgba(52,211,153,0.25)"
                : `1px solid ${accent}44`,
            color: status === "done" ? "#34d399" : accent,
            opacity: !canRun && status !== "running" ? 0.4 : 1,
          }}
        >
          {status === "running" ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" /> Running…
            </>
          ) : status === "done" ? (
            <>
              <CheckCircle2 className="w-3 h-3" /> Completed — Run Again
            </>
          ) : (
            <>
              <Play className="w-3 h-3" /> Execute Task
            </>
          )}
        </button>

        {/* Hint when button is disabled */}
        {!canRun && status === "idle" && missingFields.length > 0 && (
          <div className="text-center text-[8px] font-mono text-slate-700">
            {missingFields[0] === "Valid token"
              ? "Token failed validation — check it in the panel"
              : `Set ${missingFields[0].toLowerCase()} in the panel →`}
          </div>
        )}
      </div>

      {/* ── Popover ── */}
      {showPopover && (
        <>
          <div
            className="fixed inset-0 z-[90]"
            onClick={() => setShowPopover(false)}
          />
          <div
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
                      borderColor:
                        accent === c ? "white" : "rgba(51,65,85,0.5)",
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
        </>
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

GalxeTaskNode.displayName = "GalxeTaskNode";
