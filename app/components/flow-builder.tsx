"use client";

import { useCallback, useRef } from "react";
import {
  ReactFlow,
  Background,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
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

// nodeTypes must be defined OUTSIDE the component — if defined inside,
// React sees a new object every render and remounts all nodes.
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

export function FlowBuilder() {
  // Read from store
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const setNodes = useFlowStore((s) => s.setNodes);
  const setEdges = useFlowStore((s) => s.setEdges);
  const setSelectedNode = useFlowStore((s) => s.setSelectedNode);
  const deleteNode = useFlowStore((s) => s.deleteNode);

  // FIX: Use refs to always have the latest nodes/edges in callbacks
  // without re-creating the callbacks on every render. This prevents
  // the stale closure bug where changes stomp each other.
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const edgesRef = useRef(edges);
  edgesRef.current = edges;

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // applyNodeChanges needs the current nodes — use ref, not closure
      const updated = applyNodeChanges(changes, nodesRef.current) as Node[];
      setNodes(updated);
    },
    [setNodes], // setNodes is stable (from zustand), no need for nodes in deps
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const updated = applyEdgeChanges(changes, edgesRef.current) as Edge[];
      setEdges(updated);
    },
    [setEdges],
  );

  const onConnect: OnConnect = useCallback(
    (connection) => {
      console.log("🔗 Connect:", connection.source, "→", connection.target);
      setEdges(addEdge(connection, edgesRef.current));
    },
    [setEdges],
  );

  // FIX: onNodeClick receives the clicked node — pass it to store
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      console.log("👆 Clicked node:", node.id, node.type);
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
    <div className="h-screen w-full relative">
      <Header />

      <div className="absolute inset-0 pt-14">
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
  );
}
