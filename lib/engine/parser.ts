import type { Node, Edge } from "@xyflow/react";

export class FlowParser {
  private nodesDict: Map<string, Node>;
  private edgesList: Edge[];

  constructor(nodes: Node[], edges: Edge[]) {
    this.nodesDict = new Map(nodes.map((node) => [node.id, node]));
    this.edgesList = edges;
  }

  getExecutionOrder(): string[] {
    const adjacency = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    this.nodesDict.forEach((_, nodeId) => {
      adjacency.set(nodeId, []);
      inDegree.set(nodeId, 0);
    });

    this.edgesList.forEach((edge) => {
      adjacency.get(edge.source)?.push(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    });

    const queue: string[] = [];
    inDegree.forEach((degree, nodeId) => {
      if (degree === 0) queue.push(nodeId);
    });

    const executionOrder: string[] = [];

    while (queue.length > 0) {
      const current = queue.shift()!;
      executionOrder.push(current);

      adjacency.get(current)?.forEach((neighbor) => {
        const newDegree = (inDegree.get(neighbor) || 0) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) queue.push(neighbor);
      });
    }

    if (executionOrder.length !== this.nodesDict.size) {
      throw new Error("Flow contains cycles!");
    }

    return executionOrder;
  }

  getNode(nodeId: string): Node | undefined {
    return this.nodesDict.get(nodeId);
  }

  getNextNodes(nodeId: string, handle?: string): string[] {
    return this.edgesList
      .filter((edge) => {
        if (edge.source !== nodeId) return false;
        if (handle && edge.sourceHandle !== handle) return false;
        return true;
      })
      .map((edge) => edge.target);
  }
}
