import type { Node, Edge } from "@xyflow/react";

export interface FlowTemplate {
  id: string;
  name: string;
  description: string;
  category: "farming" | "trading" | "social" | "yield" | "airdrop";
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedGas: string;
  tags: string[];
  emoji: string;
  color: string;
  nodes: Node[];
  edges: Edge[];
}

export interface Category {
  id: string;
  label: string;
  emoji: string;
}

export const DIFFICULTY_STYLES: Record<
  "beginner" | "intermediate" | "advanced",
  { bg: string; border: string; text: string }
> = {
  beginner: {
    bg: "rgba(34,197,94,0.1)",
    border: "rgba(34,197,94,0.25)",
    text: "#22c55e",
  },
  intermediate: {
    bg: "rgba(245,158,11,0.1)",
    border: "rgba(245,158,11,0.25)",
    text: "#f59e0b",
  },
  advanced: {
    bg: "rgba(239,68,68,0.1)",
    border: "rgba(239,68,68,0.25)",
    text: "#ef4444",
  },
};

export const NODE_EMOJIS: Record<string, string> = {
  trigger: "⏰",
  multiWallet: "👥",
  swap: "🔄",
  bridge: "🌉",
  chainSwitch: "🔀",
  alert: "🔔",
  condition: "🔀",
  walletConnect: "👛",
  lendStake: "🏦",
  twitter: "🐦",
  discord: "💬",
  galxe: "🌐",
  volumeFarmer: "📊",
  claimAirdrop: "🪂",
  waitDelay: "⏳",
  loop: "🔁",
  priceCheck: "💲",
  gasOptimizer: "⛽",
};

export const CATEGORIES: Category[] = [
  { id: "all", label: "All Templates", emoji: "✨" },
  { id: "farming", label: "Farming", emoji: "🌾" },
  { id: "trading", label: "Trading", emoji: "📈" },
  { id: "yield", label: "Yield", emoji: "🏦" },
  { id: "airdrop", label: "Airdrop", emoji: "🪂" },
  { id: "social", label: "Social", emoji: "📱" },
];

export const TEMPLATES: FlowTemplate[] = [
  // ── 1. LayerZero Farmer ──────────────────────────────────
  {
    id: "layerzero-farmer",
    name: "LayerZero Farmer",
    description:
      "Automatically bridge assets across 5 chains daily to farm the LayerZero airdrop. Runs across 10 wallets sequentially.",
    category: "farming",
    difficulty: "intermediate",
    estimatedGas: "~$2-5 per wallet",
    tags: ["LayerZero", "Bridge", "Multi-wallet", "Daily"],
    emoji: "🌉",
    color: "#06b6d4",
    nodes: [
      {
        id: "t1",
        type: "trigger",
        position: { x: 300, y: 50 },
        data: {
          label: "Daily Trigger",
          scheduleType: "daily",
          scheduleTime: "03:00",
        },
      },
      {
        id: "t2",
        type: "multiWallet",
        position: { x: 300, y: 180 },
        data: {
          label: "10 Farm Wallets",
          wallets: [],
          executeSequentially: true,
          delayBetween: 30,
        },
      },
      {
        id: "t3",
        type: "bridge",
        position: { x: 300, y: 310 },
        data: {
          label: "Bridge ETH → ARB",
          fromChain: "ethereum",
          toChain: "arbitrum",
          bridgeProtocol: "layerzero",
          amount: "0.01",
        },
      },
      {
        id: "t4",
        type: "swap",
        position: { x: 300, y: 440 },
        data: {
          label: "Swap on Arbitrum",
          fromToken: "ETH",
          toToken: "USDC",
          amount: "0.005",
          dex: "uniswap",
          slippage: 0.5,
        },
      },
      {
        id: "t5",
        type: "bridge",
        position: { x: 300, y: 570 },
        data: {
          label: "Bridge ARB → OP",
          fromChain: "arbitrum",
          toChain: "optimism",
          bridgeProtocol: "layerzero",
          amount: "0.005",
        },
      },
      {
        id: "t6",
        type: "alert",
        position: { x: 300, y: 700 },
        data: {
          label: "Telegram Alert",
          alertType: "telegram",
          message: "✅ LayerZero farming complete!",
        },
      },
    ],
    edges: [
      { id: "e1-2", source: "t1", target: "t2", animated: true },
      { id: "e2-3", source: "t2", target: "t3", animated: true },
      { id: "e3-4", source: "t3", target: "t4", animated: true },
      { id: "e4-5", source: "t4", target: "t5", animated: true },
      { id: "e5-6", source: "t5", target: "t6", animated: true },
    ],
  },

  // ── 2. Daily DCA ─────────────────────────────────────────
  {
    id: "daily-dca",
    name: "Daily DCA Bot",
    description:
      "Dollar-cost average into ETH and SOL every day at 9AM. Set it and forget it — automatic wealth building on autopilot.",
    category: "trading",
    difficulty: "beginner",
    estimatedGas: "~$1-3 per day",
    tags: ["DCA", "ETH", "SOL", "Daily"],
    emoji: "💰",
    color: "#10b981",
    nodes: [
      {
        id: "d1",
        type: "trigger",
        position: { x: 300, y: 50 },
        data: {
          label: "Daily 9AM",
          scheduleType: "daily",
          scheduleTime: "09:00",
        },
      },
      {
        id: "d2",
        type: "swap",
        position: { x: 150, y: 200 },
        data: {
          label: "Buy ETH",
          fromToken: "USDC",
          toToken: "ETH",
          amount: "100",
          dex: "uniswap",
          slippage: 0.5,
        },
      },
      {
        id: "d3",
        type: "swap",
        position: { x: 450, y: 200 },
        data: {
          label: "Buy SOL",
          fromToken: "USDC",
          toToken: "SOL",
          amount: "100",
          dex: "jupiter",
          slippage: 0.5,
        },
      },
      {
        id: "d4",
        type: "waitDelay",
        position: { x: 300, y: 340 },
        data: { label: "Wait 5s", duration: 5, unit: "seconds" },
      },
      {
        id: "d5",
        type: "alert",
        position: { x: 300, y: 460 },
        data: {
          label: "Daily Report",
          alertType: "telegram",
          message: "📈 DCA done! Bought $100 ETH + $100 SOL",
        },
      },
    ],
    edges: [
      { id: "e1-2", source: "d1", target: "d2", animated: true },
      { id: "e1-3", source: "d1", target: "d3", animated: true },
      { id: "e2-4", source: "d2", target: "d4", animated: true },
      { id: "e3-4", source: "d3", target: "d4", animated: true },
      { id: "e4-5", source: "d4", target: "d5", animated: true },
    ],
  },

  // ── 3. Volume Farmer ─────────────────────────────────────
  {
    id: "volume-farmer",
    name: "DEX Volume Farmer",
    description:
      "Generate trading volume on DEXs to qualify for airdrops. Loops swaps back and forth to hit volume targets automatically.",
    category: "farming",
    difficulty: "intermediate",
    estimatedGas: "~$5-15 per session",
    tags: ["Volume", "DEX", "Loop", "Airdrop"],
    emoji: "📊",
    color: "#f59e0b",
    nodes: [
      {
        id: "v1",
        type: "trigger",
        position: { x: 300, y: 50 },
        data: { label: "Manual Trigger", scheduleType: "manual" },
      },
      {
        id: "v2",
        type: "gasOptimizer",
        position: { x: 300, y: 180 },
        data: { label: "Wait Low Gas", maxGas: 20, timeout: 60 },
      },
      {
        id: "v3",
        type: "loop",
        position: { x: 300, y: 310 },
        data: {
          label: "Repeat 10x",
          iterations: 10,
          breakCondition: "on_error",
        },
      },
      {
        id: "v4",
        type: "swap",
        position: { x: 150, y: 440 },
        data: {
          label: "USDC → ETH",
          fromToken: "USDC",
          toToken: "ETH",
          amount: "500",
          dex: "uniswap",
          slippage: 1,
        },
      },
      {
        id: "v5",
        type: "waitDelay",
        position: { x: 300, y: 440 },
        data: {
          label: "Random Wait",
          duration: 30,
          unit: "seconds",
          randomize: true,
          randomRange: 50,
        },
      },
      {
        id: "v6",
        type: "swap",
        position: { x: 450, y: 440 },
        data: {
          label: "ETH → USDC",
          fromToken: "ETH",
          toToken: "USDC",
          amount: "0.15",
          dex: "uniswap",
          slippage: 1,
        },
      },
      {
        id: "v7",
        type: "alert",
        position: { x: 300, y: 580 },
        data: {
          label: "Volume Report",
          alertType: "telegram",
          message: "📊 Volume farming done! $5000 generated.",
        },
      },
    ],
    edges: [
      { id: "e1-2", source: "v1", target: "v2", animated: true },
      { id: "e2-3", source: "v2", target: "v3", animated: true },
      { id: "e3-4", source: "v3", target: "v4", animated: true },
      { id: "e4-5", source: "v4", target: "v5", animated: true },
      { id: "e5-6", source: "v5", target: "v6", animated: true },
      { id: "e6-7", source: "v6", target: "v7", animated: true },
    ],
  },

  // ── 4. Yield Optimizer ───────────────────────────────────
  {
    id: "yield-optimizer",
    name: "Yield Optimizer",
    description:
      "Automatically move funds to the highest APY protocol. Checks AAVE vs Compound every 4 hours and rebalances if needed.",
    category: "yield",
    difficulty: "advanced",
    estimatedGas: "~$3-8 per rebalance",
    tags: ["AAVE", "Compound", "APY", "Auto-compound"],
    emoji: "🏦",
    color: "#8b5cf6",
    nodes: [
      {
        id: "y1",
        type: "trigger",
        position: { x: 300, y: 50 },
        data: {
          label: "Every 4 Hours",
          scheduleType: "interval",
          intervalHours: 4,
        },
      },
      {
        id: "y2",
        type: "priceCheck",
        position: { x: 150, y: 180 },
        data: {
          label: "Check AAVE APY",
          token: "USDC",
          priceSource: "aave",
          checkType: "apy",
        },
      },
      {
        id: "y3",
        type: "priceCheck",
        position: { x: 450, y: 180 },
        data: {
          label: "Check Comp APY",
          token: "USDC",
          priceSource: "compound",
          checkType: "apy",
        },
      },
      {
        id: "y4",
        type: "condition",
        position: { x: 300, y: 320 },
        data: {
          label: "AAVE Better?",
          conditionType: "compare",
          operator: ">",
          value: "2",
        },
      },
      {
        id: "y5",
        type: "lendStake",
        position: { x: 150, y: 450 },
        data: {
          label: "Move to AAVE",
          actionType: "deposit",
          protocol: "aave",
          token: "USDC",
          amount: "all",
        },
      },
      {
        id: "y6",
        type: "lendStake",
        position: { x: 450, y: 450 },
        data: {
          label: "Stay Compound",
          actionType: "compound",
          protocol: "compound",
          token: "USDC",
          amount: "rewards",
        },
      },
      {
        id: "y7",
        type: "alert",
        position: { x: 300, y: 580 },
        data: {
          label: "Rebalance Alert",
          alertType: "telegram",
          message: "🏦 Yield rebalanced! Check dashboard.",
        },
      },
    ],
    edges: [
      { id: "e1-2", source: "y1", target: "y2", animated: true },
      { id: "e1-3", source: "y1", target: "y3", animated: true },
      { id: "e2-4", source: "y2", target: "y4", animated: true },
      { id: "e3-4", source: "y3", target: "y4", animated: true },
      {
        id: "e4-5",
        source: "y4",
        target: "y5",
        animated: true,
        sourceHandle: "true",
      },
      {
        id: "e4-6",
        source: "y4",
        target: "y6",
        animated: true,
        sourceHandle: "false",
      },
      { id: "e5-7", source: "y5", target: "y7", animated: true },
      { id: "e6-7", source: "y6", target: "y7", animated: true },
    ],
  },

  // ── 5. Airdrop Hunter ────────────────────────────────────
  {
    id: "airdrop-hunter",
    name: "Airdrop Hunter",
    description:
      "Complete all on-chain + social tasks for maximum airdrop eligibility. Bridges, swaps, Twitter, Discord — all automated.",
    category: "airdrop",
    difficulty: "advanced",
    estimatedGas: "~$10-20 per wallet",
    tags: ["Airdrop", "Twitter", "Discord", "Bridge", "Multi-wallet"],
    emoji: "🪂",
    color: "#f43f5e",
    nodes: [
      {
        id: "a1",
        type: "trigger",
        position: { x: 300, y: 50 },
        data: {
          label: "Daily 6AM",
          scheduleType: "daily",
          scheduleTime: "06:00",
        },
      },
      {
        id: "a2",
        type: "multiWallet",
        position: { x: 300, y: 180 },
        data: {
          label: "Farm Wallets",
          wallets: [],
          executeSequentially: true,
          delayBetween: 60,
        },
      },
      {
        id: "a3",
        type: "swap",
        position: { x: 150, y: 320 },
        data: {
          label: "On-chain Swap",
          fromToken: "ETH",
          toToken: "USDC",
          amount: "0.01",
          dex: "uniswap",
          slippage: 1,
        },
      },
      {
        id: "a4",
        type: "bridge",
        position: { x: 450, y: 320 },
        data: {
          label: "Cross-chain Tx",
          fromChain: "ethereum",
          toChain: "arbitrum",
          bridgeProtocol: "layerzero",
          amount: "0.005",
        },
      },
      {
        id: "a5",
        type: "twitter",
        position: { x: 150, y: 460 },
        data: {
          label: "Twitter Tasks",
          taskType: "follow",
          target: "@project_handle",
        },
      },
      {
        id: "a6",
        type: "discord",
        position: { x: 450, y: 460 },
        data: {
          label: "Join Discord",
          taskType: "join",
          serverId: "project_discord",
        },
      },
      {
        id: "a7",
        type: "galxe",
        position: { x: 300, y: 600 },
        data: { label: "Complete Galxe", campaignName: "Project Campaign" },
      },
      {
        id: "a8",
        type: "alert",
        position: { x: 300, y: 730 },
        data: {
          label: "Done Alert",
          alertType: "telegram",
          message: "🪂 All airdrop tasks complete!",
        },
      },
    ],
    edges: [
      { id: "e1-2", source: "a1", target: "a2", animated: true },
      { id: "e2-3", source: "a2", target: "a3", animated: true },
      { id: "e2-4", source: "a2", target: "a4", animated: true },
      { id: "e3-5", source: "a3", target: "a5", animated: true },
      { id: "e4-6", source: "a4", target: "a6", animated: true },
      { id: "e5-7", source: "a5", target: "a7", animated: true },
      { id: "e6-7", source: "a6", target: "a7", animated: true },
      { id: "e7-8", source: "a7", target: "a8", animated: true },
    ],
  },
];
