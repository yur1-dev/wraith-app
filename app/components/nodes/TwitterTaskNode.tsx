"use client";

import { memo, useState, useEffect, useCallback, useRef } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  MoreVertical,
  Heart,
  Repeat2,
  UserPlus,
  Quote,
  PenLine,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Clock,
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

const TASK_TYPES = [
  {
    id: "follow",
    label: "Follow",
    icon: UserPlus,
    needsTarget: true,
    needsText: false,
  },
  {
    id: "like",
    label: "Like",
    icon: Heart,
    needsTarget: true,
    needsText: false,
  },
  {
    id: "retweet",
    label: "Repost",
    icon: Repeat2,
    needsTarget: true,
    needsText: false,
  },
  {
    id: "quote",
    label: "Quote",
    icon: Quote,
    needsTarget: true,
    needsText: true,
  },
  {
    id: "tweet",
    label: "Post",
    icon: PenLine,
    needsTarget: false,
    needsText: true,
  },
] as const;

type TaskStatus = "idle" | "running" | "done" | "error";

function XIcon({
  size = 14,
  color = "currentColor",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.629L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  );
}

export const TwitterTaskNode = memo(({ data, selected, id }: NodeProps) => {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);

  const taskType = String(data.taskType ?? "follow");
  const target = String(data.target ?? "");
  const tweetText = String(data.tweetText ?? "");
  const customColor = data.customColor as string | undefined;
  const accent = customColor ?? "#1d9bf0";

  const [showPopover, setShowPopover] = useState(false);
  const [status, setStatus] = useState<TaskStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<string | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const update = (field: string, val: unknown) =>
    updateNodeData(id, { [field]: val });

  // FIX: sync lastRun from node data (survives re-renders from external changes)
  useEffect(() => {
    setLastRun(data.lastRun ? String(data.lastRun) : null);
  }, [data.lastRun]);

  useEffect(() => {
    const close = () => setShowPopover(false);
    window.addEventListener("closeColorMenus", close);
    return () => window.removeEventListener("closeColorMenus", close);
  }, []);

  // FIX: cleanup reset timer on unmount to prevent memory leak + setState on unmounted component
  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  const taskMeta = TASK_TYPES.find((t) => t.id === taskType) ?? TASK_TYPES[0];
  const TaskIcon = taskMeta.icon;

  // FIX: canRun checks requirements per task type, not a blanket !target check
  // - follow/like/repost: needs target only
  // - quote: needs both target AND text
  // - tweet (post): needs text only, no target
  const canRun =
    status !== "running" &&
    (!taskMeta.needsTarget || target.trim().length > 0) &&
    (!taskMeta.needsText || tweetText.trim().length > 0);

  const displayTarget = target
    ? target.startsWith("http")
      ? target.length > 32
        ? target.slice(0, 30) + "…"
        : target
      : target.startsWith("@")
        ? target
        : `@${target}`
    : null;

  const previewText = tweetText
    ? tweetText.length > 48
      ? tweetText.slice(0, 46) + "…"
      : tweetText
    : null;

  const handleRun = useCallback(async () => {
    if (status === "running") return;

    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }

    setStatus("running");
    setErrorMsg(null);

    try {
      if (taskMeta.needsTarget && !target.trim()) {
        throw new Error("Target is required for this task");
      }
      if (taskMeta.needsText && !tweetText.trim()) {
        throw new Error(
          taskType === "tweet"
            ? "Post content is required"
            : "Quote text is required",
        );
      }

      // ── Your X API / automation call goes here ──────────────────────────
      await new Promise((res) => setTimeout(res, 1200));
      // ────────────────────────────────────────────────────────────────────

      const now = new Date().toLocaleTimeString();
      setLastRun(now);
      updateNodeData(id, { lastRun: now, lastStatus: "done" });
      setStatus("done");

      // FIX: store ref so cleanup can cancel this if component unmounts
      resetTimerRef.current = setTimeout(() => {
        setStatus("idle");
        resetTimerRef.current = null;
      }, 3000);
    } catch (err: any) {
      const msg = err?.message ?? "Task failed";
      setErrorMsg(msg);
      updateNodeData(id, { lastStatus: "error" });
      setStatus("error");
    }
  }, [taskType, taskMeta, target, tweetText, id, updateNodeData, status]);

  const statusConfig: Record<
    TaskStatus,
    { color: string; label: string; icon: React.ReactNode }
  > = {
    idle: {
      color: "#475569",
      label: "Ready",
      icon: <Clock className="w-3 h-3" />,
    },
    running: {
      color: "#f59e0b",
      label: "Running…",
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

  // What's missing — for the hint below the button
  const missingHint =
    !canRun && status === "idle"
      ? taskMeta.needsTarget &&
        !target.trim() &&
        taskMeta.needsText &&
        !tweetText.trim()
        ? "Set target and content in the panel"
        : taskMeta.needsTarget && !target.trim()
          ? "Set a target in the panel →"
          : taskMeta.needsText && !tweetText.trim()
            ? "Set content text in the panel →"
            : null
      : null;

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
      {/* Header */}
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
            <XIcon size={13} color={accent} />
          </div>
          <div>
            <div className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase">
              X Task
            </div>
            <div className="text-[9px] font-mono text-slate-600">
              {taskMeta.label}
              {displayTarget && ` · ${displayTarget}`}
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

      {/* Body */}
      <div className="px-3 py-3 space-y-2 select-none">
        {/* Task + target */}
        <div
          className="rounded-lg px-3 py-2.5 flex items-center justify-between"
          style={{
            background: "rgba(15,23,42,0.6)",
            border: `1px solid ${accent}22`,
          }}
        >
          <div className="space-y-0.5">
            <div className="text-[8px] font-mono text-slate-600 uppercase tracking-widest">
              Task
            </div>
            <div className="flex items-center gap-1.5">
              <TaskIcon className="w-3.5 h-3.5" style={{ color: accent }} />
              <span
                className="text-sm font-mono font-bold"
                style={{ color: accent }}
              >
                {taskMeta.label}
              </span>
            </div>
          </div>
          {taskMeta.needsTarget && (
            <div className="text-right space-y-0.5">
              <div className="text-[8px] font-mono text-slate-600 uppercase tracking-widest">
                Target
              </div>
              {displayTarget ? (
                <div
                  className="text-[10px] font-mono max-w-[110px] truncate"
                  style={{ color: accent }}
                >
                  {displayTarget}
                </div>
              ) : (
                <div className="text-[10px] font-mono text-red-400/60 italic">
                  not set
                </div>
              )}
            </div>
          )}
        </div>

        {/* Content preview for quote/tweet */}
        {(taskType === "quote" || taskType === "tweet") && (
          <div
            className="rounded-lg px-3 py-2"
            style={{
              background: "rgba(15,23,42,0.4)",
              border: "1px solid rgba(51,65,85,0.3)",
            }}
          >
            <div className="text-[8px] font-mono text-slate-600 uppercase tracking-widest mb-1">
              Content
            </div>
            <div className="text-[10px] font-mono leading-relaxed">
              {previewText ? (
                <span className="text-slate-300">{previewText}</span>
              ) : (
                <span className="text-red-400/60 italic">no text set</span>
              )}
            </div>
          </div>
        )}

        {/* Status */}
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
              {status === "error" ? (errorMsg ?? "Error") : sc.label}
            </span>
          </div>
          {lastRun && status !== "running" && (
            <span className="text-[8px] font-mono text-slate-700">
              last {lastRun}
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
            opacity: !canRun ? 0.4 : 1,
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
              <XIcon size={11} color={accent} /> Execute Task
            </>
          )}
        </button>

        {/* Missing config hint */}
        {missingHint && (
          <div className="text-[8px] font-mono text-slate-600 text-center">
            {missingHint}
          </div>
        )}
      </div>

      {/* Popover — color only */}
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

TwitterTaskNode.displayName = "TwitterTaskNode";
