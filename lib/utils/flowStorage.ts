import { Node, Edge } from "@xyflow/react";

export type SavedFlow = {
  id: string;
  name: string;
  description: string;
  nodes: Node[];
  edges: Edge[];
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = "defi-flows";

export const flowStorage = {
  // Get all saved flows
  getAllFlows: (): SavedFlow[] => {
    if (typeof window === "undefined") return [];
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  // Save a new flow
  saveFlow: (
    name: string,
    description: string,
    nodes: Node[],
    edges: Edge[],
  ): SavedFlow => {
    const flows = flowStorage.getAllFlows();
    const now = new Date().toISOString();

    const newFlow: SavedFlow = {
      id: `flow-${Date.now()}`,
      name,
      description,
      nodes,
      edges,
      createdAt: now,
      updatedAt: now,
    };

    flows.push(newFlow);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(flows));
    return newFlow;
  },

  // Update existing flow
  updateFlow: (
    id: string,
    name: string,
    description: string,
    nodes: Node[],
    edges: Edge[],
  ): void => {
    const flows = flowStorage.getAllFlows();
    const index = flows.findIndex((f) => f.id === id);

    if (index !== -1) {
      flows[index] = {
        ...flows[index],
        name,
        description,
        nodes,
        edges,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(flows));
    }
  },

  // Delete a flow
  deleteFlow: (id: string): void => {
    const flows = flowStorage.getAllFlows();
    const filtered = flows.filter((f) => f.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  },

  // Load a specific flow
  loadFlow: (id: string): SavedFlow | null => {
    const flows = flowStorage.getAllFlows();
    return flows.find((f) => f.id === id) || null;
  },

  // Export flow as JSON
  exportFlow: (flow: SavedFlow): void => {
    const dataStr = JSON.stringify(flow, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${flow.name.replace(/\s+/g, "-").toLowerCase()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  },

  // Import flow from JSON
  importFlow: async (file: File): Promise<SavedFlow> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const flow = JSON.parse(e.target?.result as string) as SavedFlow;
          const flows = flowStorage.getAllFlows();

          // Generate new ID to avoid conflicts
          flow.id = `flow-${Date.now()}`;
          flow.createdAt = new Date().toISOString();
          flow.updatedAt = new Date().toISOString();

          flows.push(flow);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(flows));
          resolve(flow);
        } catch (error) {
          reject(new Error("Invalid flow file"));
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    });
  },
};
