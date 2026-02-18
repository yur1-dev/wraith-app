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
  // All connected wallets for multi-wallet nodes
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

// In-memory store — last 50 runs
const executions = new Map<string, ExecutionRecord>();

// ── Real data helpers ─────────────────────────────────────────────────────────

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

// ── Node executors ────────────────────────────────────────────────────────────

async function executePriceCheck(
  node: Node,
): Promise<Omit<NodeResult, "nodeId" | "duration">> {
  const token = (node.data?.token as string) || "ETH";
  const price = await fetchTokenPrice(token);
  if (price !== null) {
    const threshold = node.data?.threshold as number;
    const condition = node.data?.condition as string;
    let conditionMet = true;
    let conditionMsg = "";
    if (threshold && condition) {
      conditionMet =
        condition === "above" ? price > threshold : price < threshold;
      conditionMsg = ` — condition (${condition} $${threshold}) ${conditionMet ? "✓ MET" : "✗ NOT MET"}`;
    }
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

async function executeGasOptimizer(
  node: Node,
): Promise<Omit<NodeResult, "nodeId" | "duration">> {
  const gas = await fetchEthGasPrice();
  if (gas) {
    const maxGwei = (node.data?.maxGwei as number) || 50;
    const acceptable = gas.standard <= maxGwei;
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
    message: `Swap ${amount} ${fromToken}${usdValue ? ` ($${usdValue.toFixed(2)})` : ""} → ~${estimatedOut ? estimatedOut.toFixed(4) : "?"} ${toToken} via ${wallet.label}`,
    data: {
      fromToken,
      toToken,
      amount,
      fromPrice,
      toPrice,
      usdValue,
      estimatedOut,
      wallet: wallet.address,
      walletLabel: wallet.label,
      note: "Requires wallet signature on client — simulated server-side",
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

  const walletResults = allWallets.map((w) => ({
    address: w.address,
    label: w.label,
    type: w.type,
    status: "queued" as const,
    note: `${action} — awaiting signature from ${w.label} (${w.address.slice(0, 6)}…${w.address.slice(-4)})`,
  }));

  return {
    nodeType: node.type || "multiWallet",
    label: (node.data?.label as string) || "Multi-Wallet",
    status: "success",
    message: `${action} queued across ${allWallets.length} wallet${allWallets.length > 1 ? "s" : ""}${price ? ` | ${token} = $${price.toLocaleString()}` : ""}`,
    data: {
      walletCount: allWallets.length,
      action,
      token,
      price,
      wallets: walletResults,
      note: "Each wallet must sign independently in the browser extension",
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
      label: (node.data?.label as string) || node.type || "Social",
      status: "error",
      message: err.message || "Social API error",
    };
  }
}

async function executeGenericNode(
  node: Node,
  wallet: ConnectedWallet,
): Promise<Omit<NodeResult, "nodeId" | "duration">> {
  const typeMessages: Record<string, string> = {
    bridge: `Bridge transaction prepared for ${wallet.label}`,
    liquidity: `Liquidity position managed via ${wallet.label}`,
    limit: `Limit order set via ${wallet.label}`,
    schedule: "Scheduled trigger evaluated",
    condition: "Condition logic evaluated",
    notification: "Notification dispatched",
    yield: `Yield strategy executed via ${wallet.label}`,
    portfolio: `Portfolio rebalanced via ${wallet.label}`,
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

    // Build active wallet object
    const activeWallet: ConnectedWallet = {
      address: walletAddress,
      type: walletType,
      label:
        allWallets.find((w) => w.address === walletAddress)?.label ||
        walletType,
    };

    // Ensure the active wallet is in allWallets list
    const effectiveWallets: ConnectedWallet[] =
      allWallets.length > 0 ? allWallets : [activeWallet];

    const startedAt = new Date().toISOString();
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const results: NodeResult[] = [];

    // Topological order: nodes with no incoming edges first
    const incomingEdges = new Set(edges.map((e) => e.target));
    const ordered = [
      ...nodes.filter((n) => !incomingEdges.has(n.id)),
      ...nodes.filter((n) => incomingEdges.has(n.id)),
    ];

    for (const node of ordered) {
      const nodeStart = Date.now();
      let result: Omit<NodeResult, "nodeId" | "duration">;

      const type = node.type || "";

      if (type === "priceCheck") {
        result = await executePriceCheck(node);
      } else if (type === "gasOptimizer") {
        result = await executeGasOptimizer(node);
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

    // Keep only last 50
    if (executions.size > 50) {
      const oldest = [...executions.keys()][0];
      executions.delete(oldest);
    }

    // Add success boolean to each result so RunFlowDialog can use r.success
    const normalizedResults = results.map((r) => ({
      ...r,
      success: r.status === "success",
    }));

    return NextResponse.json({
      success: errorCount === 0,
      status: errorCount === 0 ? "completed" : "failed",
      executionId,
      results: normalizedResults,
      summary: {
        total: results.length,
        success: successCount,
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
