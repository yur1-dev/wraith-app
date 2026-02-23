import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Node, Edge } from "@xyflow/react";

interface FlowStore {
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null; // ← ID only; panel derives full node via nodes.find()

  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  setSelectedNode: (node: Node | null) => void; // accepts Node for compatibility with onNodeClick

  addNode: (node: Node) => void;
  deleteNode: (id: string) => void;
  updateNodeData: (id: string, data: Record<string, unknown>) => void;
  clearFlow: () => void;
}

export const useFlowStore = create<FlowStore>()(
  persist(
    (set) => ({
      nodes: [],
      edges: [],
      selectedNodeId: null,

      setNodes: (nodes) => {
        set({ nodes });
      },

      setEdges: (edges) => {
        set({ edges });
      },

      // FlowBuilder calls this with a full Node from onNodeClick,
      // or null from onPaneClick. We only store the id.
      setSelectedNode: (node) => {
        console.log("👆 Selected node:", node?.id ?? "none");
        set({ selectedNodeId: node?.id ?? null });
      },

      addNode: (node) =>
        set((state) => {
          console.log("➕ Adding node:", node.id);
          return { nodes: [...state.nodes, node] };
        }),

      deleteNode: (id) =>
        set((state) => {
          console.log("🗑️ Deleting node:", id);
          return {
            nodes: state.nodes.filter((n) => n.id !== id),
            edges: state.edges.filter(
              (e) => e.source !== id && e.target !== id,
            ),
            selectedNodeId:
              state.selectedNodeId === id ? null : state.selectedNodeId,
          };
        }),

      updateNodeData: (id, newData) =>
        set((state) => {
          console.log("✏️ Updating node:", id, newData);
          return {
            nodes: state.nodes.map((node) =>
              node.id === id
                ? { ...node, data: { ...node.data, ...newData } }
                : node,
            ),
          };
        }),

      clearFlow: () => {
        console.log("🧹 Clearing flow");
        set({ nodes: [], edges: [], selectedNodeId: null });
      },
    }),
    {
      name: "flowdefi-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        nodes: state.nodes,
        edges: state.edges,
        // selectedNodeId intentionally NOT persisted
      }),
    },
  ),
);
