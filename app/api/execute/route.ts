import { NextRequest, NextResponse } from "next/server";
import type { Node, Edge } from "@xyflow/react";

// Define types locally - no external imports needed
interface ExecuteFlowRequest {
  nodes: Node[];
  edges: Edge[];
  walletAddress: string;
  walletType: "phantom" | "metamask";
}

interface ExecutionResult {
  nodeId: string;
  success: boolean;
  output?: any;
  error?: string;
  signature?: string;
}

interface FlowExecutionResponse {
  flowId: string;
  status: "running" | "completed" | "failed";
  results: ExecutionResult[];
}

// In-memory storage (use database in production)
const executions = new Map<string, FlowExecutionResponse>();

// Get execution order from nodes and edges (topological sort)
function getExecutionOrder(nodes: Node[], edges: Edge[]): string[] {
  const adjacency = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  nodes.forEach((node) => {
    adjacency.set(node.id, []);
    inDegree.set(node.id, 0);
  });

  edges.forEach((edge) => {
    adjacency.get(edge.source)?.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  });

  const queue: string[] = [];
  inDegree.forEach((degree, nodeId) => {
    if (degree === 0) queue.push(nodeId);
  });

  const order: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    order.push(current);
    adjacency.get(current)?.forEach((neighbor) => {
      const newDegree = (inDegree.get(neighbor) || 0) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) queue.push(neighbor);
    });
  }

  return order;
}

// Execute a single node (mock for now - real implementation per node type)
async function executeNode(
  node: Node,
  walletAddress: string,
  walletType: string,
  context: Record<string, any>,
): Promise<ExecutionResult> {
  console.log(`⚡ Executing node: ${node.type} (${node.id})`);

  try {
    switch (node.type) {
      case "trigger":
        return {
          nodeId: node.id,
          success: true,
          output: {
            triggered: true,
            time: new Date().toISOString(),
            schedule: node.data.scheduleType,
          },
        };

      case "swap":
        // TODO: Call Jupiter/Uniswap API here
        // For now, return mock success
        console.log(
          `🔄 Swap: ${node.data.fromToken} → ${node.data.toToken} on ${node.data.dex}`,
        );
        return {
          nodeId: node.id,
          success: true,
          output: {
            fromToken: node.data.fromToken,
            toToken: node.data.toToken,
            amount: node.data.amount,
            dex: node.data.dex,
            walletAddress,
          },
          signature: `MOCK_SWAP_${Date.now()}`,
        };

      case "bridge":
        // TODO: Call LayerZero/Stargate API here
        console.log(`🌉 Bridge: ${node.data.fromChain} → ${node.data.toChain}`);
        return {
          nodeId: node.id,
          success: true,
          output: {
            fromChain: node.data.fromChain,
            toChain: node.data.toChain,
            protocol: node.data.bridgeProtocol,
          },
          signature: `MOCK_BRIDGE_${Date.now()}`,
        };

      case "waitDelay":
        const duration = (node.data.duration as number) || 5;
        const unit = (node.data.unit as string) || "seconds";
        let ms = duration * 1000;
        if (unit === "minutes") ms = duration * 60 * 1000;
        if (unit === "hours") ms = duration * 3600 * 1000;

        // Cap at 10 seconds for API route timeout
        const actualMs = Math.min(ms, 10000);
        await new Promise((resolve) => setTimeout(resolve, actualMs));

        return {
          nodeId: node.id,
          success: true,
          output: {
            waited: actualMs / 1000,
            requested: duration,
            unit,
          },
        };

      case "condition":
        // Evaluate condition
        const conditionType = node.data.conditionType as string;
        const operator = node.data.operator as string;
        const value = node.data.value as string;

        // Mock: always pass condition for now
        const conditionResult = true;

        return {
          nodeId: node.id,
          success: true,
          output: {
            conditionType,
            operator,
            value,
            result: conditionResult,
            branch: conditionResult ? "true" : "false",
          },
        };

      case "alert":
        // TODO: Send real notifications
        console.log(`🔔 Alert: ${node.data.alertType} - ${node.data.message}`);
        return {
          nodeId: node.id,
          success: true,
          output: {
            alertType: node.data.alertType,
            message: node.data.message,
            sent: true,
          },
        };

      case "multiWallet":
        const wallets = (node.data.wallets as string[]) || [];
        return {
          nodeId: node.id,
          success: true,
          output: {
            walletCount: wallets.length,
            mode: node.data.executeSequentially ? "sequential" : "parallel",
            wallets: wallets.slice(0, 3).map((w) => `${w.slice(0, 6)}...`),
          },
        };

      case "priceCheck":
        // TODO: Fetch real price from CoinGecko etc
        const mockPrice = Math.random() * 1000 + 100;
        return {
          nodeId: node.id,
          success: true,
          output: {
            token: node.data.token,
            price: mockPrice.toFixed(2),
            source: node.data.priceSource,
            timestamp: new Date().toISOString(),
          },
        };

      case "lendStake":
        return {
          nodeId: node.id,
          success: true,
          output: {
            action: node.data.actionType,
            token: node.data.token,
            amount: node.data.amount,
            protocol: node.data.protocol,
          },
          signature: `MOCK_LEND_${Date.now()}`,
        };

      case "loop":
        return {
          nodeId: node.id,
          success: true,
          output: {
            iterations: node.data.iterations || "infinite",
            breakCondition: node.data.breakCondition,
          },
        };

      case "chainSwitch":
        return {
          nodeId: node.id,
          success: true,
          output: {
            targetChain: node.data.targetChain,
            switched: true,
          },
        };

      case "walletConnect":
        return {
          nodeId: node.id,
          success: true,
          output: {
            walletType: node.data.walletType,
            address: walletAddress,
            connected: true,
          },
        };

      case "twitter":
        return {
          nodeId: node.id,
          success: true,
          output: {
            taskType: node.data.taskType,
            target: node.data.target,
            completed: true,
          },
        };

      case "discord":
        return {
          nodeId: node.id,
          success: true,
          output: {
            taskType: node.data.taskType,
            serverId: node.data.serverId,
            completed: true,
          },
        };

      case "galxe":
        return {
          nodeId: node.id,
          success: true,
          output: {
            campaignName: node.data.campaignName,
            completed: true,
          },
        };

      case "volumeFarmer":
        return {
          nodeId: node.id,
          success: true,
          output: {
            swapCount: node.data.swapCount,
            swapAmount: node.data.swapAmount,
            targetVolume: node.data.targetVolume,
            status: "initiated",
          },
        };

      case "claimAirdrop":
        return {
          nodeId: node.id,
          success: true,
          output: {
            projectName: node.data.projectName,
            contractAddress: node.data.contractAddress,
            claimed: true,
          },
          signature: `MOCK_CLAIM_${Date.now()}`,
        };

      case "gasOptimizer":
        return {
          nodeId: node.id,
          success: true,
          output: {
            maxGas: node.data.maxGas,
            currentGas: Math.floor(Math.random() * 30) + 5,
            optimized: true,
          },
        };

      default:
        return {
          nodeId: node.id,
          success: false,
          error: `Node type "${node.type}" not implemented yet`,
        };
    }
  } catch (error: any) {
    return {
      nodeId: node.id,
      success: false,
      error: error.message,
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: ExecuteFlowRequest = await request.json();

    if (!body.walletAddress) {
      return NextResponse.json(
        { error: "Wallet address required. Please connect your wallet first." },
        { status: 400 },
      );
    }

    if (!body.nodes || body.nodes.length === 0) {
      return NextResponse.json(
        { error: "No nodes in flow. Please add some nodes first." },
        { status: 400 },
      );
    }

    const flowId = crypto.randomUUID();
    const context: Record<string, any> = {};
    const results: ExecutionResult[] = [];

    // Get execution order
    const executionOrder = getExecutionOrder(body.nodes, body.edges || []);

    // Execute each node in order
    for (const nodeId of executionOrder) {
      const node = body.nodes.find((n) => n.id === nodeId);
      if (!node) continue;

      const result = await executeNode(
        node,
        body.walletAddress,
        body.walletType,
        context,
      );
      results.push(result);

      // Store output in context for next nodes
      if (result.success && result.output) {
        context[nodeId] = result.output;
      }

      // Stop on failure
      if (!result.success) {
        console.error(`❌ Node ${nodeId} failed: ${result.error}`);
        break;
      }
    }

    const allSuccess = results.every((r) => r.success);
    const status = allSuccess ? "completed" : "failed";

    const execution: FlowExecutionResponse = {
      flowId,
      status,
      results,
    };

    executions.set(flowId, execution);

    console.log(
      `✅ Flow ${flowId} ${status}: ${results.length} nodes executed`,
    );

    return NextResponse.json(execution);
  } catch (error: any) {
    console.error("Flow execution error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export { executions };
