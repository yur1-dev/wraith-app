"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Save,
  FolderOpen,
  Trash2,
  X,
  Plus,
  Check,
  Loader2,
  CloudOff,
} from "lucide-react";
import { useFlowStore } from "@/lib/hooks/useFlowStore";

interface FlowMeta {
  id: string;
  name: string;
  nodeCount: number;
  edgeCount: number;
  savedAt: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

// ── Save Panel ────────────────────────────────────────────────────────────────
function SavePanel({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const { nodes, edges } = useFlowStore();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const id = `flow_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const res = await fetch("/api/flows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name: name.trim(), nodes, edges }),
      });
      if (!res.ok) throw new Error("Save failed");
      onSaved();
      onClose();
    } catch (e) {
      setError("Failed to save. Check your connection.");
    }
    setSaving(false);
  };

  return (
    <div className="p-3 space-y-3">
      <div className="text-[9px] font-mono font-bold tracking-widest text-slate-500 uppercase">
        Flow Name
      </div>
      <input
        autoFocus
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSave()}
        placeholder="My DeFi Flow..."
        className="w-full h-8 px-3 rounded-lg text-[11px] font-mono text-cyan-100 focus:outline-none transition-colors"
        style={{
          background: "rgba(2,6,23,0.9)",
          border: "1px solid rgba(51,65,85,0.8)",
        }}
        onFocus={(e) => (e.target.style.borderColor = "#22d3ee")}
        onBlur={(e) => (e.target.style.borderColor = "rgba(51,65,85,0.8)")}
      />
      <div className="text-[8px] font-mono text-slate-600">
        {nodes.length} nodes · {edges.length} edges
      </div>
      {error && (
        <div className="text-[9px] font-mono text-red-400 flex items-center gap-1.5">
          <CloudOff className="w-3 h-3" /> {error}
        </div>
      )}
      <button
        onClick={handleSave}
        disabled={!name.trim() || saving}
        className="w-full h-8 rounded-lg flex items-center justify-center gap-2 text-[9px] font-mono font-bold uppercase tracking-widest cursor-pointer transition-all disabled:opacity-40"
        style={{
          background: "rgba(34,211,238,0.12)",
          border: "1px solid rgba(34,211,238,0.3)",
          color: "#22d3ee",
        }}
      >
        {saving ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Save className="w-3 h-3" />
        )}
        {saving ? "Saving..." : "Save Flow"}
      </button>
    </div>
  );
}

// ── Load Panel ────────────────────────────────────────────────────────────────
function LoadPanel({ onClose }: { onClose: () => void }) {
  const { setNodes, setEdges, clearFlow } = useFlowStore();
  const [flows, setFlows] = useState<FlowMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchFlows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/flows");
      const data = await res.json();
      setFlows(data.flows ?? []);
    } catch {
      setError("Failed to load flows");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchFlows();
  }, [fetchFlows]);

  const handleLoad = async (id: string) => {
    setLoadingId(id);
    try {
      const res = await fetch(`/api/flows?id=${id}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      clearFlow();
      setTimeout(() => {
        setNodes(data.nodes ?? []);
        setEdges(data.edges ?? []);
        onClose();
      }, 50);
    } catch {
      setError("Failed to load flow");
    }
    setLoadingId(null);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleting(id);
    try {
      await fetch(`/api/flows?id=${id}`, { method: "DELETE" });
      setFlows((prev) => prev.filter((f) => f.id !== id));
    } catch {
      setError("Failed to delete");
    }
    setDeleting(null);
  };

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
        <span className="text-[10px] font-mono text-slate-500">
          loading flows...
        </span>
      </div>
    );
  }

  if (flows.length === 0) {
    return (
      <div className="p-4 text-center">
        <div className="text-[10px] font-mono text-slate-600">
          no saved flows yet
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 space-y-1 max-h-72 overflow-y-auto">
      {error && (
        <div className="px-2 py-1 text-[9px] font-mono text-red-400">
          {error}
        </div>
      )}
      {flows.map((flow) => (
        <button
          key={flow.id}
          onClick={() => handleLoad(flow.id)}
          disabled={!!loadingId}
          className="w-full px-3 py-2.5 rounded-lg text-left transition-all cursor-pointer group"
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(51,65,85,0.5)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              "rgba(34,211,238,0.06)";
            (e.currentTarget as HTMLButtonElement).style.borderColor =
              "rgba(34,211,238,0.2)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              "rgba(255,255,255,0.02)";
            (e.currentTarget as HTMLButtonElement).style.borderColor =
              "rgba(51,65,85,0.5)";
          }}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-mono font-bold text-slate-200 truncate">
                {flow.name}
              </div>
              <div className="text-[8px] font-mono text-slate-600 mt-0.5">
                {flow.nodeCount} nodes · {flow.edgeCount} edges ·{" "}
                {timeAgo(flow.savedAt)}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {loadingId === flow.id ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
              ) : (
                <Check className="w-3.5 h-3.5 text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
              <button
                onClick={(e) => handleDelete(flow.id, e)}
                disabled={deleting === flow.id}
                className="w-5 h-5 rounded flex items-center justify-center transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                style={{ color: "#f87171" }}
              >
                {deleting === flow.id ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Trash2 className="w-3 h-3" />
                )}
              </button>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function FlowPersistence() {
  const [panel, setPanel] = useState<"save" | "load" | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  const handleSaved = () => {
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  };

  const toggle = (p: "save" | "load") => {
    setPanel((prev) => (prev === p ? null : p));
  };

  return (
    <div className="relative flex items-center gap-1">
      {/* Save button */}
      <button
        onClick={() => toggle("save")}
        className="h-8 px-3 rounded-lg flex items-center gap-1.5 text-[9px] font-mono font-bold uppercase tracking-widest cursor-pointer transition-all"
        style={
          panel === "save"
            ? {
                background: "rgba(34,211,238,0.15)",
                border: "1px solid rgba(34,211,238,0.4)",
                color: "#22d3ee",
              }
            : savedFlash
              ? {
                  background: "rgba(52,211,153,0.15)",
                  border: "1px solid rgba(52,211,153,0.4)",
                  color: "#34d399",
                }
              : {
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(51,65,85,0.6)",
                  color: "rgba(148,163,184,0.7)",
                }
        }
      >
        {savedFlash ? (
          <Check className="w-3 h-3" />
        ) : (
          <Save className="w-3 h-3" />
        )}
        {savedFlash ? "Saved!" : "Save"}
      </button>

      {/* Load button */}
      <button
        onClick={() => toggle("load")}
        className="h-8 px-3 rounded-lg flex items-center gap-1.5 text-[9px] font-mono font-bold uppercase tracking-widest cursor-pointer transition-all"
        style={
          panel === "load"
            ? {
                background: "rgba(34,211,238,0.15)",
                border: "1px solid rgba(34,211,238,0.4)",
                color: "#22d3ee",
              }
            : {
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(51,65,85,0.6)",
                color: "rgba(148,163,184,0.7)",
              }
        }
      >
        <FolderOpen className="w-3 h-3" />
        Flows
      </button>

      {/* Dropdown panel */}
      {panel && (
        <>
          <div
            className="fixed inset-0 z-[90]"
            onClick={() => setPanel(null)}
          />
          <div
            className="absolute top-[calc(100%+6px)] right-0 z-[100] w-72 rounded-xl overflow-hidden shadow-2xl"
            style={{
              background: "rgba(2,6,23,0.98)",
              border: "1px solid rgba(34,211,238,0.2)",
              boxShadow:
                "0 25px 50px rgba(0,0,0,0.8), 0 0 24px rgba(34,211,238,0.08)",
              backdropFilter: "blur(24px)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Accent line */}
            <div
              className="h-px w-full"
              style={{
                background:
                  "linear-gradient(90deg, rgba(34,211,238,0.8), transparent 60%)",
              }}
            />

            {/* Header */}
            <div
              className="flex items-center justify-between px-3 py-2.5 border-b"
              style={{ borderColor: "rgba(34,211,238,0.1)" }}
            >
              <div className="flex gap-1">
                {(["save", "load"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPanel(p)}
                    className="px-3 py-1 rounded-md text-[9px] font-mono font-bold uppercase tracking-widest cursor-pointer transition-all"
                    style={
                      panel === p
                        ? {
                            background: "rgba(34,211,238,0.15)",
                            color: "#22d3ee",
                            border: "1px solid rgba(34,211,238,0.3)",
                          }
                        : {
                            color: "rgba(100,116,139,0.6)",
                            border: "1px solid transparent",
                          }
                    }
                  >
                    {p === "save" ? (
                      <>
                        <Save className="w-2.5 h-2.5 inline mr-1" />
                        Save
                      </>
                    ) : (
                      <>
                        <FolderOpen className="w-2.5 h-2.5 inline mr-1" />
                        Load
                      </>
                    )}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setPanel(null)}
                className="w-5 h-5 rounded flex items-center justify-center text-slate-500 hover:text-slate-300 cursor-pointer transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            {panel === "save" && (
              <SavePanel onClose={() => setPanel(null)} onSaved={handleSaved} />
            )}
            {panel === "load" && <LoadPanel onClose={() => setPanel(null)} />}
          </div>
        </>
      )}
    </div>
  );
}
