"use client";

import { useState, useEffect, useRef } from "react";
import { X, Clock, Trash2, Calendar, Power, Pencil, Check } from "lucide-react";
import { useFlowStore } from "@/lib/hooks/useFlowStore";
import { useWallet } from "@/lib/hooks/useWallet";

interface Schedule {
  scheduleId: string;
  name: string;
  scheduleType: "daily" | "hourly" | "weekly" | "once";
  scheduleTime: string;
  enabled: boolean;
  createdAt: string;
  lastRun?: string;
  nextRun: string;
  runCount: number;
}

function timeUntil(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "now";
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  return `${Math.floor(h / 24)}d`;
}

function timeAgo(iso?: string): string {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

// ── Inline editable name ──────────────────────────────────────────────────────

function EditableName({
  scheduleId,
  name,
  onSave,
}: {
  scheduleId: string;
  name: string;
  onSave: (id: string, name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);
  useEffect(() => {
    setValue(name);
  }, [name]);

  const save = () => {
    const trimmed = value.trim();
    if (trimmed && trimmed !== name) onSave(scheduleId, trimmed);
    else setValue(name);
    setEditing(false);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") save();
    if (e.key === "Escape") {
      setValue(name);
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1 flex-1 min-w-0">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKey}
          onBlur={save}
          className="flex-1 min-w-0 bg-slate-800 border border-cyan-500/40 rounded px-2 py-0.5 text-xs font-mono text-slate-200 focus:outline-none"
          maxLength={40}
        />
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            save();
          }}
          className="w-5 h-5 flex items-center justify-center rounded text-cyan-400 hover:bg-cyan-500/10 transition-colors shrink-0"
        >
          <Check size={11} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 flex-1 min-w-0 group">
      <span className="text-xs font-mono text-slate-200 font-semibold truncate">
        {name}
      </span>
      <button
        onClick={() => setEditing(true)}
        className="w-4 h-4 flex items-center justify-center rounded text-slate-700 hover:text-cyan-400 opacity-0 group-hover:opacity-100 transition-all shrink-0"
        title="Rename"
      >
        <Pencil size={10} />
      </button>
    </div>
  );
}

// ── Main dialog ───────────────────────────────────────────────────────────────

interface ScheduleDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ScheduleDialog({ open, onClose }: ScheduleDialogProps) {
  const { nodes, edges } = useFlowStore();
  const { walletAddress, walletType, isConnected } = useWallet();

  const [tab, setTab] = useState<"create" | "manage">("create");
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [creating, setCreating] = useState(false);

  const [name, setName] = useState("My DeFi Flow");
  const [scheduleType, setScheduleType] = useState<
    "daily" | "hourly" | "weekly" | "once"
  >("daily");
  const [scheduleTime, setScheduleTime] = useState("03:00");

  const fetchSchedules = async () => {
    try {
      const res = await fetch("/api/scheduler");
      if (res.ok) setSchedules((await res.json()).schedules);
    } catch {}
  };

  useEffect(() => {
    if (open) fetchSchedules();
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const id = setInterval(fetchSchedules, 5000);
    return () => clearInterval(id);
  }, [open]);

  const handleCreate = async () => {
    if (!isConnected || !walletAddress) return;
    setCreating(true);
    try {
      const res = await fetch("/api/scheduler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          nodes,
          edges,
          walletAddress,
          walletType,
          scheduleType,
          scheduleTime,
        }),
      });
      if (res.ok) {
        await fetchSchedules();
        setTab("manage");
      }
    } catch {
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (scheduleId: string, enabled: boolean) => {
    await fetch("/api/scheduler", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduleId, enabled }),
    });
    await fetchSchedules();
  };

  const handleDelete = async (scheduleId: string) => {
    await fetch("/api/scheduler", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduleId }),
    });
    await fetchSchedules();
  };

  const handleRename = async (scheduleId: string, newName: string) => {
    await fetch("/api/scheduler", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduleId, name: newName }),
    });
    await fetchSchedules();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: "rgba(5,10,20,0.98)",
          border: "1px solid rgba(56,189,248,0.2)",
          boxShadow: "0 32px 64px rgba(0,0,0,0.9)",
          maxHeight: "85vh",
        }}
      >
        <div
          className="h-px w-full"
          style={{
            background:
              "linear-gradient(90deg, transparent, #22d3ee, #818cf8, transparent)",
          }}
        />

        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(34,211,238,0.15)" }}
            >
              <Clock className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Schedule Flow</h2>
              <p className="text-[10px] text-slate-500 font-mono">
                Auto-run on a schedule
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Tabs */}
        <div
          className="flex gap-1 px-5 py-3"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
        >
          {(["create", "manage"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-4 py-1.5 rounded-lg text-[11px] font-mono font-semibold tracking-wider transition-all capitalize"
              style={{
                background: tab === t ? "rgba(34,211,238,0.1)" : "transparent",
                color: tab === t ? "rgb(34,211,238)" : "rgb(100,116,139)",
                border: `1px solid ${tab === t ? "rgba(34,211,238,0.3)" : "transparent"}`,
              }}
            >
              {t}{" "}
              {t === "manage" &&
                schedules.length > 0 &&
                `(${schedules.length})`}
            </button>
          ))}
        </div>

        {/* CREATE TAB */}
        {tab === "create" && (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {!isConnected && (
              <div className="p-3 rounded-lg text-xs font-mono text-amber-400 border border-amber-500/20 bg-amber-500/5">
                ⚠️ Connect wallet first to schedule flows
              </div>
            )}

            <div>
              <label className="text-[10px] font-mono font-bold tracking-widest text-slate-500 uppercase block mb-1.5">
                Flow Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-9 px-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs font-mono focus:outline-none focus:border-slate-600 transition-colors"
                placeholder="Daily DCA Bot"
              />
            </div>

            <div>
              <label className="text-[10px] font-mono font-bold tracking-widest text-slate-500 uppercase block mb-1.5">
                Frequency
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {(["hourly", "daily", "weekly", "once"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setScheduleType(t)}
                    className="py-2 rounded-lg text-[10px] font-mono font-semibold transition-all capitalize"
                    style={{
                      background:
                        scheduleType === t
                          ? "rgba(34,211,238,0.15)"
                          : "rgba(15,23,42,0.5)",
                      color:
                        scheduleType === t
                          ? "rgb(34,211,238)"
                          : "rgb(100,116,139)",
                      border: `1px solid ${scheduleType === t ? "rgba(34,211,238,0.4)" : "rgba(255,255,255,0.05)"}`,
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {scheduleType !== "hourly" && (
              <div>
                <label className="text-[10px] font-mono font-bold tracking-widest text-slate-500 uppercase block mb-1.5">
                  Time (24h)
                </label>
                <input
                  type="text"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  placeholder="03:00"
                  maxLength={5}
                  className="w-full h-9 px-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs font-mono focus:outline-none focus:border-slate-600 transition-colors"
                />
              </div>
            )}

            <div
              className="p-3 rounded-lg"
              style={{
                background: "rgba(34,211,238,0.04)",
                border: "1px solid rgba(34,211,238,0.1)",
              }}
            >
              <div className="text-[10px] font-mono text-slate-500 mb-1">
                PREVIEW
              </div>
              <div className="text-xs font-mono text-cyan-400">
                {scheduleType === "hourly" && "Runs every hour"}
                {scheduleType === "daily" && `Runs daily at ${scheduleTime}`}
                {scheduleType === "weekly" && `Runs weekly at ${scheduleTime}`}
                {scheduleType === "once" && "Runs once in ~1 minute"}
              </div>
              <div className="text-[10px] font-mono text-slate-600 mt-1">
                {nodes.length} nodes will be executed
              </div>
            </div>

            <button
              onClick={handleCreate}
              disabled={!isConnected || nodes.length === 0 || creating}
              className="w-full h-10 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
              style={{
                background:
                  !isConnected || nodes.length === 0
                    ? "rgba(34,211,238,0.1)"
                    : "linear-gradient(135deg, #22d3ee, #818cf8)",
                color:
                  !isConnected || nodes.length === 0
                    ? "rgba(34,211,238,0.4)"
                    : "white",
                border: "none",
                cursor:
                  !isConnected || nodes.length === 0
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              <Calendar size={15} />
              {creating ? "Scheduling…" : "Create Schedule"}
            </button>
          </div>
        )}

        {/* MANAGE TAB */}
        {tab === "manage" && (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
            {schedules.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2">
                <Clock className="w-6 h-6 text-slate-700" />
                <span className="text-xs font-mono text-slate-600">
                  No scheduled flows yet
                </span>
              </div>
            ) : (
              schedules.map((schedule) => (
                <div
                  key={schedule.scheduleId}
                  className="rounded-xl overflow-hidden"
                  style={{
                    background: "rgba(8,12,28,0.8)",
                    border: `1px solid ${schedule.enabled ? "rgba(34,211,238,0.2)" : "rgba(255,255,255,0.06)"}`,
                  }}
                >
                  <div className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {/* Editable name */}
                        <div className="flex items-center gap-2 mb-1.5">
                          <div
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${schedule.enabled ? "bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]" : "bg-slate-700"}`}
                          />
                          <EditableName
                            scheduleId={schedule.scheduleId}
                            name={schedule.name}
                            onSave={handleRename}
                          />
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-mono text-slate-600 capitalize">
                            {schedule.scheduleType}{" "}
                            {schedule.scheduleTime &&
                              `@ ${schedule.scheduleTime}`}
                          </span>
                          <span className="text-[10px] font-mono text-slate-700">
                            ·
                          </span>
                          <span className="text-[10px] font-mono text-slate-600">
                            {schedule.runCount} runs
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          {schedule.enabled ? (
                            <span className="text-[10px] font-mono text-cyan-500">
                              next in {timeUntil(schedule.nextRun)}
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-slate-600">
                              paused
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-slate-700">
                            ·
                          </span>
                          <span className="text-[10px] font-mono text-slate-600">
                            last {timeAgo(schedule.lastRun)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() =>
                            handleToggle(schedule.scheduleId, !schedule.enabled)
                          }
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                          style={{
                            background: schedule.enabled
                              ? "rgba(34,211,238,0.1)"
                              : "rgba(255,255,255,0.04)",
                            color: schedule.enabled
                              ? "rgb(34,211,238)"
                              : "rgb(100,116,139)",
                            border: `1px solid ${schedule.enabled ? "rgba(34,211,238,0.2)" : "rgba(255,255,255,0.06)"}`,
                          }}
                          title={schedule.enabled ? "Pause" : "Resume"}
                        >
                          <Power size={12} />
                        </button>
                        <button
                          onClick={() => handleDelete(schedule.scheduleId)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
