"use client";

import { useCallback, useRef, useEffect, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  useReactFlow,
  type OnConnect,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  BackgroundVariant,
  type NodeTypes,
  Panel,
} from "@xyflow/react";
import { TriggerNode } from "./nodes/TriggerNode";
import { MultiWalletNode } from "./nodes/MultiWalletNode";
import { SwapNode } from "./nodes/SwapNode";
import { BridgeNode } from "./nodes/BridgeNode";
import { ChainSwitchNode } from "./nodes/ChainSwitchNode";
import { AlertNode } from "./nodes/AlertNode";
import { ConditionNode } from "./nodes/ConditionNode";
import { WalletConnectNode } from "./nodes/WalletConnectNode";
import { LendStakeNode } from "./nodes/LendStakeNode";
import { TwitterTaskNode } from "./nodes/TwitterTaskNode";
import { DiscordTaskNode } from "./nodes/DiscordTaskNode";
import { GalxeTaskNode } from "./nodes/GalxeTaskNode";
import { VolumeFarmerNode } from "./nodes/VolumeFarmerNode";
import { ClaimAirdropNode } from "./nodes/ClaimAirdropNode";
import { WaitDelayNode } from "./nodes/WaitDelayNode";
import { LoopNode } from "./nodes/LoopNode";
import { PriceCheckNode } from "./nodes/PriceCheckNode";
import { GasOptimizerNode } from "./nodes/GasOptimizerNode";
import { Toolbar } from "./panels/Toolbar";
import { NodePropertiesPanel } from "./panels/NodePropertiesPanel";
import { FlowControls } from "./panels/FlowControls";
import { Header } from "./Header";
import { useFlowStore } from "@/lib/hooks/useFlowStore";
import { Maximize2 } from "lucide-react";

const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  multiWallet: MultiWalletNode,
  swap: SwapNode,
  bridge: BridgeNode,
  chainSwitch: ChainSwitchNode,
  alert: AlertNode,
  condition: ConditionNode,
  walletConnect: WalletConnectNode,
  lendStake: LendStakeNode,
  twitter: TwitterTaskNode,
  discord: DiscordTaskNode,
  galxe: GalxeTaskNode,
  volumeFarmer: VolumeFarmerNode,
  claimAirdrop: ClaimAirdropNode,
  waitDelay: WaitDelayNode,
  loop: LoopNode,
  priceCheck: PriceCheckNode,
  gasOptimizer: GasOptimizerNode,
};

function FitViewBridge({ onReady }: { onReady: (fn: () => void) => void }) {
  const { fitView } = useReactFlow();
  onReady(() => {
    fitView({ padding: 0.18, minZoom: 0.55, maxZoom: 0.85, duration: 400 });
  });
  return null;
}

function FlowInner({
  registerFitView,
}: {
  registerFitView: (fn: () => void) => void;
}) {
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const setNodes = useFlowStore((s) => s.setNodes);
  const setEdges = useFlowStore((s) => s.setEdges);
  const setSelectedNode = useFlowStore((s) => s.setSelectedNode);
  const deleteNode = useFlowStore((s) => s.deleteNode);
  const undo = useFlowStore((s) => s.undo);
  const { fitView } = useReactFlow();

  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const edgesRef = useRef(edges);
  edgesRef.current = edges;

  // ── Ctrl+Z undo ──────────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const removeChanges = changes.filter((c) => c.type === "remove");
      if (removeChanges.length > 0) {
        const currentNodes = nodesRef.current;
        const currentEdges = edgesRef.current;
        useFlowStore.getState().pushSnapshot(currentNodes, currentEdges);
        setNodes(applyNodeChanges(changes, currentNodes) as Node[]);
        const removedIds = removeChanges.map((c) => (c as { id: string }).id);
        setEdges(
          currentEdges.filter(
            (e) =>
              !removedIds.includes(e.source) && !removedIds.includes(e.target),
          ),
        );
      } else {
        setNodes(applyNodeChanges(changes, nodesRef.current) as Node[]);
      }
    },
    [setNodes, setEdges],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges(applyEdgeChanges(changes, edgesRef.current) as Edge[]);
    },
    [setEdges],
  );

  const onConnect: OnConnect = useCallback(
    (connection) => {
      setEdges(addEdge(connection, edgesRef.current));
    },
    [setEdges],
  );

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setSelectedNode(node);
    },
    [setSelectedNode],
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onNodeClick={onNodeClick}
      onPaneClick={onPaneClick}
      nodeTypes={nodeTypes}
      deleteKeyCode={["Backspace", "Delete"]}
      // ── Selection: hold Ctrl/Cmd to box-select, never hijack plain drag ──
      selectionKeyCode="Control"
      multiSelectionKeyCode="Control"
      // ── Pan on plain drag, select only with Ctrl held ──────────────────
      panOnDrag={true}
      selectionOnDrag={false}
      // ── Zoom ───────────────────────────────────────────────────────────
      panOnScroll={false}
      zoomOnScroll={true}
      zoomOnPinch={true}
      zoomActivationKeyCode={null}
      minZoom={0.1}
      maxZoom={2}
      // ── Interaction ────────────────────────────────────────────────────
      nodesDraggable={true}
      nodesConnectable={true}
      nodesFocusable={true}
      edgesFocusable={true}
      elementsSelectable={true}
      autoPanOnConnect={true}
      autoPanOnNodeDrag={true}
      // ── Initial view ───────────────────────────────────────────────────
      fitView
      fitViewOptions={{ maxZoom: 1 }}
      className="bg-transparent w-full h-full"
      style={{ touchAction: "none" }}
      defaultEdgeOptions={{
        animated: true,
        style: { stroke: "rgb(56 189 248 / 0.6)", strokeWidth: 2 },
      }}
      proOptions={{ hideAttribution: true }}
      translateExtent={[
        [-Infinity, -Infinity],
        [Infinity, Infinity],
      ]}
    >
      <FitViewBridge onReady={registerFitView} />

      <Background
        variant={BackgroundVariant.Dots}
        gap={16}
        size={1}
        className="opacity-30"
        color="#22d3ee"
      />

      {/* Fit-view button — always visible, bottom-left */}
      <Panel position="bottom-left" className="mb-4 ml-4">
        <button
          onClick={() =>
            fitView({ padding: 0.18, minZoom: 0.3, maxZoom: 1, duration: 400 })
          }
          title="Fit all nodes into view"
          style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(10,15,35,0.85)",
            border: "1px solid rgba(34,211,238,0.2)",
            backdropFilter: "blur(12px)",
            color: "rgba(34,211,238,0.7)",
            cursor: "pointer",
            boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background =
              "rgba(34,211,238,0.15)";
            (e.currentTarget as HTMLElement).style.color = "#22d3ee";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background =
              "rgba(10,15,35,0.85)";
            (e.currentTarget as HTMLElement).style.color =
              "rgba(34,211,238,0.7)";
          }}
        >
          <Maximize2 size={15} />
        </button>
      </Panel>
    </ReactFlow>
  );
}

export function FlowBuilder() {
  const fitViewFnRef = useRef<(() => void) | null>(null);

  const handleTemplateLoad = useCallback(() => {
    setTimeout(() => {
      fitViewFnRef.current?.();
    }, 80);
  }, []);

  const registerFitView = useCallback((fn: () => void) => {
    fitViewFnRef.current = fn;
  }, []);

  return (
    <ReactFlowProvider>
      <div className="h-screen w-full relative" style={{ touchAction: "none" }}>
        <Header onTemplateLoad={handleTemplateLoad} />

        <div className="absolute inset-0 pt-14">
          <FlowInner registerFitView={registerFitView} />
        </div>

        <div className="absolute inset-0 pt-14 pointer-events-none">
          <div className="pointer-events-auto">
            <Toolbar />
          </div>
          <div className="pointer-events-auto">
            <FlowControls />
          </div>
          <div className="pointer-events-auto">
            <NodePropertiesPanel />
          </div>
        </div>
      </div>
    </ReactFlowProvider>
  );
}
