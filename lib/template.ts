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

  // ── 6. SOL Auto-Compounder ───────────────────────────────
  {
    id: "sol-compounder",
    name: "SOL Auto-Compounder",
    description:
      "Stake SOL on Jito weekly and automatically restake all rewards to compound your yield. Fully hands-off passive income.",
    category: "yield",
    difficulty: "beginner",
    estimatedGas: "~$0.001 per tx",
    tags: ["Solana", "Jito", "Staking", "Compound", "Passive"],
    emoji: "🔁",
    color: "#10b981",
    nodes: [
      {
        id: "sc1",
        type: "trigger",
        position: { x: 300, y: 50 },
        data: {
          label: "Weekly Sunday",
          scheduleType: "weekly",
          scheduleTime: "00:00",
        },
      },
      {
        id: "sc2",
        type: "lendStake",
        position: { x: 300, y: 180 },
        data: {
          label: "Stake SOL",
          actionType: "stake",
          protocol: "jito",
          token: "SOL",
          amount: "10",
        },
      },
      {
        id: "sc3",
        type: "waitDelay",
        position: { x: 300, y: 310 },
        data: { label: "Wait 7 Days", duration: 7, unit: "days" },
      },
      {
        id: "sc4",
        type: "lendStake",
        position: { x: 300, y: 440 },
        data: {
          label: "Restake Rewards",
          actionType: "stake",
          protocol: "jito",
          token: "SOL",
          amount: "auto",
        },
      },
      {
        id: "sc5",
        type: "alert",
        position: { x: 300, y: 570 },
        data: {
          label: "Weekly Report",
          alertType: "telegram",
          message: "🔁 SOL rewards compounded on Jito!",
        },
      },
    ],
    edges: [
      { id: "e1-2", source: "sc1", target: "sc2", animated: true },
      { id: "e2-3", source: "sc2", target: "sc3", animated: true },
      { id: "e3-4", source: "sc3", target: "sc4", animated: true },
      { id: "e4-5", source: "sc4", target: "sc5", animated: true },
    ],
  },

  // ── 7. Crash Protection ──────────────────────────────────
  {
    id: "crash-protection",
    name: "Crash Protection",
    description:
      "Auto stop-loss: if ETH drops below your price target, immediately exit everything to USDC and fire an urgent Telegram alert.",
    category: "trading",
    difficulty: "intermediate",
    estimatedGas: "~$5-15",
    tags: ["Stop-loss", "ETH", "Protection", "Price Alert"],
    emoji: "🛡️",
    color: "#ef4444",
    nodes: [
      {
        id: "cp1",
        type: "trigger",
        position: { x: 300, y: 50 },
        data: {
          label: "ETH < $2000",
          scheduleType: "price",
          token: "ETH",
          priceCondition: "Below",
          priceTarget: "2000",
        },
      },
      {
        id: "cp2",
        type: "gasOptimizer",
        position: { x: 300, y: 180 },
        data: {
          label: "Fast Execute",
          maxGas: 50,
          strategy: "flashbots",
          chain: "ethereum",
          timeout: 5,
        },
      },
      {
        id: "cp3",
        type: "swap",
        position: { x: 300, y: 310 },
        data: {
          label: "Exit to USDC",
          fromToken: "ETH",
          toToken: "USDC",
          amount: "100%",
          dex: "uniswap",
          slippage: 3,
        },
      },
      {
        id: "cp4",
        type: "alert",
        position: { x: 300, y: 440 },
        data: {
          label: "🚨 URGENT",
          alertType: "telegram",
          message: "🚨 STOP LOSS HIT — Sold all ETH to USDC!",
          severity: "urgent",
        },
      },
    ],
    edges: [
      { id: "e1-2", source: "cp1", target: "cp2", animated: true },
      { id: "e2-3", source: "cp2", target: "cp3", animated: true },
      { id: "e3-4", source: "cp3", target: "cp4", animated: true },
    ],
  },

  // ── 8. Galxe + Twitter Grind ─────────────────────────────
  {
    id: "galxe-twitter-grind",
    name: "Galxe + Twitter Grind",
    description:
      "Complete Galxe campaign tasks and Twitter actions across multiple wallets daily to maximize airdrop points and eligibility.",
    category: "social",
    difficulty: "intermediate",
    estimatedGas: "~$2-5",
    tags: ["Galxe", "Twitter", "Social", "Multi-wallet", "Points"],
    emoji: "🎯",
    color: "#a78bfa",
    nodes: [
      {
        id: "gt1",
        type: "trigger",
        position: { x: 300, y: 50 },
        data: {
          label: "Daily 10AM",
          scheduleType: "daily",
          scheduleTime: "10:00",
        },
      },
      {
        id: "gt2",
        type: "multiWallet",
        position: { x: 300, y: 180 },
        data: {
          label: "Farm Wallets",
          wallets: [],
          executeSequentially: false,
          delayBetween: 15,
        },
      },
      {
        id: "gt3",
        type: "twitter",
        position: { x: 150, y: 320 },
        data: {
          label: "Retweet + Follow",
          taskType: "retweet",
          target: "@project",
        },
      },
      {
        id: "gt4",
        type: "galxe",
        position: { x: 450, y: 320 },
        data: {
          label: "Galxe Tasks",
          campaignName: "Campaign",
          action: "complete",
        },
      },
      {
        id: "gt5",
        type: "waitDelay",
        position: { x: 300, y: 460 },
        data: {
          label: "Human Delay",
          duration: 2,
          unit: "hours",
          randomize: true,
          randomRange: 15,
        },
      },
      {
        id: "gt6",
        type: "alert",
        position: { x: 300, y: 590 },
        data: {
          label: "Done",
          alertType: "telegram",
          message: "🎯 Social tasks complete for all wallets",
        },
      },
    ],
    edges: [
      { id: "e1-2", source: "gt1", target: "gt2", animated: true },
      { id: "e2-3", source: "gt2", target: "gt3", animated: true },
      { id: "e2-4", source: "gt2", target: "gt4", animated: true },
      { id: "e3-5", source: "gt3", target: "gt5", animated: true },
      { id: "e4-5", source: "gt4", target: "gt5", animated: true },
      { id: "e5-6", source: "gt5", target: "gt6", animated: true },
    ],
  },

  // ── 9. ETH Dip Buyer ─────────────────────────────────────
  {
    id: "eth-dip-buyer",
    name: "ETH Dip Buyer",
    description:
      "Watch ETH price and auto-buy when it drops below your target. Gas optimizer ensures best execution with low slippage.",
    category: "trading",
    difficulty: "intermediate",
    estimatedGas: "~$3-8",
    tags: ["ETH", "Buy the dip", "Price alert", "Uniswap"],
    emoji: "📉",
    color: "#3b82f6",
    nodes: [
      {
        id: "eb1",
        type: "trigger",
        position: { x: 300, y: 50 },
        data: {
          label: "ETH < $2800",
          scheduleType: "price",
          token: "ETH",
          priceCondition: "Below",
          priceTarget: "2800",
        },
      },
      {
        id: "eb2",
        type: "gasOptimizer",
        position: { x: 300, y: 180 },
        data: {
          label: "Wait Low Gas",
          maxGas: 25,
          strategy: "wait",
          chain: "ethereum",
          timeout: 60,
        },
      },
      {
        id: "eb3",
        type: "swap",
        position: { x: 300, y: 310 },
        data: {
          label: "Buy ETH",
          fromToken: "USDC",
          toToken: "ETH",
          amount: "200",
          dex: "uniswap",
          slippage: 0.5,
        },
      },
      {
        id: "eb4",
        type: "alert",
        position: { x: 300, y: 440 },
        data: {
          label: "Bought!",
          alertType: "telegram",
          message: "🟢 Bought ETH at dip — $200 USDC swapped!",
          severity: "success",
        },
      },
    ],
    edges: [
      { id: "e1-2", source: "eb1", target: "eb2", animated: true },
      { id: "e2-3", source: "eb2", target: "eb3", animated: true },
      { id: "e3-4", source: "eb3", target: "eb4", animated: true },
    ],
  },

  // ── 10. Discord Daily Grind ───────────────────────────────
  {
    id: "discord-grind",
    name: "Discord Daily Grind",
    description:
      "Join target Discord servers and complete daily interaction tasks across wallets. Randomized delays keep activity looking human.",
    category: "social",
    difficulty: "beginner",
    estimatedGas: "~$0",
    tags: ["Discord", "Social", "Daily", "Multi-wallet", "Airdrop"],
    emoji: "💬",
    color: "#818cf8",
    nodes: [
      {
        id: "dg1",
        type: "trigger",
        position: { x: 300, y: 50 },
        data: {
          label: "Daily 8AM",
          scheduleType: "daily",
          scheduleTime: "08:00",
        },
      },
      {
        id: "dg2",
        type: "multiWallet",
        position: { x: 300, y: 180 },
        data: {
          label: "Farm Wallets",
          wallets: [],
          executeSequentially: true,
          delayBetween: 30,
        },
      },
      {
        id: "dg3",
        type: "discord",
        position: { x: 300, y: 310 },
        data: {
          label: "Post GM",
          taskType: "message",
          serverId: "",
          channelId: "",
          message: "gm! 🌅",
        },
      },
      {
        id: "dg4",
        type: "waitDelay",
        position: { x: 300, y: 440 },
        data: {
          label: "Human Delay",
          duration: 30,
          unit: "seconds",
          randomize: true,
          randomRange: 50,
        },
      },
      {
        id: "dg5",
        type: "discord",
        position: { x: 300, y: 570 },
        data: {
          label: "React to Post",
          taskType: "react",
          serverId: "",
          channelId: "",
        },
      },
      {
        id: "dg6",
        type: "alert",
        position: { x: 300, y: 700 },
        data: {
          label: "Done",
          alertType: "telegram",
          message: "💬 Discord grind complete for today!",
        },
      },
    ],
    edges: [
      { id: "e1-2", source: "dg1", target: "dg2", animated: true },
      { id: "e2-3", source: "dg2", target: "dg3", animated: true },
      { id: "e3-4", source: "dg3", target: "dg4", animated: true },
      { id: "e4-5", source: "dg4", target: "dg5", animated: true },
      { id: "e5-6", source: "dg5", target: "dg6", animated: true },
    ],
  },

  // ── 11. Wallet Inflow Alert ───────────────────────────────
  {
    id: "wallet-inflow",
    name: "Wallet Inflow Alert",
    description:
      "Watch your wallet for incoming transactions above a minimum amount and get instant Telegram notifications.",
    category: "trading",
    difficulty: "beginner",
    estimatedGas: "~$0",
    tags: ["Wallet", "Alert", "Monitoring", "Telegram", "Passive"],
    emoji: "📥",
    color: "#22d3ee",
    nodes: [
      {
        id: "wi1",
        type: "trigger",
        position: { x: 300, y: 50 },
        data: {
          label: "On Incoming TX",
          scheduleType: "wallet",
          walletEvent: "Incoming TX",
          minAmount: "10",
        },
      },
      {
        id: "wi2",
        type: "alert",
        position: { x: 300, y: 200 },
        data: {
          label: "Telegram Alert",
          alertType: "telegram",
          message: "📥 New incoming transaction on your wallet!",
          severity: "info",
        },
      },
    ],
    edges: [{ id: "e1-2", source: "wi1", target: "wi2", animated: true }],
  },

  // ── 12. Arb Opportunity Watcher ──────────────────────────
  {
    id: "arb-watcher",
    name: "Arb Opportunity Watcher",
    description:
      "Monitor token prices across two chains every hour. If spread exceeds threshold, fire an urgent Telegram alert to act fast.",
    category: "trading",
    difficulty: "advanced",
    estimatedGas: "~$0",
    tags: ["Arbitrage", "Price check", "Multi-chain", "Alert"],
    emoji: "⚡",
    color: "#f97316",
    nodes: [
      {
        id: "aw1",
        type: "trigger",
        position: { x: 300, y: 50 },
        data: { label: "Hourly", scheduleType: "interval", intervalHours: 1 },
      },
      {
        id: "aw2",
        type: "priceCheck",
        position: { x: 150, y: 180 },
        data: { label: "ETH Mainnet", token: "ETH", priceSource: "chainlink" },
      },
      {
        id: "aw3",
        type: "priceCheck",
        position: { x: 450, y: 180 },
        data: {
          label: "ETH Arbitrum",
          token: "ETH",
          priceSource: "dexscreener",
        },
      },
      {
        id: "aw4",
        type: "condition",
        position: { x: 300, y: 320 },
        data: {
          label: "Spread > 0.5%?",
          conditionType: "custom",
          expression: "abs(price1 - price2) / price1 > 0.005",
        },
      },
      {
        id: "aw5",
        type: "alert",
        position: { x: 300, y: 450 },
        data: {
          label: "🚨 Arb Alert",
          alertType: "telegram",
          message: "🚨 ARB OPPORTUNITY — act fast!",
          severity: "urgent",
        },
      },
    ],
    edges: [
      { id: "e1-2", source: "aw1", target: "aw2", animated: true },
      { id: "e1-3", source: "aw1", target: "aw3", animated: true },
      { id: "e2-4", source: "aw2", target: "aw4", animated: true },
      { id: "e3-4", source: "aw3", target: "aw4", animated: true },
      { id: "e4-5", source: "aw4", target: "aw5", animated: true },
    ],
  },

  // ── 13. Bridge & Swap ─────────────────────────────────────
  {
    id: "eth-arb-bridge-swap",
    name: "ETH → Arbitrum + Swap",
    description:
      "Bridge USDC from Ethereum to Arbitrum via Stargate, wait for confirmation, then swap into ETH on Arbitrum.",
    category: "farming",
    difficulty: "intermediate",
    estimatedGas: "~$8-20",
    tags: ["Bridge", "Arbitrum", "Stargate", "USDC", "L2"],
    emoji: "🌉",
    color: "#06b6d4",
    nodes: [
      {
        id: "cb1",
        type: "trigger",
        position: { x: 300, y: 50 },
        data: { label: "Manual", scheduleType: "manual" },
      },
      {
        id: "cb2",
        type: "bridge",
        position: { x: 300, y: 180 },
        data: {
          label: "Bridge USDC",
          fromChain: "ethereum",
          toChain: "arbitrum",
          bridgeProtocol: "stargate",
          token: "USDC",
          amount: "500",
        },
      },
      {
        id: "cb3",
        type: "waitDelay",
        position: { x: 300, y: 310 },
        data: { label: "Wait Bridge", duration: 3, unit: "minutes" },
      },
      {
        id: "cb4",
        type: "swap",
        position: { x: 300, y: 440 },
        data: {
          label: "Buy ETH on Arb",
          fromToken: "USDC",
          toToken: "ETH",
          amount: "500",
          dex: "uniswap",
          slippage: 0.5,
        },
      },
      {
        id: "cb5",
        type: "alert",
        position: { x: 300, y: 570 },
        data: {
          label: "Done",
          alertType: "telegram",
          message: "🌉 Bridge complete — ETH bought on Arbitrum!",
        },
      },
    ],
    edges: [
      { id: "e1-2", source: "cb1", target: "cb2", animated: true },
      { id: "e2-3", source: "cb2", target: "cb3", animated: true },
      { id: "e3-4", source: "cb3", target: "cb4", animated: true },
      { id: "e4-5", source: "cb4", target: "cb5", animated: true },
    ],
  },

  // ── 14. Airdrop Claim & Sell ──────────────────────────────
  {
    id: "airdrop-claim-sell",
    name: "Airdrop Claim & Sell",
    description:
      "Auto-claim an airdrop when eligible, immediately swap the token to USDC, and get a Telegram notification.",
    category: "airdrop",
    difficulty: "intermediate",
    estimatedGas: "~$5-15",
    tags: ["Airdrop", "Claim", "Sell", "USDC", "Auto"],
    emoji: "🎁",
    color: "#f43f5e",
    nodes: [
      {
        id: "acs1",
        type: "trigger",
        position: { x: 300, y: 50 },
        data: {
          label: "Daily Check",
          scheduleType: "daily",
          scheduleTime: "12:00",
        },
      },
      {
        id: "acs2",
        type: "claimAirdrop",
        position: { x: 300, y: 180 },
        data: {
          label: "Claim Drop",
          projectName: "Project",
          contractAddress: "",
          chain: "ethereum",
          autoSell: false,
        },
      },
      {
        id: "acs3",
        type: "condition",
        position: { x: 300, y: 310 },
        data: {
          label: "Claimed?",
          conditionType: "balance",
          operator: ">",
          value: "0",
        },
      },
      {
        id: "acs4",
        type: "swap",
        position: { x: 300, y: 440 },
        data: {
          label: "Sell Token",
          fromToken: "TOKEN",
          toToken: "USDC",
          amount: "100%",
          dex: "uniswap",
          slippage: 2,
        },
      },
      {
        id: "acs5",
        type: "alert",
        position: { x: 300, y: 570 },
        data: {
          label: "Notify",
          alertType: "telegram",
          message: "🪂 Airdrop claimed and sold for USDC!",
          severity: "success",
        },
      },
    ],
    edges: [
      { id: "e1-2", source: "acs1", target: "acs2", animated: true },
      { id: "e2-3", source: "acs2", target: "acs3", animated: true },
      { id: "e3-4", source: "acs3", target: "acs4", animated: true },
      { id: "e4-5", source: "acs4", target: "acs5", animated: true },
    ],
  },

  // ── 15. Weekly Portfolio Rebalancer ──────────────────────
  {
    id: "portfolio-rebalancer",
    name: "Weekly Rebalancer",
    description:
      "Every Sunday rebalance your portfolio: sell half ETH into USDC, bridge a portion to Arbitrum, and stake the rest on Lido.",
    category: "yield",
    difficulty: "advanced",
    estimatedGas: "~$20-40",
    tags: ["Rebalance", "Portfolio", "ETH", "Lido", "Weekly"],
    emoji: "⚖️",
    color: "#e879f9",
    nodes: [
      {
        id: "pr1",
        type: "trigger",
        position: { x: 300, y: 50 },
        data: {
          label: "Weekly Sunday",
          scheduleType: "weekly",
          scheduleTime: "00:00",
        },
      },
      {
        id: "pr2",
        type: "swap",
        position: { x: 300, y: 180 },
        data: {
          label: "ETH → USDC 50%",
          fromToken: "ETH",
          toToken: "USDC",
          amount: "50%",
          dex: "uniswap",
          slippage: 0.5,
        },
      },
      {
        id: "pr3",
        type: "bridge",
        position: { x: 150, y: 330 },
        data: {
          label: "Bridge to Arb",
          fromChain: "ethereum",
          toChain: "arbitrum",
          bridgeProtocol: "stargate",
          token: "USDC",
          amount: "50%",
        },
      },
      {
        id: "pr4",
        type: "lendStake",
        position: { x: 450, y: 330 },
        data: {
          label: "Stake ETH",
          actionType: "stake",
          protocol: "lido",
          token: "ETH",
          amount: "50%",
        },
      },
      {
        id: "pr5",
        type: "alert",
        position: { x: 300, y: 480 },
        data: {
          label: "Weekly Report",
          alertType: "telegram",
          message: "⚖️ Weekly rebalance complete!",
        },
      },
    ],
    edges: [
      { id: "e1-2", source: "pr1", target: "pr2", animated: true },
      { id: "e2-3", source: "pr2", target: "pr3", animated: true },
      { id: "e2-4", source: "pr2", target: "pr4", animated: true },
      { id: "e3-5", source: "pr3", target: "pr5", animated: true },
      { id: "e4-5", source: "pr4", target: "pr5", animated: true },
    ],
  },
];
