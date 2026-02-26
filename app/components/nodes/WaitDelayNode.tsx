"use client";

import { memo, useState, useEffect, useRef } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Timer, MoreVertical, Clock, Shuffle } from "lucide-react";
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

const UNITS = ["seconds", "minutes", "hours", "days"] as const;
type Unit = (typeof UNITS)[number];

function toSeconds(duration: number, unit: Unit): number {
  switch (unit) {
    case "minutes":
      return duration * 60;
    case "hours":
      return duration * 3600;
    case "days":
      return duration * 86400;
    default:
      return duration;
  }
}

function formatDuration(
  duration: number,
  unit: Unit,
  randomize: boolean,
  randomRange: number,
): string {
  const base = `${duration} ${unit}`;
  if (randomize) return `${base} ±${randomRange}%`;
  return base;
}

export const WaitDelayNode = memo(({ data, selected, id }: NodeProps) => {
  const duration = parseInt(String(data.duration ?? "60"), 10) || 60;
  const unit = String(data.unit ?? "seconds") as Unit;
  const randomize = data.randomize === true;
  const randomRange = parseInt(String(data.randomRange ?? "10"), 10) || 10;

  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const customColor = data.customColor as string | undefined;
  const accent = customColor ?? "#94a3b8";

  const [showPopover, setShowPopover] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Element;
      if (buttonRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      setShowPopover(false);
    };
    window.addEventListener("mousedown", handleMouseDown, true);
    return () => window.removeEventListener("mousedown", handleMouseDown, true);
  }, []);

  const update = (field: string, val: unknown) =>
    updateNodeData(id, { [field]: val });

  const totalSeconds = toSeconds(duration, unit);
  const minSeconds = randomize
    ? Math.round(totalSeconds * (1 - randomRange / 100))
    : null;
  const maxSeconds = randomize
    ? Math.round(totalSeconds * (1 + randomRange / 100))
    : null;

  return (
    <div
      className="relative min-w-[240px] rounded-xl transition-all duration-200"
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
            <Timer className="w-3.5 h-3.5" style={{ color: accent }} />
          </div>
          <div>
            <div className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase">
              Wait / Delay
            </div>
            <div className="text-[9px] font-mono text-slate-600">
              {formatDuration(duration, unit, randomize, randomRange)}
            </div>
          </div>
        </div>
        <button
          ref={buttonRef}
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
        <div
          className="rounded-lg px-3 py-2.5 flex items-center gap-3"
          style={{
            background: "rgba(15,23,42,0.6)",
            border: `1px solid ${accent}22`,
          }}
        >
          <Clock className="w-4 h-4 shrink-0" style={{ color: accent }} />
          <div className="flex-1 min-w-0">
            <div className="text-[8px] font-mono text-slate-600 uppercase tracking-widest mb-0.5">
              Delay Duration
            </div>
            <div
              className="text-sm font-mono font-bold"
              style={{ color: accent }}
            >
              {duration}{" "}
              <span className="text-[10px] font-normal text-slate-400">
                {unit}
              </span>
            </div>
          </div>
          {randomize && (
            <div className="text-right">
              <div className="text-[7px] font-mono text-slate-600 uppercase tracking-widest mb-0.5">
                variance
              </div>
              <div
                className="text-[10px] font-mono font-bold"
                style={{ color: accent }}
              >
                ±{randomRange}%
              </div>
            </div>
          )}
        </div>

        {randomize && minSeconds !== null && maxSeconds !== null && (
          <div
            className="rounded-lg px-3 py-1.5 flex items-center gap-2"
            style={{
              background: "rgba(15,23,42,0.4)",
              border: "1px solid rgba(51,65,85,0.3)",
            }}
          >
            <Shuffle
              className="w-3 h-3 shrink-0"
              style={{ color: accent, opacity: 0.6 }}
            />
            <span className="text-[8px] font-mono text-slate-500">
              actual range: <span style={{ color: accent }}>{minSeconds}s</span>
              {" — "}
              <span style={{ color: accent }}>{maxSeconds}s</span>
            </span>
          </div>
        )}

        <div className="grid grid-cols-4 gap-1">
          {UNITS.map((u) => (
            <div
              key={u}
              className="text-center py-1 rounded-md text-[8px] font-mono uppercase tracking-wider"
              style={
                unit === u
                  ? {
                      background: `${accent}22`,
                      color: accent,
                      border: `1px solid ${accent}44`,
                    }
                  : {
                      background: "rgba(15,23,42,0.3)",
                      color: "rgba(100,116,139,0.4)",
                      border: "1px solid transparent",
                    }
              }
            >
              {u === "seconds"
                ? "sec"
                : u === "minutes"
                  ? "min"
                  : u === "hours"
                    ? "hr"
                    : "day"}
            </div>
          ))}
        </div>
      </div>

      {/* Popover — color only */}
      {showPopover && (
        <div
          ref={popoverRef}
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
                style={{ borderColor: `${accent}66`, backgroundColor: accent }}
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
                    borderColor: accent === c ? "white" : "rgba(51,65,85,0.5)",
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

WaitDelayNode.displayName = "WaitDelayNode";
