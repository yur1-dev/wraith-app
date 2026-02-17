"use client";

import { useState } from "react";
import { X, Zap, ChevronRight, Users, Fuel } from "lucide-react";
import {
  TEMPLATES,
  CATEGORIES,
  DIFFICULTY_STYLES,
  NODE_EMOJIS,
  type FlowTemplate,
  type Category,
} from "@/lib/template";
import { useFlowStore } from "@/lib/hooks/useFlowStore";
import type { Node } from "@xyflow/react";

interface TemplatesGalleryProps {
  open: boolean;
  onClose: () => void;
}

export function TemplatesGallery({ open, onClose }: TemplatesGalleryProps) {
  const { setNodes, setEdges } = useFlowStore();
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [preview, setPreview] = useState<FlowTemplate | null>(null);
  const [justLoaded, setJustLoaded] = useState<string | null>(null);

  if (!open) return null;

  const filtered: FlowTemplate[] =
    activeCategory === "all"
      ? TEMPLATES
      : TEMPLATES.filter((t) => t.category === activeCategory);

  const handleLoad = (template: FlowTemplate) => {
    setNodes(template.nodes);
    setEdges(template.edges);
    setJustLoaded(template.id);
    setTimeout(() => {
      setJustLoaded(null);
      onClose();
    }, 800);
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{
        zIndex: 99998,
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(10px)",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full flex rounded-2xl overflow-hidden"
        style={{
          maxWidth: preview ? 900 : 680,
          maxHeight: "88vh",
          background: "rgba(5, 10, 20, 0.99)",
          border: "1px solid rgba(56,189,248,0.15)",
          boxShadow:
            "0 0 0 1px rgba(56,189,248,0.05), 0 40px 80px rgba(0,0,0,0.9)",
          transition: "max-width 0.3s ease",
        }}
      >
        {/* ── LEFT PANEL ─────────────────────────────────── */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Top accent line */}
          <div
            className="h-px w-full shrink-0"
            style={{
              background:
                "linear-gradient(90deg, transparent, #22d3ee, #818cf8, transparent)",
            }}
          />

          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-4 shrink-0"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(34,211,238,0.1)" }}
              >
                <Zap className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">
                  Template Gallery
                </h2>
                <p className="text-[10px] text-slate-500">
                  {TEMPLATES.length} pre-built flows ready to use
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "transparent",
                border: "none",
                color: "rgba(148,163,184,0.5)",
                cursor: "pointer",
              }}
            >
              <X size={15} />
            </button>
          </div>

          {/* Category tabs */}
          <div
            className="flex gap-1 px-5 py-3 shrink-0 overflow-x-auto"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
          >
            {CATEGORIES.map((cat: Category) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                  background:
                    activeCategory === cat.id
                      ? "rgba(34,211,238,0.12)"
                      : "transparent",
                  border:
                    activeCategory === cat.id
                      ? "1px solid rgba(34,211,238,0.25)"
                      : "1px solid transparent",
                  color:
                    activeCategory === cat.id
                      ? "#22d3ee"
                      : "rgba(148,163,184,0.6)",
                  transition: "all 0.15s",
                }}
              >
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Template list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filtered.map((template: FlowTemplate) => {
              const diff = DIFFICULTY_STYLES[template.difficulty];
              const isActive = preview?.id === template.id;
              const isLoaded = justLoaded === template.id;

              return (
                <div
                  key={template.id}
                  onClick={() => setPreview(isActive ? null : template)}
                  className="rounded-xl overflow-hidden"
                  style={{
                    background: isActive
                      ? "rgba(34,211,238,0.04)"
                      : "rgba(15,20,35,0.6)",
                    border: isActive
                      ? `1px solid ${template.color}40`
                      : "1px solid rgba(255,255,255,0.05)",
                    transform: isActive ? "scale(1.005)" : "scale(1)",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {/* Color top bar */}
                  <div
                    style={{
                      height: 2,
                      background: template.color,
                      opacity: isActive ? 1 : 0.4,
                    }}
                  />

                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Emoji icon */}
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 12,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 20,
                          flexShrink: 0,
                          background: `${template.color}15`,
                          border: `1px solid ${template.color}25`,
                        }}
                      >
                        {template.emoji}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-white">
                            {template.name}
                          </span>
                          <span
                            style={{
                              fontSize: 9,
                              fontFamily: "monospace",
                              padding: "2px 6px",
                              borderRadius: 4,
                              textTransform: "capitalize",
                              background: diff.bg,
                              border: `1px solid ${diff.border}`,
                              color: diff.text,
                            }}
                          >
                            {template.difficulty}
                          </span>
                        </div>

                        <p
                          style={{
                            fontSize: 11,
                            color: "rgba(148,163,184,0.7)",
                            lineHeight: 1.5,
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {template.description}
                        </p>

                        {/* Stats */}
                        <div
                          style={{
                            display: "flex",
                            gap: 12,
                            marginTop: 8,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                              fontSize: 10,
                              color: "rgba(100,116,139,0.8)",
                            }}
                          >
                            <Users size={9} />
                            {template.nodes.length} nodes
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                              fontSize: 10,
                              color: "rgba(100,116,139,0.8)",
                            }}
                          >
                            <Fuel size={9} />
                            {template.estimatedGas}
                          </div>
                        </div>

                        {/* Tags */}
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 4,
                            marginTop: 8,
                          }}
                        >
                          {template.tags.slice(0, 4).map((tag: string) => (
                            <span
                              key={tag}
                              style={{
                                fontSize: 9,
                                padding: "2px 6px",
                                borderRadius: 4,
                                fontFamily: "monospace",
                                background: "rgba(255,255,255,0.04)",
                                border: "1px solid rgba(255,255,255,0.08)",
                                color: "rgba(148,163,184,0.5)",
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Arrow */}
                      <ChevronRight
                        size={14}
                        style={{
                          flexShrink: 0,
                          color: isActive
                            ? template.color
                            : "rgba(148,163,184,0.3)",
                          transform: isActive
                            ? "rotate(90deg)"
                            : "rotate(0deg)",
                          transition: "transform 0.2s, color 0.2s",
                        }}
                      />
                    </div>

                    {/* Load button - only when active */}
                    {isActive && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLoad(template);
                        }}
                        style={{
                          marginTop: 12,
                          width: "100%",
                          height: 36,
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 600,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          cursor: "pointer",
                          background: isLoaded
                            ? "rgba(34,197,94,0.15)"
                            : `${template.color}18`,
                          border: isLoaded
                            ? "1px solid rgba(34,197,94,0.35)"
                            : `1px solid ${template.color}35`,
                          color: isLoaded ? "#22c55e" : template.color,
                          transition: "all 0.15s",
                        }}
                      >
                        {isLoaded ? (
                          "✅ Loaded! Opening canvas..."
                        ) : (
                          <>
                            <Zap size={12} />
                            Use This Template
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── RIGHT PANEL - Preview ─────────────────────── */}
        {preview && (
          <div
            style={{
              width: 260,
              flexShrink: 0,
              borderLeft: "1px solid rgba(255,255,255,0.06)",
              background: "rgba(8,12,24,0.8)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Preview header */}
            <div
              style={{
                padding: "16px",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 4,
                }}
              >
                <span style={{ fontSize: 22 }}>{preview.emoji}</span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "white",
                  }}
                >
                  {preview.name}
                </span>
              </div>
              <p
                style={{
                  fontSize: 10,
                  color: "rgba(100,116,139,0.8)",
                  lineHeight: 1.5,
                }}
              >
                {preview.description}
              </p>
            </div>

            {/* Node flow */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "16px",
              }}
            >
              <p
                style={{
                  fontSize: 9,
                  color: "rgba(100,116,139,0.6)",
                  fontFamily: "monospace",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: 12,
                }}
              >
                Execution Flow
              </p>

              <div style={{ position: "relative" }}>
                {/* Vertical line */}
                <div
                  style={{
                    position: "absolute",
                    left: 15,
                    top: 16,
                    bottom: 16,
                    width: 1,
                    background: `linear-gradient(180deg, ${preview.color}40, transparent)`,
                  }}
                />

                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  {preview.nodes.map((node: Node, i: number) => (
                    <div
                      key={node.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 13,
                          flexShrink: 0,
                          zIndex: 1,
                          background: `${preview.color}15`,
                          border: `1px solid ${preview.color}30`,
                        }}
                      >
                        {NODE_EMOJIS[node.type ?? ""] ?? "⚙️"}
                      </div>
                      <div>
                        <p
                          style={{
                            fontSize: 11,
                            color: "rgba(203,213,225,0.9)",
                            fontWeight: 500,
                          }}
                        >
                          {String(node.data?.label ?? node.type ?? "Node")}
                        </p>
                        <p
                          style={{
                            fontSize: 9,
                            color: "rgba(100,116,139,0.6)",
                            fontFamily: "monospace",
                            textTransform: "capitalize",
                          }}
                        >
                          {node.type}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Load CTA */}
            <div
              style={{
                padding: "16px",
                borderTop: "1px solid rgba(255,255,255,0.05)",
                flexShrink: 0,
              }}
            >
              <button
                onClick={() => handleLoad(preview)}
                style={{
                  width: "100%",
                  height: 40,
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  cursor: "pointer",
                  border: "none",
                  background:
                    justLoaded === preview.id
                      ? "rgba(34,197,94,0.2)"
                      : `linear-gradient(135deg, ${preview.color}, ${preview.color}bb)`,
                  color: justLoaded === preview.id ? "#22c55e" : "white",
                  boxShadow: `0 0 20px ${preview.color}30`,
                }}
              >
                {justLoaded === preview.id ? (
                  "✅ Loading..."
                ) : (
                  <>
                    <Zap size={13} />
                    Load Template
                  </>
                )}
              </button>
              <p
                style={{
                  fontSize: 9,
                  color: "rgba(100,116,139,0.5)",
                  textAlign: "center",
                  marginTop: 8,
                }}
              >
                {preview.nodes.length} nodes · {preview.edges.length}{" "}
                connections
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
