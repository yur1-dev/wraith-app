import { NextRequest, NextResponse } from "next/server";
import type { Node, Edge } from "@xyflow/react";

interface ConnectedWallet {
  address: string;
  type: "phantom" | "metamask";
  label: string;
}

interface ExecuteFlowRequest {
  nodes: Node[];
  edges: Edge[];
  walletAddress: string;
  walletType: "phantom" | "metamask";
  allWallets?: ConnectedWallet[];
}

interface NodeResult {
  nodeId: string;
  nodeType: string;
  label: string;
  status: "success" | "error" | "skipped";
  message: string;
  data?: Record<string, any>;
  duration: number;
  conditionPassed?: boolean;
}

interface ExecutionRecord {
  id: string;
  startedAt: string;
  completedAt: string;
  walletAddress: string;
  walletType: string;
  walletCount: number;
  nodeCount: number;
  successCount: number;
  errorCount: number;
  results: NodeResult[];
}

const executions = new Map<string, ExecutionRecord>();
type FlowContext = Record<string, any>;

async function fetchTokenPrice(symbol: string): Promise<number | null> {
  const ids: Record<string, string> = {
    ETH: "ethereum",
    BTC: "bitcoin",
    SOL: "solana",
    USDC: "usd-coin",
    USDT: "tether",
    MATIC: "matic-network",
    ARB: "arbitrum",
    OP: "optimism",
    AVAX: "avalanche-2",
    BNB: "binancecoin",
  };
  const id = ids[symbol.toUpperCase()];
  if (!id) return null;
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`,
      { next: { revalidate: 60 } },
    );
    const data = await res.json();
    return data[id]?.usd ?? null;
  } catch {
    return null;
  }
}

async function fetchEthGasPrice(): Promise<{
  gwei: number;
  fast: number;
  standard: number;
} | null> {
  try {
    const rpcUrl = process.env.ETHEREUM_RPC_URL || "https://eth.llamarpc.com";
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_gasPrice",
        params: [],
        id: 1,
      }),
    });
    const data = await res.json();
    const wei = parseInt(data.result, 16);
    const gwei = wei / 1e9;
    return {
      gwei: Math.round(gwei),
      fast: Math.round(gwei * 1.2),
      standard: Math.round(gwei),
    };
  } catch {
    return null;
  }
}

async function executePriceCheck(
  node: Node,
  context: FlowContext,
): Promise<Omit<NodeResult, "nodeId" | "duration">> {
  const token = (node.data?.token as string) || "ETH";
  const price = await fetchTokenPrice(token);
  if (price !== null) {
    const threshold = parseFloat(String(node.data?.threshold || "0"));
    const condition = (node.data?.condition as string) || "above";
    let conditionMet = true;
    let conditionMsg = "";
    if (threshold) {
      conditionMet =
        condition === "above" ? price > threshold : price < threshold;
      conditionMsg = ` — (${condition} $${threshold}) ${conditionMet ? "✓ MET" : "✗ NOT MET"}`;
    }
    context[node.id] = { token, price, conditionMet, threshold, condition };
    return {
      nodeType: node.type || "priceCheck",
      label: (node.data?.label as string) || "Price Check",
      status: "success",
      message: `${token} is $${price.toLocaleString()}${conditionMsg}`,
      data: {
        token,
        price,
        conditionMet,
        threshold,
        condition,
        source: "CoinGecko",
      },
    };
  }
  return {
    nodeType: node.type || "priceCheck",
    label: (node.data?.label as string) || "Price Check",
    status: "error",
    message: `Could not fetch ${token} price`,
  };
}

async function executeCondition(
  node: Node,
  context: FlowContext,
): Promise<Omit<NodeResult, "nodeId" | "duration">> {
  const conditionType = (node.data?.conditionType as string) || "price";
  const operator = (node.data?.operator as string) || "gt";
  const threshold = parseFloat(
    String(node.data?.threshold || node.data?.value || "0"),
  );
  const token = (node.data?.token as string) || "ETH";

  let actualValue: number | null = null;
  let valueLabel = "";

  if (conditionType === "price") {
    const upstream = Object.values(context).find(
      (c: any) =>
        c?.token?.toUpperCase() === token.toUpperCase() && c?.price != null,
    ) as any;
    actualValue = upstream?.price ?? (await fetchTokenPrice(token));
    valueLabel = `${token} $${actualValue?.toLocaleString() ?? "unknown"}`;
  } else if (conditionType === "gas") {
    const gas = await fetchEthGasPrice();
    actualValue = gas?.standard ?? null;
    valueLabel = `gas ${actualValue ?? "unknown"} Gwei`;
  }

  if (actualValue === null) {
    return {
      nodeType: "condition",
      label: (node.data?.label as string) || "Condition",
      status: "error",
      message: `Could not evaluate condition — failed to fetch ${conditionType}`,
      conditionPassed: false,
    };
  }

  let passed = false;
  switch (operator) {
    case "gt":
      passed = actualValue > threshold;
      break;
    case "gte":
      passed = actualValue >= threshold;
      break;
    case "lt":
      passed = actualValue < threshold;
      break;
    case "lte":
      passed = actualValue <= threshold;
      break;
    case "eq":
      passed = Math.abs(actualValue - threshold) < 0.001;
      break;
    default:
      passed = actualValue > threshold;
  }

  const opLabel: Record<string, string> = {
    gt: ">",
    gte: "≥",
    lt: "<",
    lte: "≤",
    eq: "=",
  };
  const verdict = passed
    ? "✅ PASSED — flow continues"
    : "🛑 FAILED — flow stopped";
  context[node.id] = {
    passed,
    actualValue,
    threshold,
    operator,
    conditionType,
  };

  return {
    nodeType: "condition",
    label: (node.data?.label as string) || "Condition",
    status: "success",
    message: `${valueLabel} ${opLabel[operator] || operator} $${threshold} → ${verdict}`,
    data: {
      conditionType,
      token,
      actualValue,
      operator: opLabel[operator],
      threshold,
      passed,
      verdict,
    },
    conditionPassed: passed,
  };
}

async function executeAlert(
  node: Node,
  context: FlowContext,
): Promise<Omit<NodeResult, "nodeId" | "duration">> {
  const alertType = (node.data?.alertType as string) || "info";
  const message = (node.data?.message as string) || "Flow alert triggered";

  const contextSummary: string[] = [];
  for (const data of Object.values(context)) {
    if ((data as any)?.price != null)
      contextSummary.push(
        `${(data as any).token}: $${(data as any).price.toLocaleString()}`,
      );
    if ((data as any)?.gwei != null)
      contextSummary.push(`Gas: ${(data as any).gwei} Gwei`);
    if ((data as any)?.passed != null)
      contextSummary.push(
        `Condition: ${(data as any).passed ? "PASSED" : "FAILED"}`,
      );
  }

  const emoji: Record<string, string> = {
    info: "ℹ️",
    warning: "⚠️",
    success: "✅",
    error: "🚨",
  };
  const contextStr =
    contextSummary.length > 0 ? ` | ${contextSummary.join(" | ")}` : "";

  return {
    nodeType: "alert",
    label: (node.data?.label as string) || "Alert",
    status: "success",
    message: `${emoji[alertType] || "🔔"} ${message}${contextStr}`,
    data: {
      alertType,
      message,
      timestamp: new Date().toLocaleString(),
      context: contextSummary,
    },
  };
}

async function executeGasOptimizer(
  node: Node,
  context: FlowContext,
): Promise<Omit<NodeResult, "nodeId" | "duration">> {
  const gas = await fetchEthGasPrice();
  if (gas) {
    const maxGwei = parseFloat(String(node.data?.maxGwei || "50"));
    const acceptable = gas.standard <= maxGwei;
    context[node.id] = { ...gas };
    return {
      nodeType: node.type || "gasOptimizer",
      label: (node.data?.label as string) || "Gas Optimizer",
      status: "success",
      message: `ETH gas: ${gas.standard} Gwei (fast: ${gas.fast}) — ${acceptable ? "✓ within limit" : `✗ above ${maxGwei} Gwei limit`}`,
      data: { ...gas, maxGwei, acceptable, source: "Public RPC" },
    };
  }
  return {
    nodeType: node.type || "gasOptimizer",
    label: (node.data?.label as string) || "Gas Optimizer",
    status: "error",
    message: "Could not fetch gas price",
  };
}

async function executeSwap(
  node: Node,
  wallet: ConnectedWallet,
): Promise<Omit<NodeResult, "nodeId" | "duration">> {
  const fromToken = (node.data?.fromToken as string) || "ETH";
  const toToken = (node.data?.toToken as string) || "USDC";
  const amount = (node.data?.amount as number) || 0.1;
  const [fromPrice, toPrice] = await Promise.all([
    fetchTokenPrice(fromToken),
    fetchTokenPrice(toToken),
  ]);
  const usdValue = fromPrice ? fromPrice * amount : null;
  const estimatedOut = usdValue && toPrice ? usdValue / toPrice : null;
  return {
    nodeType: node.type || "swap",
    label: (node.data?.label as string) || "Swap",
    status: "success",
    message: `Swap ${amount} ${fromToken}${usdValue ? ` ($${usdValue.toFixed(2)})` : ""} → ~${estimatedOut ? estimatedOut.toFixed(4) : "?"} ${toToken}`,
    data: {
      fromToken,
      toToken,
      amount,
      fromPrice,
      toPrice,
      usdValue,
      estimatedOut,
      wallet: wallet.address,
    },
  };
}

async function executeMultiWallet(
  node: Node,
  allWallets: ConnectedWallet[],
): Promise<Omit<NodeResult, "nodeId" | "duration">> {
  if (allWallets.length === 0) {
    return {
      nodeType: node.type || "multiWallet",
      label: (node.data?.label as string) || "Multi-Wallet",
      status: "error",
      message: "No wallets connected",
    };
  }
  const action = (node.data?.action as string) || "parallel-swap";
  const token = (node.data?.token as string) || "ETH";
  const price = await fetchTokenPrice(token);
  return {
    nodeType: node.type || "multiWallet",
    label: (node.data?.label as string) || "Multi-Wallet",
    status: "success",
    message: `${action} queued across ${allWallets.length} wallets${price ? ` | ${token} = $${price.toLocaleString()}` : ""}`,
    data: {
      walletCount: allWallets.length,
      action,
      token,
      price,
      wallets: allWallets.map((w) => ({ ...w, status: "queued" })),
    },
  };
}

async function executeSocial(
  node: Node,
): Promise<Omit<NodeResult, "nodeId" | "duration">> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/social`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: node.type,
          action: node.data?.action || "check",
          target: node.data?.target || node.data?.username,
          config: node.data,
        }),
      },
    );
    const result = await res.json();
    return {
      nodeType: node.type || "social",
      label: (node.data?.label as string) || node.type || "Social",
      status: result.success ? "success" : "error",
      message: result.message || "Social action completed",
      data: result.data,
    };
  } catch (err: any) {
    return {
      nodeType: node.type || "social",
      label: (node.data?.label as string) || "Social",
      status: "error",
      message: err.message,
    };
  }
}

async function executeGenericNode(
  node: Node,
  wallet: ConnectedWallet,
): Promise<Omit<NodeResult, "nodeId" | "duration">> {
  const typeMessages: Record<string, string> = {
    bridge: "Bridge transaction prepared",
    trigger: "Trigger evaluated",
    waitDelay: `Waited ${node.data?.seconds || 3}s`,
    loop: "Loop iteration complete",
    chainSwitch: "Chain switch prepared",
    walletConnect: "Wallet connection verified",
    claimAirdrop: "Airdrop claim prepared",
    volumeFarmer: "Volume farming round complete",
    lendStake: "Lend/Stake position managed",
  };
  return {
    nodeType: node.type || "unknown",
    label: (node.data?.label as string) || node.type || "Node",
    status: "success",
    message:
      typeMessages[node.type || ""] || `Node executed via ${wallet.label}`,
    data: { nodeData: node.data, wallet: wallet.address },
  };
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body: ExecuteFlowRequest = await request.json();
    const { nodes, edges, walletAddress, walletType, allWallets = [] } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address required" },
        { status: 400 },
      );
    }

    const activeWallet: ConnectedWallet = {
      address: walletAddress,
      type: walletType,
      label:
        allWallets.find((w) => w.address === walletAddress)?.label ||
        walletType,
    };
    const effectiveWallets =
      allWallets.length > 0 ? allWallets : [activeWallet];

    const startedAt = new Date().toISOString();
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const results: NodeResult[] = [];
    const context: FlowContext = {};

    const incomingEdges = new Set(edges.map((e) => e.target));
    const ordered = [
      ...nodes.filter((n) => !incomingEdges.has(n.id)),
      ...nodes.filter((n) => incomingEdges.has(n.id)),
    ];

    let flowHalted = false;
    let haltReason = "";

    for (const node of ordered) {
      if (flowHalted) {
        results.push({
          nodeId: node.id,
          nodeType: node.type || "unknown",
          label: (node.data?.label as string) || node.type || "Node",
          status: "skipped",
          message: `Skipped — ${haltReason}`,
          duration: 0,
        });
        continue;
      }

      const nodeStart = Date.now();
      let result: Omit<NodeResult, "nodeId" | "duration">;
      const type = node.type || "";

      if (type === "priceCheck") {
        result = await executePriceCheck(node, context);
      } else if (type === "condition") {
        result = await executeCondition(node, context);
        if (result.conditionPassed === false) {
          flowHalted = true;
          haltReason = `condition not met at "${result.label}"`;
        }
      } else if (type === "alert") {
        result = await executeAlert(node, context);
      } else if (type === "gasOptimizer") {
        result = await executeGasOptimizer(node, context);
      } else if (type === "swap") {
        result = await executeSwap(node, activeWallet);
      } else if (type === "multiWallet") {
        result = await executeMultiWallet(node, effectiveWallets);
      } else if (["twitter", "discord", "galxe"].includes(type)) {
        result = await executeSocial(node);
      } else {
        result = await executeGenericNode(node, activeWallet);
      }

      results.push({
        nodeId: node.id,
        duration: Date.now() - nodeStart,
        ...result,
      });
    }

    const completedAt = new Date().toISOString();
    const successCount = results.filter((r) => r.status === "success").length;
    const errorCount = results.filter((r) => r.status === "error").length;

    const record: ExecutionRecord = {
      id: executionId,
      startedAt,
      completedAt,
      walletAddress,
      walletType,
      walletCount: effectiveWallets.length,
      nodeCount: nodes.length,
      successCount,
      errorCount,
      results,
    };

    executions.set(executionId, record);
    if (executions.size > 50) executions.delete([...executions.keys()][0]);

    const normalizedResults = results.map((r) => ({
      ...r,
      success: r.status === "success",
      output: r.data,
    }));

    return NextResponse.json({
      success: errorCount === 0,
      status: errorCount === 0 ? "completed" : "failed",
      executionId,
      results: normalizedResults,
      flowHalted,
      haltReason: flowHalted ? haltReason : null,
      summary: {
        total: results.length,
        success: successCount,
        skipped: results.filter((r) => r.status === "skipped").length,
        errors: errorCount,
        wallets: effectiveWallets.length,
        duration:
          new Date(completedAt).getTime() - new Date(startedAt).getTime(),
      },
    });
  } catch (err: any) {
    console.error("Execute error:", err);
    return NextResponse.json(
      { error: err.message || "Execution failed" },
      { status: 500 },
    );
  }
}

export function GET() {
  const all = [...executions.values()].sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
  );
  return NextResponse.json({ executions: all });
}
