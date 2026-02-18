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
} from "lucide-react";
import { useFlowStore } from "@/lib/hooks/useFlowStore";
import { useState } from "react";

export function Toolbar() {
  const addNode = useFlowStore((state) => state.addNode);
  const [activeCategory, setActiveCategory] = useState<
    "core" | "defi" | "social"
  >("core");

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
    addNode({
      id: `${type}-${Date.now()}`,
      type,
      position: {
        x: Math.random() * 400 + 200,
        y: Math.random() * 300 + 150,
      },
      data: {},
    });
  };

  return (
    <div
      className="absolute top-16 left-4 z-10 glass rounded-xl overflow-hidden shadow-2xl w-[200px]"
      style={{ backdropFilter: "blur(24px)" }}
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
          maxHeight: "calc(100vh - 240px)",
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
                if (label) label.style.color = "var(--color-muted-foreground)";
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
  );
}
