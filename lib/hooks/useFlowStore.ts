import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Node, Edge } from "@xyflow/react";

interface Snapshot {
  nodes: Node[];
  edges: Edge[];
}

interface FlowStore {
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  _undoStack: Snapshot[];

  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  setSelectedNode: (node: Node | null) => void;

  addNode: (node: Node) => void;
  deleteNode: (id: string) => void;
  updateNodeData: (id: string, data: Record<string, unknown>) => void;
  clearFlow: () => void;
  undo: () => void;
  pushSnapshot: (nodes: Node[], edges: Edge[]) => void;
}

const MAX_UNDO = 50;

export const useFlowStore = create<FlowStore>()(
  persist(
    (set, get) => ({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      _undoStack: [],

      setNodes: (nodes) => set({ nodes }),

      setEdges: (edges) => set({ edges }),

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
          const undoStack = [
            { nodes: state.nodes, edges: state.edges },
            ...state._undoStack,
          ].slice(0, MAX_UNDO);
          return {
            _undoStack: undoStack,
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
        set({ nodes: [], edges: [], selectedNodeId: null, _undoStack: [] });
      },

      undo: () =>
        set((state) => {
          if (state._undoStack.length === 0) return {};
          console.log("↩️ Undo");
          const [last, ...rest] = state._undoStack;
          return {
            nodes: last.nodes,
            edges: last.edges,
            selectedNodeId: null,
            _undoStack: rest,
          };
        }),

      pushSnapshot: (nodes: Node[], edges: Edge[]) =>
        set((state) => ({
          _undoStack: [{ nodes, edges }, ...state._undoStack].slice(
            0,
            MAX_UNDO,
          ),
        })),
    }),
    {
      name: "flowdefi-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        nodes: state.nodes,
        edges: state.edges,
        // selectedNodeId and _undoStack intentionally NOT persisted
      }),
    },
  ),
);
