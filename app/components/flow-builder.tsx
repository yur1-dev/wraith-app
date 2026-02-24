"use client";

import { useCallback, useRef } from "react";
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
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

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

// ─── FitViewBridge ────────────────────────────────────────────────────────────
// Rendered as a child of <ReactFlow> so useReactFlow() is valid here.
// Registers the fitView fn upward via a ref callback on mount.
function FitViewBridge({ onReady }: { onReady: (fn: () => void) => void }) {
  const { fitView } = useReactFlow();
  // Run once on mount to register the fn
  useCallback(() => {}, [])(); // dummy to keep hook count stable
  // Register immediately (this runs every render but the ref just gets updated)
  onReady(() => {
    fitView({ padding: 0.18, minZoom: 0.55, maxZoom: 0.85, duration: 400 });
  });
  return null;
}

// ─── FlowInner ────────────────────────────────────────────────────────────────
// Contains <ReactFlow>. Does NOT call useReactFlow() itself —
// only FitViewBridge (a child) does that.
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

  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const edgesRef = useRef(edges);
  edgesRef.current = edges;

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes(applyNodeChanges(changes, nodesRef.current) as Node[]);
    },
    [setNodes],
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

  const deleteSelectedNodes = useCallback(() => {
    const selectedIds = nodesRef.current
      .filter((n) => n.selected)
      .map((n) => n.id);
    if (selectedIds.length === 0) return;
    selectedIds.forEach((id) => deleteNode(id));
    setSelectedNode(null);
  }, [deleteNode, setSelectedNode]);

  const selectedNodesCount = nodes.filter((n) => n.selected).length;

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
      selectionKeyCode="Control"
      multiSelectionKeyCode="Control"
      panOnDrag={true}
      selectionOnDrag={true}
      panOnScroll={true}
      zoomOnScroll={true}
      zoomOnPinch={true}
      nodesDraggable={true}
      nodesConnectable={true}
      nodesFocusable={true}
      edgesFocusable={true}
      elementsSelectable={true}
      autoPanOnConnect={true}
      autoPanOnNodeDrag={true}
      fitView
      fitViewOptions={{ maxZoom: 1 }}
      className="bg-transparent w-full h-full"
      defaultEdgeOptions={{
        animated: true,
        style: { stroke: "rgb(56 189 248 / 0.6)", strokeWidth: 2 },
      }}
      proOptions={{ hideAttribution: true }}
    >
      {/* Lives inside ReactFlow — useReactFlow() is valid here */}
      <FitViewBridge onReady={registerFitView} />

      <Background
        variant={BackgroundVariant.Dots}
        gap={16}
        size={1}
        className="opacity-30"
        color="#22d3ee"
      />

      {selectedNodesCount > 0 && (
        <Panel position="bottom-center" className="mb-6">
          <div
            className="rounded-xl px-5 py-3 flex items-center gap-4 shadow-2xl"
            style={{
              background: "rgba(20, 26, 42, 0.9)",
              border: "1px solid rgba(56, 189, 248, 0.15)",
              backdropFilter: "blur(20px)",
            }}
          >
            <span className="text-sm text-cyan-400 font-medium">
              {selectedNodesCount} selected
            </span>
            <div className="w-px h-5 bg-white/10" />
            <Button
              size="sm"
              variant="ghost"
              onClick={deleteSelectedNodes}
              className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-medium"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </Panel>
      )}
    </ReactFlow>
  );
}

// ─── FlowBuilder ──────────────────────────────────────────────────────────────
// Wraps everything in ReactFlowProvider so the internal zustand store
// is available to Header, TemplatesGallery, and all panel components.
export function FlowBuilder() {
  // fitViewFnRef stores the actual fitView fn once FitViewBridge registers it
  const fitViewFnRef = useRef<(() => void) | null>(null);

  // Called by TemplatesGallery (via Header) after nodes/edges are set
  const handleTemplateLoad = useCallback(() => {
    setTimeout(() => {
      fitViewFnRef.current?.();
    }, 80);
  }, []);

  // Called by FitViewBridge on every render — just updates the ref
  const registerFitView = useCallback((fn: () => void) => {
    fitViewFnRef.current = fn;
  }, []);

  return (
    <ReactFlowProvider>
      <div className="h-screen w-full relative">
        <Header onTemplateLoad={handleTemplateLoad} />

        <div className="absolute inset-0 pt-14">
          <FlowInner registerFitView={registerFitView} />
        </div>

        {/* UI panels float above canvas */}
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
