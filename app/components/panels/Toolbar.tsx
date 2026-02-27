"use client";

import {
  Clock,
  Wallet,
  ArrowLeftRight,
  Shuffle,
  Network,
  Bell,
  GitBranch,
  Wallet2,
  TrendingUp,
  Twitter,
  MessageCircle,
  Trophy,
  Repeat,
  Gift,
  Timer,
  RotateCw,
  DollarSign,
  Fuel,
  Menu,
  X,
} from "lucide-react";
import { useFlowStore } from "@/lib/hooks/useFlowStore";
import { useState, useEffect } from "react";
import { useReactFlow } from "@xyflow/react";

export function Toolbar() {
  const addNode = useFlowStore((state) => state.addNode);
  const { screenToFlowPosition } = useReactFlow();
  const [activeCategory, setActiveCategory] = useState<
    "core" | "defi" | "social"
  >("core");
  // Mobile: sidebar collapsed by default
  const [isOpen, setIsOpen] = useState(false);
  // Track viewport width for responsive behavior
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // On desktop, always open; on mobile start closed
      if (!mobile) setIsOpen(true);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const categories = {
    core: [
      { type: "trigger", icon: Clock, label: "Trigger" },
      { type: "multiWallet", icon: Wallet, label: "Multi-Wallet" },
      { type: "swap", icon: ArrowLeftRight, label: "Swap" },
      { type: "bridge", icon: Shuffle, label: "Bridge" },
      { type: "chainSwitch", icon: Network, label: "Chain" },
      { type: "alert", icon: Bell, label: "Alert" },
      { type: "condition", icon: GitBranch, label: "Condition" },
      { type: "walletConnect", icon: Wallet2, label: "Wallet" },
    ],
    defi: [
      { type: "lendStake", icon: TrendingUp, label: "Lend/Stake" },
      { type: "volumeFarmer", icon: Repeat, label: "Volume" },
      { type: "claimAirdrop", icon: Gift, label: "Claim" },
      { type: "priceCheck", icon: DollarSign, label: "Price" },
      { type: "gasOptimizer", icon: Fuel, label: "Gas" },
      { type: "waitDelay", icon: Timer, label: "Wait" },
      { type: "loop", icon: RotateCw, label: "Loop" },
    ],
    social: [
      { type: "twitter", icon: Twitter, label: "Twitter" },
      { type: "discord", icon: MessageCircle, label: "Discord" },
      { type: "galxe", icon: Trophy, label: "Galxe" },
    ],
  };

  const handleAddNode = (type: string) => {
    const position = screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
    addNode({ id: `${type}-${Date.now()}`, type, position, data: {} });
    // Auto-close sidebar on mobile after adding a node
    if (isMobile) setIsOpen(false);
  };

  return (
    <>
      {/* ── Mobile toggle button ── */}
      {isMobile && (
        <button
          onClick={() => setIsOpen((v) => !v)}
          style={{
            position: "absolute",
            top: 64,
            left: isOpen ? 212 : 16,
            zIndex: 20,
            width: 36,
            height: 36,
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: isOpen
              ? "rgba(34, 211, 238, 0.15)"
              : "rgba(15, 23, 42, 0.85)",
            border: isOpen
              ? "1px solid rgba(34, 211, 238, 0.4)"
              : "1px solid rgba(34, 211, 238, 0.2)",
            backdropFilter: "blur(12px)",
            color: "rgb(34, 211, 238)",
            cursor: "pointer",
            transition: "left 0.25s ease, background 0.15s",
            boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
          }}
          aria-label={isOpen ? "Close sidebar" : "Open node sidebar"}
        >
          {isOpen ? <X size={16} /> : <Menu size={16} />}
        </button>
      )}

      {/* ── Mobile backdrop overlay ── */}
      {isMobile && isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9,
            background: "rgba(0,0,0,0.4)",
            backdropFilter: "blur(2px)",
          }}
        />
      )}

      {/* ── Sidebar panel ── */}
      <div
        style={{
          position: "absolute",
          top: isMobile ? 56 : 64,
          left: isMobile ? (isOpen ? 0 : -220) : 16,
          zIndex: 10,
          width: 200,
          borderRadius: isMobile ? "0 12px 12px 0" : 12,
          overflow: "hidden",
          backdropFilter: "blur(24px)",
          background: "rgba(10, 15, 35, 0.97)",
          border: "1px solid rgba(34, 211, 238, 0.15)",
          boxShadow:
            "0 20px 40px rgba(0,0,0,0.6), 0 0 20px rgba(34,211,238,0.05)",
          transition: "left 0.25s ease",
          // On desktop always shown; on mobile animate in/out
          ...(isMobile ? {} : { position: "absolute" as const }),
        }}
      >
        {/* Category Tabs */}
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid var(--color-border)",
            background: "var(--color-muted)",
          }}
        >
          {(["core", "defi", "social"] as const).map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              style={{
                flex: 1,
                height: 36,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.05em",
                textTransform: "capitalize",
                border: "none",
                borderBottom:
                  activeCategory === category
                    ? "2px solid rgb(34 211 238)"
                    : "2px solid transparent",
                background:
                  activeCategory === category
                    ? "rgba(34, 211, 238, 0.08)"
                    : "transparent",
                color:
                  activeCategory === category
                    ? "rgb(34 211 238)"
                    : "var(--color-muted-foreground)",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Node Buttons */}
        <div
          style={{
            padding: 8,
            maxHeight: isMobile ? "calc(100vh - 120px)" : "calc(100vh - 240px)",
            overflowY: "auto",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {categories[activeCategory].map((node) => (
              <button
                key={node.type}
                onClick={() => handleAddNode(node.type)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  width: "100%",
                  height: 36,
                  padding: "0 10px",
                  borderRadius: 8,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "rgba(34, 211, 238, 0.08)";
                  const icon = e.currentTarget.querySelector(
                    ".node-icon",
                  ) as HTMLElement;
                  const label = e.currentTarget.querySelector(
                    ".node-label",
                  ) as HTMLElement;
                  if (icon) icon.style.color = "rgb(34 211 238)";
                  if (label) label.style.color = "var(--color-foreground)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "transparent";
                  const icon = e.currentTarget.querySelector(
                    ".node-icon",
                  ) as HTMLElement;
                  const label = e.currentTarget.querySelector(
                    ".node-label",
                  ) as HTMLElement;
                  if (icon) icon.style.color = "var(--color-muted-foreground)";
                  if (label)
                    label.style.color = "var(--color-muted-foreground)";
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 7,
                    marginRight: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(34, 211, 238, 0.08)",
                    border: "1px solid rgba(34, 211, 238, 0.15)",
                    flexShrink: 0,
                    transition: "background 0.15s",
                  }}
                >
                  <node.icon
                    className="node-icon"
                    style={{
                      width: 14,
                      height: 14,
                      color: "var(--color-muted-foreground)",
                      transition: "color 0.15s",
                    }}
                  />
                </div>
                <span
                  className="node-label"
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: "var(--color-muted-foreground)",
                    transition: "color 0.15s",
                  }}
                >
                  {node.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
