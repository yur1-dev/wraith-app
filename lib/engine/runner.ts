import type { Node, Edge } from "@xyflow/react";
import { FlowParser } from "./parser";
import { SwapExecutor } from "../executors/swap";
import { WaitExecutor } from "../executors/wait";

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

      const result = await this.executeNode(node);
      results.push(result);

      if (!result.success) break;

      this.context[nodeId] = result.output;
    }

    return results;
  }

  private async executeNode(node: Node): Promise<ExecutionResult> {
    try {
      let output: any;

      switch (node.type) {
        case "swap":
          const swapExecutor = new SwapExecutor(node, this.walletPrivateKey);
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
