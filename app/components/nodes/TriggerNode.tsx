"use client";

import { memo, useState, useEffect, useRef } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  Clock,
  MoreVertical,
  Zap,
  TrendingUp,
  Wallet,
  Timer,
  ChevronDown,
  Activity,
} from "lucide-react";
import { useFlowStore } from "@/lib/hooks/useFlowStore";

const TRIGGER_TYPES = {
  schedule: {
    icon: Clock,
    label: "Schedule",
    color: "#a855f7",
    desc: "Time-based trigger",
  },
  price: {
    icon: TrendingUp,
    label: "Price Alert",
    color: "#f59e0b",
    desc: "Token price condition",
  },
  wallet: {
    icon: Wallet,
    label: "Wallet Event",
    color: "#06b6d4",
    desc: "On-chain activity",
  },
  manual: {
    icon: Zap,
    label: "Manual",
    color: "#10b981",
    desc: "Trigger on demand",
  },
} as const;

type TriggerType = keyof typeof TRIGGER_TYPES;

const SCHEDULE_PRESETS = ["Hourly", "Every 6h", "Daily", "Weekly", "Custom"];

const PRICE_CONDITIONS = ["Above", "Below", "Crosses Up", "Crosses Down"];

const WALLET_EVENTS = [
  "Incoming TX",
  "Outgoing TX",
  "Balance Change",
  "Token Received",
];

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

export const TriggerNode = memo(({ data, selected, id }: NodeProps) => {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);

  const triggerType = (data.triggerType as TriggerType) ?? "schedule";
  const customColor = data.customColor as string | undefined;

  const triggerCfg = TRIGGER_TYPES[triggerType] ?? TRIGGER_TYPES.schedule;
  const accent = customColor || triggerCfg.color;
  const TriggerIcon = triggerCfg.icon;

  // Schedule fields
  const schedulePreset = String(data.schedulePreset ?? "Daily");
  const scheduleTime = String(data.scheduleTime ?? "03:00");
  const cronExpression = data.cronExpression as string | undefined;

  // Price fields
  const token = String(data.token ?? "SOL");
  const priceCondition = String(data.priceCondition ?? "Above");
  const priceTarget = String(data.priceTarget ?? "");

  // Wallet fields
  const walletEvent = String(data.walletEvent ?? "Incoming TX");
  const minAmount = String(data.minAmount ?? "");

  const [showMenu, setShowMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<"color" | "type">("type");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = () => setShowMenu(false);
    window.addEventListener("closeColorMenus", close);
    return () => window.removeEventListener("closeColorMenus", close);
  }, []);

  useEffect(() => {
    if (!showMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Element)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClick, true);
    return () => document.removeEventListener("mousedown", handleClick, true);
  }, [showMenu]);

  const update = (patch: Record<string, unknown>) => updateNodeData(id, patch);

  const renderBody = () => {
    switch (triggerType) {
      case "schedule":
        return (
          <div className="space-y-2">
            <div>
              <div className="text-[8px] font-mono font-bold tracking-widest text-slate-500 uppercase mb-1">
                Frequency
              </div>
              <div className="flex flex-wrap gap-1">
                {SCHEDULE_PRESETS.map((p) => (
                  <button
                    key={p}
                    onClick={() => update({ schedulePreset: p })}
                    className="px-2 py-1 rounded-md text-[8px] font-mono font-bold uppercase tracking-wider cursor-pointer transition-all"
                    style={
                      schedulePreset === p
                        ? {
                            background: `${accent}22`,
                            color: accent,
                            border: `1px solid ${accent}66`,
                          }
                        : {
                            background: "rgba(255,255,255,0.03)",
                            color: "rgba(148,163,184,0.5)",
                            border: "1px solid rgba(51,65,85,0.8)",
                          }
                    }
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            {(schedulePreset === "Daily" || schedulePreset === "Weekly") && (
              <div>
                <div className="text-[8px] font-mono font-bold tracking-widest text-slate-500 uppercase mb-1">
                  Time (UTC)
                </div>
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => update({ scheduleTime: e.target.value })}
                  className="w-full h-7 px-2 bg-slate-900/80 border border-slate-700 rounded-lg
                    text-[10px] font-mono text-cyan-100 focus:border-cyan-500 focus:outline-none"
                  style={{ colorScheme: "dark" }}
                />
              </div>
            )}
            {schedulePreset === "Custom" && (
              <div>
                <div className="text-[8px] font-mono font-bold tracking-widest text-slate-500 uppercase mb-1">
                  Cron Expression
                </div>
                <input
                  type="text"
                  placeholder="0 */6 * * *"
                  value={cronExpression ?? ""}
                  onChange={(e) => update({ cronExpression: e.target.value })}
                  className="w-full h-7 px-2 bg-slate-900/80 border border-slate-700 rounded-lg
                    text-[10px] font-mono text-cyan-100 focus:border-cyan-500 focus:outline-none placeholder:text-slate-600"
                />
              </div>
            )}
          </div>
        );

      case "price":
        return (
          <div className="space-y-2">
            <div>
              <div className="text-[8px] font-mono font-bold tracking-widest text-slate-500 uppercase mb-1">
                Token
              </div>
              <input
                type="text"
                placeholder="SOL, ETH, BTC..."
                value={token}
                onChange={(e) =>
                  update({ token: e.target.value.toUpperCase() })
                }
                className="w-full h-7 px-2 bg-slate-900/80 border border-slate-700 rounded-lg
                  text-[10px] font-mono text-cyan-100 focus:border-cyan-500 focus:outline-none placeholder:text-slate-600"
              />
            </div>
            <div>
              <div className="text-[8px] font-mono font-bold tracking-widest text-slate-500 uppercase mb-1">
                Condition
              </div>
              <div className="grid grid-cols-2 gap-1">
                {PRICE_CONDITIONS.map((c) => (
                  <button
                    key={c}
                    onClick={() => update({ priceCondition: c })}
                    className="px-2 py-1 rounded-md text-[8px] font-mono font-bold uppercase tracking-wider cursor-pointer transition-all"
                    style={
                      priceCondition === c
                        ? {
                            background: `${accent}22`,
                            color: accent,
                            border: `1px solid ${accent}66`,
                          }
                        : {
                            background: "rgba(255,255,255,0.03)",
                            color: "rgba(148,163,184,0.5)",
                            border: "1px solid rgba(51,65,85,0.8)",
                          }
                    }
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[8px] font-mono font-bold tracking-widest text-slate-500 uppercase mb-1">
                Target Price (USD)
              </div>
              <input
                type="number"
                placeholder="0.00"
                value={priceTarget}
                onChange={(e) => update({ priceTarget: e.target.value })}
                className="w-full h-7 px-2 bg-slate-900/80 border border-slate-700 rounded-lg
                  text-[10px] font-mono text-cyan-100 focus:border-cyan-500 focus:outline-none placeholder:text-slate-600"
              />
            </div>
          </div>
        );

      case "wallet":
        return (
          <div className="space-y-2">
            <div>
              <div className="text-[8px] font-mono font-bold tracking-widest text-slate-500 uppercase mb-1">
                Event Type
              </div>
              <div className="grid grid-cols-2 gap-1">
                {WALLET_EVENTS.map((e) => (
                  <button
                    key={e}
                    onClick={() => update({ walletEvent: e })}
                    className="px-2 py-1 rounded-md text-[8px] font-mono font-bold uppercase tracking-wider cursor-pointer transition-all"
                    style={
                      walletEvent === e
                        ? {
                            background: `${accent}22`,
                            color: accent,
                            border: `1px solid ${accent}66`,
                          }
                        : {
                            background: "rgba(255,255,255,0.03)",
                            color: "rgba(148,163,184,0.5)",
                            border: "1px solid rgba(51,65,85,0.8)",
                          }
                    }
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[8px] font-mono font-bold tracking-widest text-slate-500 uppercase mb-1">
                Min Amount (optional)
              </div>
              <input
                type="number"
                placeholder="0.00"
                value={minAmount}
                onChange={(e) => update({ minAmount: e.target.value })}
                className="w-full h-7 px-2 bg-slate-900/80 border border-slate-700 rounded-lg
                  text-[10px] font-mono text-cyan-100 focus:border-cyan-500 focus:outline-none placeholder:text-slate-600"
              />
            </div>
          </div>
        );

      case "manual":
        return (
          <div className="flex flex-col items-center py-2 gap-2">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: `${accent}18`,
                border: `1px solid ${accent}33`,
              }}
            >
              <Zap className="w-5 h-5" style={{ color: accent }} />
            </div>
            <p className="text-[9px] font-mono text-slate-500 text-center">
              Fires when flow is manually executed from the toolbar
            </p>
          </div>
        );
    }
  };

  const getSummary = () => {
    switch (triggerType) {
      case "schedule":
        if (schedulePreset === "Custom" && cronExpression)
          return cronExpression;
        if (schedulePreset === "Daily") return `Daily at ${scheduleTime} UTC`;
        return schedulePreset;
      case "price":
        return priceTarget
          ? `${token} ${priceCondition} $${priceTarget}`
          : `${token} price watch`;
      case "wallet":
        return minAmount ? `${walletEvent} ≥ ${minAmount}` : walletEvent;
      case "manual":
        return "On demand";
    }
  };

  return (
    <div
      className={`relative min-w-[260px] rounded-2xl overflow-visible transition-all duration-200 ${
        selected ? "ring-2 shadow-2xl" : "ring-1 hover:ring-opacity-50"
      }`}
      style={{
        borderColor: selected ? accent : `${accent}44`,
        boxShadow: selected
          ? `0 0 0 1px ${accent}22, 0 20px 40px -8px ${accent}40`
          : `0 4px 12px -2px ${accent}18`,
        background: "rgba(8, 12, 24, 0.97)",
      }}
    >
      {/* Three-dot menu */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowMenu((v) => !v);
        }}
        className="absolute top-2.5 right-2.5 z-10 w-6 h-6 rounded-md flex items-center justify-center
          bg-white/5 hover:bg-white/10 backdrop-blur-sm transition-all cursor-pointer border border-white/10"
      >
        <MoreVertical className="w-3 h-3 text-white/60" />
      </button>

      {/* Popover */}
      {showMenu && (
        <div
          ref={menuRef}
          className="absolute top-0 left-[calc(100%+10px)] z-[100] w-52 rounded-xl overflow-hidden shadow-2xl"
          style={{
            background: "rgba(10, 15, 30, 0.98)",
            border: "1px solid rgba(148,163,184,0.15)",
            backdropFilter: "blur(24px)",
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Tabs */}
          <div className="flex border-b border-white/10">
            {(["type", "color"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 text-[9px] font-mono font-bold tracking-widest uppercase transition-all cursor-pointer ${
                  activeTab === tab
                    ? "text-cyan-400 border-b-2 border-cyan-400 -mb-[1px]"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="p-3 space-y-3">
            {activeTab === "type" ? (
              <div className="space-y-1">
                {(Object.keys(TRIGGER_TYPES) as TriggerType[]).map((t) => {
                  const cfg = TRIGGER_TYPES[t];
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={t}
                      onClick={() => {
                        update({ triggerType: t });
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg border cursor-pointer transition-all"
                      style={
                        triggerType === t
                          ? {
                              color: cfg.color,
                              borderColor: `${cfg.color}66`,
                              background: `${cfg.color}18`,
                            }
                          : {
                              color: "rgba(148,163,184,0.5)",
                              borderColor: "rgba(51,65,85,0.8)",
                            }
                      }
                    >
                      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                      <div className="text-left">
                        <div className="text-[9px] font-mono font-bold uppercase tracking-wider">
                          {cfg.label}
                        </div>
                        <div className="text-[8px] opacity-60">{cfg.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={accent}
                    onChange={(e) => update({ customColor: e.target.value })}
                    className="w-9 h-9 rounded-lg border-2 border-slate-600 cursor-pointer"
                    style={{ backgroundColor: accent }}
                  />
                  <input
                    type="text"
                    value={accent.toUpperCase()}
                    onChange={(e) => {
                      if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value))
                        update({ customColor: e.target.value });
                    }}
                    className="flex-1 h-8 px-2 bg-slate-900/80 border border-slate-700 rounded-lg
                      text-[10px] font-mono text-cyan-100 focus:border-cyan-500 focus:outline-none"
                    maxLength={7}
                  />
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => update({ customColor: c })}
                      className={`w-full aspect-square rounded-md border-2 transition-all hover:scale-110 cursor-pointer ${
                        accent === c
                          ? "border-white scale-105"
                          : "border-white/10"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                {customColor && (
                  <button
                    onClick={() => {
                      update({ customColor: undefined });
                      setShowMenu(false);
                    }}
                    className="w-full py-1.5 text-[8px] font-mono text-slate-400 hover:text-cyan-400
                      border border-slate-700 hover:border-cyan-500/50 rounded-lg transition-all cursor-pointer"
                  >
                    RESET TO DEFAULT COLOR
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div
        className="px-3 pt-3 pb-2.5 rounded-t-2xl select-none"
        style={{
          background: `linear-gradient(135deg, ${accent}28 0%, ${accent}10 100%)`,
          borderBottom: `1px solid ${accent}22`,
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: `${accent}22`,
              border: `1px solid ${accent}44`,
            }}
          >
            <TriggerIcon className="w-4 h-4" style={{ color: accent }} />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white tracking-wide">
                Trigger
              </span>
              <span
                className="px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-widest"
                style={{ background: `${accent}22`, color: accent }}
              >
                {triggerCfg.label}
              </span>
            </div>
            <span className="text-[9px] font-mono text-slate-500 truncate mt-0.5">
              {getSummary()}
            </span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-3 py-2.5 rounded-b-2xl select-none">
        {renderBody()}

        {/* Footer */}
        <div
          className="flex items-center justify-between mt-2.5 pt-2"
          style={{ borderTop: `1px solid ${accent}18` }}
        >
          <div className="flex items-center gap-1">
            <Activity className="w-2.5 h-2.5" style={{ color: accent }} />
            <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest">
              Entry Point
            </span>
          </div>
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: accent, boxShadow: `0 0 4px ${accent}` }}
          />
        </div>
      </div>

      {/* Source handle only — triggers have no input */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !rounded-full"
        style={{
          background: accent,
          border: `2px solid ${accent}88`,
          boxShadow: `0 0 6px ${accent}66`,
        }}
      />
    </div>
  );
});

TriggerNode.displayName = "TriggerNode";
