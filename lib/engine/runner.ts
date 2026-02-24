import type { Node, Edge } from "@xyflow/react";
import { FlowParser } from "./parser";
import { SwapExecutor } from "../executors/swap";
import { WaitExecutor } from "../executors/wait";
import type { WalletEntry } from "@/app/components/nodes/MultiWalletNode";

export interface ExecutionResult {
  nodeId: string;
  success: boolean;
  output?: any;
  error?: string;
  signature?: string;
}

export class FlowRunner {
  private parser: FlowParser;
  private context: Record<string, any> = {};

  constructor(
    private nodes: Node[],
    private edges: Edge[],
    private walletPrivateKey: string, // default wallet key (from WalletConnectNode or passed in)
  ) {
    this.parser = new FlowParser(nodes, edges);
  }

  async execute(): Promise<ExecutionResult[]> {
    const executionOrder = this.parser.getExecutionOrder();
    const results: ExecutionResult[] = [];

    for (const nodeId of executionOrder) {
      const node = this.parser.getNode(nodeId);
      if (!node) continue;

      // If this is a multiWallet node, run the downstream flow per wallet
      if (node.type === "multiWallet") {
        const multiResults = await this.executeMultiWallet(
          node,
          executionOrder,
          nodeId,
        );
        results.push(...multiResults);
        // Stop processing — multiWallet handles its own downstream execution
        break;
      }

      const result = await this.executeNode(node, this.walletPrivateKey);
      results.push(result);

      if (!result.success) break;

      this.context[nodeId] = result.output;
    }

    return results;
  }

  // Execute all downstream nodes for each wallet in the MultiWalletNode
  private async executeMultiWallet(
    multiNode: Node,
    fullOrder: string[],
    multiNodeId: string,
  ): Promise<ExecutionResult[]> {
    const wallets: WalletEntry[] = Array.isArray(multiNode.data.wallets)
      ? multiNode.data.wallets
      : [];
    const executeSequentially = Boolean(
      multiNode.data.executeSequentially ?? true,
    );

    // Only process enabled wallets that have a private key
    const executableWallets = wallets.filter((w) => w.enabled && w.privateKey);

    if (executableWallets.length === 0) {
      return [
        {
          nodeId: multiNodeId,
          success: false,
          error:
            "No executable wallets — make sure wallets are enabled and have a private key",
        },
      ];
    }

    // Get all nodes that come after the multiWallet node in execution order
    const multiNodeIndex = fullOrder.indexOf(multiNodeId);
    const downstreamNodeIds = fullOrder.slice(multiNodeIndex + 1);

    const allResults: ExecutionResult[] = [];

    const runForWallet = async (wallet: WalletEntry) => {
      const walletResults: ExecutionResult[] = [];
      const walletContext: Record<string, any> = { ...this.context };

      for (const nodeId of downstreamNodeIds) {
        const node = this.parser.getNode(nodeId);
        if (!node) continue;

        const result = await this.executeNode(
          node,
          wallet.privateKey,
          wallet.address,
        );
        // Tag result with wallet info
        result.output = {
          ...result.output,
          wallet: wallet.address,
          walletLabel: wallet.label,
        };
        walletResults.push(result);

        if (!result.success) break;
        walletContext[nodeId] = result.output;
      }

      return walletResults;
    };

    if (executeSequentially) {
      // Run wallets one after another
      for (const wallet of executableWallets) {
        const results = await runForWallet(wallet);
        allResults.push(...results);
      }
    } else {
      // Run all wallets in parallel
      const parallelResults = await Promise.all(
        executableWallets.map((wallet) => runForWallet(wallet)),
      );
      parallelResults.forEach((r) => allResults.push(...r));
    }

    return allResults;
  }

  private async executeNode(
    node: Node,
    privateKey: string,
    walletAddress?: string,
  ): Promise<ExecutionResult> {
    try {
      let output: any;

      switch (node.type) {
        case "swap":
          const swapExecutor = new SwapExecutor(node, privateKey);
          output = await swapExecutor.execute(this.context);
          break;

        case "waitDelay":
          const waitExecutor = new WaitExecutor(node);
          output = await waitExecutor.execute(this.context);
          break;

        default:
          output = {
            success: false,
            error: `Node type "${node.type}" not implemented yet`,
          };
      }

      return {
        nodeId: node.id,
        success: output.success,
        output,
        error: output.error,
        signature: output.signature,
      };
    } catch (error: any) {
      return {
        nodeId: node.id,
        success: false,
        error: error.message,
      };
    }
  }
}
