"use client";

import { memo, useState, useEffect, useRef } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  Bell,
  BellRing,
  MoreVertical,
  MessageSquare,
  Send,
  Mail,
  Webhook,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
} from "lucide-react";
import { useFlowStore } from "@/lib/hooks/useFlowStore";
import { useTelegram } from "@/lib/hooks/useTelegram";

const ALERT_CHANNELS = {
  Telegram: { icon: Send, color: "#229ed9", label: "Telegram" },
  Discord: { icon: MessageSquare, color: "#5865f2", label: "Discord" },
  Email: { icon: Mail, color: "#ea4335", label: "Email" },
  Webhook: { icon: Webhook, color: "#10b981", label: "Webhook" },
} as const;

type AlertChannel = keyof typeof ALERT_CHANNELS;

const SEVERITY_CONFIG = {
  info: { icon: Bell, color: "#38bdf8", label: "Info", pulse: false },
  success: {
    icon: CheckCircle2,
    color: "#34d399",
    label: "Success",
    pulse: false,
  },
  warning: {
    icon: AlertTriangle,
    color: "#fbbf24",
    label: "Warning",
    pulse: true,
  },
  urgent: { icon: BellRing, color: "#f87171", label: "Urgent", pulse: true },
} as const;

type Severity = keyof typeof SEVERITY_CONFIG;

const PRESET_COLORS = [
  "#f59e0b",
  "#f97316",
  "#ef4444",
  "#ec4899",
  "#a855f7",
  "#6366f1",
  "#3b82f6",
  "#06b6d4",
  "#10b981",
  "#84cc16",
];

export const AlertNode = memo(({ data, selected, id }: NodeProps) => {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const { isConnected: tgConnected, openBot } = useTelegram();

  const alertType = (data.alertType as AlertChannel) ?? "Telegram";
  const severity = (data.severity as Severity) ?? "info";
  const message = String(data.message ?? "Flow completed successfully!");
  const customColor = data.customColor as string | undefined;
  const cooldown = Number(data.cooldown ?? 0);

  const channel = ALERT_CHANNELS[alertType] ?? ALERT_CHANNELS.Telegram;
  const sev = SEVERITY_CONFIG[severity] ?? SEVERITY_CONFIG.info;
  const accent = customColor || sev.color;

  const ChannelIcon = channel.icon;
  const SeverityIcon = sev.icon;

  const [showMenu, setShowMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<"color" | "settings">("color");
  const [pulsing, setPulsing] = useState(false);
  const pulseRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const close = () => setShowMenu(false);
    window.addEventListener("closeColorMenus", close);
    return () => window.removeEventListener("closeColorMenus", close);
  }, []);

  useEffect(() => {
    if (sev.pulse && selected) {
      pulseRef.current = setInterval(() => setPulsing((p) => !p), 800);
    } else {
      if (pulseRef.current) clearInterval(pulseRef.current);
      setPulsing(false);
    }
    return () => {
      if (pulseRef.current) clearInterval(pulseRef.current);
    };
  }, [sev.pulse, selected]);

  const update = (patch: Record<string, unknown>) => updateNodeData(id, patch);

  const isReady = alertType === "Telegram" ? tgConnected : message.length > 0;

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
      {/* ── Three-dot menu ── */}
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

      {/* ── Popover ── */}
      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-[90]"
            onClick={() => setShowMenu(false)}
            onMouseDown={() => setShowMenu(false)}
          />
          <div
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
              {(["color", "settings"] as const).map((tab) => (
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
              {activeTab === "color" ? (
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
                      RESET TO SEVERITY COLOR
                    </button>
                  )}
                </>
              ) : (
                <>
                  {/* Severity */}
                  <div>
                    <div className="text-[8px] font-mono font-bold tracking-widest text-slate-500 uppercase mb-1.5">
                      Severity
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {(Object.keys(SEVERITY_CONFIG) as Severity[]).map((s) => {
                        const cfg = SEVERITY_CONFIG[s];
                        const Icon = cfg.icon;
                        return (
                          <button
                            key={s}
                            onClick={() => update({ severity: s })}
                            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-[9px] font-mono
                              font-bold uppercase tracking-wider cursor-pointer transition-all`}
                            style={
                              severity === s
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
                            <Icon className="w-3 h-3" />
                            {cfg.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Channel */}
                  <div>
                    <div className="text-[8px] font-mono font-bold tracking-widest text-slate-500 uppercase mb-1.5">
                      Channel
                    </div>
                    <div className="space-y-1">
                      {(Object.keys(ALERT_CHANNELS) as AlertChannel[]).map(
                        (ch) => {
                          const cfg = ALERT_CHANNELS[ch];
                          const Icon = cfg.icon;
                          return (
                            <button
                              key={ch}
                              onClick={() => update({ alertType: ch })}
                              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg border text-[9px]
                              font-mono font-bold uppercase tracking-wider cursor-pointer transition-all"
                              style={
                                alertType === ch
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
                              <Icon className="w-3 h-3" />
                              {cfg.label}
                            </button>
                          );
                        },
                      )}
                    </div>
                  </div>

                  {/* Cooldown */}
                  <div>
                    <div className="text-[8px] font-mono font-bold tracking-widest text-slate-500 uppercase mb-1.5">
                      Cooldown (s)
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <input
                        type="number"
                        min={0}
                        value={cooldown}
                        onChange={(e) =>
                          update({ cooldown: Number(e.target.value) })
                        }
                        className="flex-1 h-7 px-2 bg-slate-900/80 border border-slate-700 rounded-lg
                          text-[10px] font-mono text-cyan-100 focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Header ── */}
      <div
        className="px-3 pt-3 pb-2.5 rounded-t-2xl select-none"
        style={{
          background: `linear-gradient(135deg, ${accent}28 0%, ${accent}10 100%)`,
          borderBottom: `1px solid ${accent}22`,
        }}
      >
        <div className="flex items-center gap-2.5">
          <div className="relative flex-shrink-0">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{
                background: `${accent}22`,
                border: `1px solid ${accent}44`,
              }}
            >
              <SeverityIcon className="w-4 h-4" style={{ color: accent }} />
            </div>
            {sev.pulse && (
              <span
                className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full"
                style={{
                  backgroundColor: accent,
                  boxShadow: `0 0 6px ${accent}`,
                  opacity: pulsing ? 1 : 0.3,
                  transition: "opacity 0.4s ease",
                }}
              />
            )}
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white tracking-wide">
                Alert
              </span>
              <span
                className="px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-widest"
                style={{ background: `${accent}22`, color: accent }}
              >
                {sev.label}
              </span>
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <ChannelIcon
                className="w-2.5 h-2.5"
                style={{ color: channel.color }}
              />
              <span
                className="text-[9px] font-mono"
                style={{ color: channel.color }}
              >
                {channel.label}
              </span>
              {cooldown > 0 && (
                <>
                  <span className="text-slate-600 mx-0.5">·</span>
                  <Clock className="w-2.5 h-2.5 text-slate-500" />
                  <span className="text-[9px] font-mono text-slate-500">
                    {cooldown}s
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="px-3 py-2.5 rounded-b-2xl select-none">
        {/* Telegram connection banner */}
        {alertType === "Telegram" && (
          <div
            className="mb-2 rounded-lg px-2.5 py-2 flex items-center justify-between gap-2"
            style={{
              background: tgConnected
                ? "rgba(34,197,94,0.08)"
                : "rgba(34,158,217,0.08)",
              border: `1px solid ${tgConnected ? "rgba(34,197,94,0.2)" : "rgba(34,158,217,0.2)"}`,
            }}
          >
            <div className="flex items-center gap-1.5">
              <div
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: tgConnected ? "#22c55e" : "#229ed9",
                  boxShadow: `0 0 4px ${tgConnected ? "#22c55e" : "#229ed9"}`,
                }}
              />
              <span
                className="text-[9px] font-mono"
                style={{ color: tgConnected ? "#22c55e" : "#229ed9" }}
              >
                {tgConnected ? "Bot connected" : "Not connected"}
              </span>
            </div>
            {!tgConnected && (
              <button
                onClick={openBot}
                className="flex items-center gap-1 text-[8px] font-mono font-bold uppercase tracking-widest
                  text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
              >
                Connect <ExternalLink className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        )}

        {/* Message preview */}
        <div
          className="rounded-lg px-2.5 py-2 text-[10px] text-slate-300 leading-relaxed font-mono line-clamp-3"
          style={{
            background: `${accent}08`,
            border: `1px solid ${accent}18`,
          }}
        >
          <span className="text-slate-500">"</span>
          {message}
          <span className="text-slate-500">"</span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1">
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: isReady ? accent : "#475569",
                boxShadow: isReady ? `0 0 4px ${accent}` : "none",
                opacity: pulsing ? 1 : 0.6,
                transition: "opacity 0.4s",
              }}
            />
            <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest">
              {isReady
                ? "Ready"
                : alertType === "Telegram"
                  ? "Needs bot"
                  : "No message"}
            </span>
          </div>
          <span className="text-[8px] font-mono text-slate-600">
            {message.length} chars
          </span>
        </div>
      </div>

      {/* ── Handles ── */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !rounded-full"
        style={{
          background: accent,
          border: `2px solid ${accent}88`,
          boxShadow: `0 0 6px ${accent}66`,
        }}
      />
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

AlertNode.displayName = "AlertNode";
