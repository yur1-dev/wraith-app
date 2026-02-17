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
  type NodeChange,
  type EdgeChange,
  BackgroundVariant,
  type NodeTypes,
  Panel,
  PanOnScrollMode,
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
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);

  const setNodes = useFlowStore((s) => s.setNodes);
  const setEdges = useFlowStore((s) => s.setEdges);
  const setSelectedNode = useFlowStore((s) => s.setSelectedNode);
  const addNode = useFlowStore((s) => s.addNode);
  const updateNodeData = useFlowStore((s) => s.updateNodeData);

  const nodesWithHandlers = nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      onColorChange: (color: string | undefined) => {
        updateNodeData(node.id, { customColor: color });
      },
    },
  }));

  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes(applyNodeChanges(changes, useFlowStore.getState().nodes));
    },
    [setNodes],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges(applyEdgeChanges(changes, useFlowStore.getState().edges));
    },
    [setEdges],
  );

  const onConnect: OnConnect = useCallback(
    (connection) => {
      setEdges(addEdge(connection, useFlowStore.getState().edges));
    },
    [setEdges],
  );

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      window.dispatchEvent(new Event("closeColorMenus"));
      setSelectedNode(node);
    },
    [setSelectedNode],
  );

  const onPaneClick = useCallback(() => {
    window.dispatchEvent(new Event("closeColorMenus"));
  }, []);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData("application/reactflow");
      if (!type) return;

      if (!reactFlowWrapper.current) return;

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();

      const position = {
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      };

      addNode(type, position);
    },
    [addNode],
  );

  return (
    <div className="h-screen w-full relative">
      <Header />

      <div className="h-full pt-16">
        <Toolbar />
        <FlowControls />
        <NodePropertiesPanel />

        <div className="h-full" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodesWithHandlers}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            deleteKeyCode={["Backspace", "Delete"]}
            selectionKeyCode="Control"
            multiSelectionKeyCode="Control"
            panOnDrag={true}
            selectionOnDrag={true}
            panOnScroll={true}
            zoomOnScroll={true}
            zoomOnPinch={true}
            panOnScrollMode={PanOnScrollMode.Free}
            nodesDraggable={true}
            nodesConnectable={true}
            nodesFocusable={true}
            edgesFocusable={true}
            elementsSelectable={true}
            autoPanOnConnect={true}
            autoPanOnNodeDrag={true}
            className="bg-transparent"
            defaultEdgeOptions={{
              animated: true,
              style: { stroke: "rgb(56 189 248 / 0.6)", strokeWidth: 2 },
            }}
            proOptions={{ hideAttribution: true }}
          >
            <Background
              variant={BackgroundVariant.Lines}
              gap={80}
              className="opacity-10"
              color="#22d3ee"
            />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}
