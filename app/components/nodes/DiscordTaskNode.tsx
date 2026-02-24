"use client";

import { memo, useState, useEffect, useCallback, useRef } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  MoreVertical,
  MessageCircle,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Hash,
  UserPlus,
  Smile,
  Send,
  Shield,
  Play,
  Eye,
  EyeOff,
} from "lucide-react";
import { useFlowStore } from "@/lib/hooks/useFlowStore";
import { executeDiscordTask } from "@/lib/discordClient";

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

const TASK_CONFIG: Record<
  string,
  {
    label: string;
    icon: React.ReactNode;
    needsServer: boolean;
    needsChannel: boolean;
    needsMessage: boolean;
    needsMessageId: boolean;
    needsEmoji: boolean;
  }
> = {
  join: {
    label: "Join Server",
    icon: <UserPlus className="w-3.5 h-3.5" />,
    needsServer: true,
    needsChannel: false,
    needsMessage: false,
    needsMessageId: false,
    needsEmoji: false,
  },
  message: {
    label: "Send Message",
    icon: <Send className="w-3.5 h-3.5" />,
    needsServer: false,
    needsChannel: true,
    needsMessage: true,
    needsMessageId: false,
    needsEmoji: false,
  },
  react: {
    label: "React to Message",
    icon: <Smile className="w-3.5 h-3.5" />,
    needsServer: false,
    needsChannel: true,
    needsMessage: false,
    needsMessageId: true,
    needsEmoji: true,
  },
  role: {
    label: "Get Role",
    icon: <Shield className="w-3.5 h-3.5" />,
    needsServer: false,
    needsChannel: true,
    needsMessage: false,
    needsMessageId: true,
    needsEmoji: true,
  },
};

export const DiscordTaskNode = memo(({ data, selected, id }: NodeProps) => {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);

  // ── data ──────────────────────────────────────────────────────────────────
  const taskType = String(data.taskType ?? "join");
  const serverId = String(data.serverId ?? "");
  const channelId = String(data.channelId ?? "");
  const message = String(data.message ?? "");
  const messageId = String(data.messageId ?? "");
  const emoji = String(data.emoji ?? "👍");
  const discordToken = String(data.discordToken ?? "");
  const customColor = data.customColor as string | undefined;
  const accent = customColor ?? "#818cf8";

  // ── local state ───────────────────────────────────────────────────────────
  const [showPopover, setShowPopover] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [status, setStatus] = useState<TaskStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [lastDetail, setLastDetail] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const update = (field: string, val: unknown) =>
    updateNodeData(id, { [field]: val });

  useEffect(() => {
    setLastRun(data.lastRun ? String(data.lastRun) : null);
    setLastDetail(data.lastDetail ? String(data.lastDetail) : null);
  }, [data.lastRun, data.lastDetail]);

  useEffect(() => {
    const close = () => setShowPopover(false);
    window.addEventListener("closeColorMenus", close);
    return () => window.removeEventListener("closeColorMenus", close);
  }, []);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  // ── derived ───────────────────────────────────────────────────────────────
  const taskCfg = TASK_CONFIG[taskType] ?? TASK_CONFIG.join;
  const hasToken = discordToken.trim().length > 10;

  const canRun = (() => {
    if (status === "running") return false;
    if (!hasToken) return false;
    if (taskCfg.needsServer && !serverId.trim()) return false;
    if (taskCfg.needsChannel && !channelId.trim()) return false;
    if (taskCfg.needsMessage && !message.trim()) return false;
    if (taskCfg.needsMessageId && !messageId.trim()) return false;
    return true;
  })();

  const notReadyReason = (() => {
    if (!hasToken) return "Add Discord token";
    if (taskCfg.needsServer && !serverId.trim()) return "Set server invite";
    if (taskCfg.needsChannel && !channelId.trim()) return "Set channel ID";
    if (taskCfg.needsMessage && !message.trim()) return "Write a message";
    if (taskCfg.needsMessageId && !messageId.trim()) return "Set message ID";
    return null;
  })();

  // ── execute ───────────────────────────────────────────────────────────────
  const handleRun = useCallback(async () => {
    if (!canRun) return;

    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }

    setStatus("running");
    setErrorMsg(null);
    setStatusMsg("Validating token…");

    try {
      setStatusMsg(`Running: ${taskCfg.label}…`);

      // ── REAL Discord REST API call ─────────────────────────────────────────
      const result = await executeDiscordTask({
        token: discordToken,
        taskType: taskType as "join" | "message" | "react" | "role",
        serverId,
        channelId,
        message,
        messageId,
        emoji,
      });
      // ─────────────────────────────────────────────────────────────────────

      const now = new Date().toLocaleTimeString();
      setLastRun(now);
      setLastDetail(result.detail);
      setStatusMsg(null);
      updateNodeData(id, {
        lastRun: now,
        lastDetail: result.detail,
        lastStatus: "done",
      });
      setStatus("done");

      resetTimerRef.current = setTimeout(() => {
        setStatus("idle");
        resetTimerRef.current = null;
      }, 4000);
    } catch (err: unknown) {
      setStatusMsg(null);
      const msg = err instanceof Error ? err.message : "Task failed";
      setErrorMsg(msg);
      updateNodeData(id, { lastStatus: "error" });
      setStatus("error");
    }
  }, [
    canRun,
    taskType,
    taskCfg.label,
    discordToken,
    serverId,
    channelId,
    message,
    messageId,
    emoji,
    id,
    updateNodeData,
  ]);

  // ── status config ─────────────────────────────────────────────────────────
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

  // Body preview
  const previewLine1 = (() => {
    if (taskType === "join") {
      const code = serverId
        .replace(/https?:\/\/discord\.(gg|com\/invite)\//g, "")
        .slice(0, 20);
      return serverId ? `discord.gg/${code}` : "No invite set";
    }
    return channelId ? `#${channelId.slice(0, 18)}` : "No channel set";
  })();

  const previewLine2 = (() => {
    if (taskType === "message" && message)
      return `"${message.slice(0, 24)}${message.length > 24 ? "…" : ""}"`;
    if ((taskType === "react" || taskType === "role") && messageId)
      return `msg: ${messageId.slice(0, 14)}… ${emoji}`;
    return null;
  })();

  return (
    <div
      className="relative min-w-[260px] rounded-xl transition-all duration-200"
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
            <MessageCircle className="w-3.5 h-3.5" style={{ color: accent }} />
          </div>
          <div>
            <div className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase">
              Discord Task
            </div>
            <div className="text-[9px] font-mono text-slate-600">
              {taskCfg.label}
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

      <div
        className="h-px w-full"
        style={{
          background: `linear-gradient(90deg, ${accent}80, transparent 60%)`,
        }}
      />

      {/* ── Body ── */}
      <div className="px-3 py-3 space-y-2 select-none">
        {/* Token status row */}
        <div
          className="rounded-lg px-3 py-2 flex items-center justify-between"
          style={{
            background: "rgba(15,23,42,0.6)",
            border: hasToken
              ? `1px solid ${accent}22`
              : "1px solid rgba(248,113,113,0.2)",
          }}
        >
          <div className="text-[8px] font-mono text-slate-600 uppercase tracking-widest">
            Token
          </div>
          {hasToken ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-mono" style={{ color: accent }}>
                {showToken ? discordToken.slice(0, 12) + "…" : "••••••••••••"}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowToken((v) => !v);
                }}
                className="cursor-pointer text-slate-600 hover:text-slate-400 transition-colors"
              >
                {showToken ? (
                  <EyeOff className="w-3 h-3" />
                ) : (
                  <Eye className="w-3 h-3" />
                )}
              </button>
            </div>
          ) : (
            <span className="text-[9px] font-mono text-red-400/70">
              Not set — add in panel
            </span>
          )}
        </div>

        {/* Task preview card */}
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
            <span style={{ color: accent }}>{taskCfg.icon}</span>
          </div>
          <div className="flex-1 min-w-0 space-y-0.5">
            <div
              className="text-[10px] font-mono font-bold"
              style={{ color: accent }}
            >
              {taskCfg.label}
            </div>
            <div className="text-[9px] font-mono text-slate-400 truncate">
              {previewLine1}
            </div>
            {previewLine2 && (
              <div className="text-[9px] font-mono text-slate-600 truncate">
                {previewLine2}
              </div>
            )}
          </div>
        </div>

        {/* Live status message while running */}
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

        {/* Result detail after done */}
        {status === "done" && lastDetail && (
          <div
            className="rounded-lg px-3 py-1.5"
            style={{
              background: "rgba(52,211,153,0.05)",
              border: "1px solid rgba(52,211,153,0.15)",
            }}
          >
            <div className="text-[8px] font-mono text-emerald-400/70 truncate">
              {lastDetail}
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
            <span className="text-[8px] font-mono text-slate-600">
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
              <CheckCircle2 className="w-3 h-3" /> Completed
            </>
          ) : (
            <>
              <Play className="w-3 h-3" /> Execute Task
            </>
          )}
        </button>
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

DiscordTaskNode.displayName = "DiscordTaskNode";
