"use client";

import { memo, useState, useEffect } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  RotateCw,
  MoreVertical,
  Infinity,
  Hash,
  AlertTriangle,
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

const DELAY_UNITS = ["seconds", "minutes", "hours"] as const;
type DelayUnit = (typeof DELAY_UNITS)[number];

export const LoopNode = memo(({ data, selected, id }: NodeProps) => {
  const iterations = String(data.iterations ?? "");
  const isInfinite = !iterations || iterations === "∞" || iterations === "0";
  const iterationCount = isInfinite ? null : parseInt(iterations, 10);
  const breakCondition = String(data.breakCondition ?? "");
  const loopDelay = parseInt(String(data.loopDelay ?? "0"), 10) || 0;
  const loopDelayUnit = String(data.loopDelayUnit ?? "seconds") as DelayUnit;

  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const customColor = data.customColor as string | undefined;
  const accent = customColor ?? "#e879f9";

  const [tab, setTab] = useState<"config" | "color">("config");
  const [showPopover, setShowPopover] = useState(false);

  useEffect(() => {
    const close = () => setShowPopover(false);
    window.addEventListener("closeColorMenus", close);
    return () => window.removeEventListener("closeColorMenus", close);
  }, []);

  const update = (field: string, val: unknown) =>
    updateNodeData(id, { [field]: val });

  const iterLabel = isInfinite ? "∞" : String(iterationCount);
  const delayLabel =
    loopDelay > 0
      ? `${loopDelay}${loopDelayUnit === "seconds" ? "s" : loopDelayUnit === "minutes" ? "m" : "h"} delay`
      : "no delay";

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
            <RotateCw className="w-3.5 h-3.5" style={{ color: accent }} />
          </div>
          <div>
            <div className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase">
              Loop
            </div>
            <div className="text-[9px] font-mono text-slate-600">
              {iterLabel} iterations · {delayLabel}
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
        {/* Iterations display */}
        <div
          className="rounded-lg px-3 py-2.5 flex items-center gap-3"
          style={{
            background: "rgba(15,23,42,0.6)",
            border: `1px solid ${accent}22`,
          }}
        >
          {isInfinite ? (
            <Infinity className="w-5 h-5 shrink-0" style={{ color: accent }} />
          ) : (
            <Hash className="w-4 h-4 shrink-0" style={{ color: accent }} />
          )}
          <div className="flex-1">
            <div className="text-[8px] font-mono text-slate-600 uppercase tracking-widest mb-0.5">
              Iterations
            </div>
            <div
              className="text-sm font-mono font-bold"
              style={{ color: accent }}
            >
              {isInfinite ? (
                <span>
                  ∞{" "}
                  <span className="text-[10px] font-normal text-slate-400">
                    infinite
                  </span>
                </span>
              ) : (
                <span>
                  {iterationCount}{" "}
                  <span className="text-[10px] font-normal text-slate-400">
                    times
                  </span>
                </span>
              )}
            </div>
          </div>
          {loopDelay > 0 && (
            <div className="text-right shrink-0">
              <div className="text-[7px] font-mono text-slate-600 uppercase tracking-widest mb-0.5">
                delay
              </div>
              <div
                className="text-[10px] font-mono font-bold"
                style={{ color: accent }}
              >
                {delayLabel}
              </div>
            </div>
          )}
        </div>

        {/* Break condition */}
        {breakCondition ? (
          <div
            className="rounded-lg px-3 py-1.5 flex items-center gap-2"
            style={{
              background: "rgba(15,23,42,0.4)",
              border: `1px solid ${accent}22`,
            }}
          >
            <AlertTriangle
              className="w-3 h-3 shrink-0"
              style={{ color: accent, opacity: 0.7 }}
            />
            <div className="min-w-0 flex-1">
              <div className="text-[7px] font-mono text-slate-600 uppercase tracking-widest">
                break when
              </div>
              <div
                className="text-[9px] font-mono truncate"
                style={{ color: accent }}
              >
                {breakCondition}
              </div>
            </div>
          </div>
        ) : isInfinite ? (
          <div
            className="rounded-lg px-3 py-1.5 flex items-center gap-2"
            style={{
              background: "rgba(248,113,113,0.04)",
              border: "1px solid rgba(248,113,113,0.12)",
            }}
          >
            <AlertTriangle className="w-3 h-3 shrink-0 text-red-400 opacity-60" />
            <span className="text-[8px] font-mono text-slate-600">
              no break condition — runs forever
            </span>
          </div>
        ) : null}

        {/* Loop back indicator */}
        <div className="flex items-center gap-2 px-1">
          <div className="flex-1 h-px" style={{ background: `${accent}20` }} />
          <span className="text-[7px] font-mono text-slate-700 uppercase tracking-widest">
            loops back
          </span>
          <div className="flex-1 h-px" style={{ background: `${accent}20` }} />
        </div>
      </div>

      {/* Popover */}
      {showPopover && (
        <>
          <div
            className="fixed inset-0 z-[90]"
            onClick={() => setShowPopover(false)}
          />
          <div
            className="absolute top-0 left-[calc(100%+10px)] z-[100] w-60 rounded-xl overflow-hidden shadow-2xl"
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
              className="flex border-b"
              style={{ borderColor: `${accent}15` }}
            >
              {(["config", "color"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className="flex-1 py-2 text-[9px] font-mono font-bold uppercase tracking-widest cursor-pointer transition-all"
                  style={
                    tab === t
                      ? { color: accent, borderBottom: `1px solid ${accent}` }
                      : { color: "rgba(100,116,139,0.6)" }
                  }
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="p-3 space-y-3">
              {tab === "config" && (
                <>
                  {/* Iterations */}
                  <div className="space-y-1.5">
                    <div className="text-[8px] font-mono font-bold tracking-widest text-slate-500 uppercase">
                      Iterations
                    </div>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={String(data.iterations ?? "")}
                      onChange={(e) => {
                        if (/^\d*$/.test(e.target.value))
                          update("iterations", e.target.value);
                      }}
                      placeholder="leave empty for ∞ infinite"
                      className="w-full h-7 px-2 rounded-md text-[10px] font-mono text-cyan-100 focus:outline-none"
                      style={{
                        background: "rgba(2,6,23,0.9)",
                        border: "1px solid rgba(51,65,85,0.8)",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = accent)}
                      onBlur={(e) =>
                        (e.target.style.borderColor = "rgba(51,65,85,0.8)")
                      }
                    />
                    <div className="text-[7px] font-mono text-slate-600">
                      // empty = infinite loop
                    </div>
                  </div>

                  {/* Break Condition */}
                  <div className="space-y-1.5">
                    <div className="text-[8px] font-mono font-bold tracking-widest text-slate-500 uppercase">
                      Break Condition
                    </div>
                    <input
                      type="text"
                      value={String(data.breakCondition ?? "")}
                      onChange={(e) => update("breakCondition", e.target.value)}
                      placeholder="balance > 1000"
                      className="w-full h-7 px-2 rounded-md text-[10px] font-mono text-cyan-100 focus:outline-none"
                      style={{
                        background: "rgba(2,6,23,0.9)",
                        border: "1px solid rgba(51,65,85,0.8)",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = accent)}
                      onBlur={(e) =>
                        (e.target.style.borderColor = "rgba(51,65,85,0.8)")
                      }
                    />
                    <div className="text-[7px] font-mono text-slate-600">
                      // evaluated by Flow Runner each iteration
                    </div>
                  </div>

                  {/* Delay between loops */}
                  <div className="space-y-1.5">
                    <div className="text-[8px] font-mono font-bold tracking-widest text-slate-500 uppercase">
                      Delay Between Loops
                    </div>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={String(data.loopDelay ?? "0")}
                      onChange={(e) => {
                        if (/^\d*$/.test(e.target.value))
                          update("loopDelay", e.target.value);
                      }}
                      placeholder="0"
                      className="w-full h-7 px-2 rounded-md text-[10px] font-mono text-cyan-100 focus:outline-none"
                      style={{
                        background: "rgba(2,6,23,0.9)",
                        border: "1px solid rgba(51,65,85,0.8)",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = accent)}
                      onBlur={(e) =>
                        (e.target.style.borderColor = "rgba(51,65,85,0.8)")
                      }
                    />
                    <div className="grid grid-cols-3 gap-1">
                      {DELAY_UNITS.map((u) => (
                        <button
                          key={u}
                          onClick={() => update("loopDelayUnit", u)}
                          className="py-1.5 rounded-lg text-[8px] font-mono font-bold uppercase tracking-wider cursor-pointer transition-all"
                          style={
                            loopDelayUnit === u
                              ? {
                                  background: `${accent}22`,
                                  color: accent,
                                  border: `1px solid ${accent}55`,
                                }
                              : {
                                  background: "rgba(255,255,255,0.03)",
                                  color: "rgba(148,163,184,0.5)",
                                  border: "1px solid rgba(51,65,85,0.8)",
                                }
                          }
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {tab === "color" && (
                <>
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
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Top}
        id="input"
        className="!w-3 !h-3 !border-2"
        style={{ background: accent, borderColor: `${accent}cc` }}
      />
      {/* Output — continues after loop finishes */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="output"
        className="!w-3 !h-3 !border-2"
        style={{ background: accent, borderColor: `${accent}cc` }}
      />
      {/* Loop back — connects back to first node inside loop */}
      <Handle
        type="source"
        position={Position.Left}
        id="loop"
        className="!w-3 !h-3 !border-2"
        style={{ background: `${accent}99`, borderColor: `${accent}66` }}
      />
    </div>
  );
});

LoopNode.displayName = "LoopNode";
