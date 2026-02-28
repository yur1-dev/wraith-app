import type { Node, Edge } from "@xyflow/react";
import { FlowParser } from "./parser";
import { SwapExecutor } from "../executors/swap";
import { EvmSwapExecutor } from "../executors/swap-evm";
import { WaitExecutor } from "../executors/wait";
import type { WalletEntry } from "@/app/components/nodes/MultiWalletNode";

export interface ExecutionResult {
  nodeId: string;
  success: boolean;
  output?: any;
  error?: string;
  signature?: string;
}

const EVM_CHAINS = new Set([
  "ethereum",
  "arbitrum",
  "base",
  "optimism",
  "polygon",
]);

export class FlowRunner {
  private parser: FlowParser;
  private context: Record<string, any> = {};

  constructor(
    private nodes: Node[],
    private edges: Edge[],
    private walletPrivateKey: string,
  ) {
    this.parser = new FlowParser(nodes, edges);
  }

  async execute(): Promise<ExecutionResult[]> {
    const executionOrder = this.parser.getExecutionOrder();
    const results: ExecutionResult[] = [];

    for (const nodeId of executionOrder) {
      const node = this.parser.getNode(nodeId);
      if (!node) continue;

      if (node.type === "multiWallet") {
        const multiResults = await this.executeMultiWallet(
          node,
          executionOrder,
          nodeId,
        );
        results.push(...multiResults);
        break;
      }

      const result = await this.executeNode(node, this.walletPrivateKey);
      results.push(result);

      if (!result.success) break;

      this.context[nodeId] = result.output;
    }

    return results;
  }

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
      for (const wallet of executableWallets) {
        const results = await runForWallet(wallet);
        allResults.push(...results);
      }
    } else {
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
        case "swap": {
          const chain = String(node.data.chain ?? "solana").toLowerCase();

          if (EVM_CHAINS.has(chain)) {
            // ✅ EVM chain (Arbitrum, Ethereum, Base, etc.) → use EVM executor
            const evmExecutor = new EvmSwapExecutor(node, privateKey);
            output = await evmExecutor.execute();
          } else {
            // Solana → use Jupiter executor
            const swapExecutor = new SwapExecutor(node, privateKey);
            output = await swapExecutor.execute();
          }
          break;
        }

        case "waitDelay": {
          const waitExecutor = new WaitExecutor(node);
          output = await waitExecutor.execute(this.context);
          break;
        }

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
