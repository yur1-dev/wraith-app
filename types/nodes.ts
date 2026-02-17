import type { Node, Edge } from "@xyflow/react";

export type ChainType =
  | "solana"
  | "ethereum"
  | "arbitrum"
  | "optimism"
  | "base"
  | "polygon"
  | "bsc";

export type NodeDataType = {
  label: string;
  description?: string;

  // Trigger Node
  scheduleType?: "once" | "daily" | "weekly" | "custom";
  scheduleTime?: string;
  cronExpression?: string;

  // Multi-Wallet
  wallets?: string[];
  executeSequentially?: boolean;

  // Swap Node
  fromToken?: string;
  toToken?: string;
  amount?: string;
  slippage?: number;
  dex?: string;

  // Bridge Node
  fromChain?: ChainType;
  toChain?: ChainType;
  bridgeProtocol?: string;

  // Chain Switch
  targetChain?: ChainType;

  // Alert Node
  alertType?: "telegram" | "discord" | "email" | "webhook";
  message?: string;
  webhookUrl?: string;

  // Condition Node
  conditionType?: "price" | "balance" | "gas" | "custom";
  operator?: ">" | "<" | "=" | ">=" | "<=";
  value?: string;

  // Wallet Connect
  walletType?: "metamask" | "phantom" | "rabby" | "coinbase";
  address?: string;

  // Lend/Stake Node
  actionType?: "lend" | "stake";
  protocol?: string;
  token?: string;

  // Twitter Task
  taskType?: "follow" | "like" | "retweet" | "quote";
  target?: string;

  // Discord Task
  serverId?: string;
  channelId?: string;

  // Galxe Task
  campaignName?: string;
  campaignUrl?: string;

  // Volume Farmer
  swapCount?: number;
  swapAmount?: number;
  targetVolume?: number;

  // Claim Airdrop
  projectName?: string;
  contractAddress?: string;

  // Wait/Delay
  duration?: number;
  unit?: "seconds" | "minutes" | "hours";
  randomize?: boolean;
  randomRange?: number;

  // Loop
  iterations?: number;
  breakCondition?: string;

  // Price Check
  priceSource?: string;

  // Gas Optimizer
  maxGas?: number;
  timeout?: number;
};

export type CustomNodeData = {
  id: string;
  type: string;
  data: NodeDataType;
};

// Execution types
export interface ExecutionResult {
  nodeId: string;
  success: boolean;
  output?: any;
  error?: string;
  signature?: string;
}

export interface FlowExecutionResponse {
  flowId: string;
  status: "running" | "completed" | "failed";
  results: ExecutionResult[];
}

export interface ExecuteFlowRequest {
  nodes: Node[];
  edges: Edge[];
  walletPrivateKey: string;
}
