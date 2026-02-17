"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Save,
  FolderOpen,
  Download,
  Upload,
  Play,
  Trash2,
  GripHorizontal,
  ChevronUp,
  ChevronDown,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFlowStore } from "@/lib/hooks/useFlowStore";
import { useWallet } from "@/lib/hooks/useWallet";
import { flowStorage, type SavedFlow } from "@/lib/utils/flowStorage";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { RunFlowDialog } from "./RunFlowDialog";
import { WalletConnectModal } from "@/app/components/WalletConnectModal";

export function FlowControls() {
  const { nodes, edges, setNodes, setEdges } = useFlowStore();
  const { isConnected, walletAddress } = useWallet();

  const [flowName, setFlowName] = useState("My DeFi Flow");
  const [flowDescription, setFlowDescription] = useState(
    "Automated airdrop farming",
  );
  const [savedFlows, setSavedFlows] = useState<SavedFlow[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);

  // Draggable + minimizable
  const [minimized, setMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [initialized, setInitialized] = useState(false);
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!initialized && typeof window !== "undefined") {
      setPosition({
        x: window.innerWidth / 2 - 160,
        y: window.innerHeight - 100,
      });
      setInitialized(true);
    }
  }, [initialized]);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!(e.target as HTMLElement).closest("[data-drag-handle]")) return;
      e.preventDefault();
      dragging.current = true;
      dragOffset.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
    },
    [position],
  );

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const newX = e.clientX - dragOffset.current.x;
      const newY = e.clientY - dragOffset.current.y;
      const maxX = window.innerWidth - (cardRef.current?.offsetWidth ?? 320);
      const maxY = window.innerHeight - (cardRef.current?.offsetHeight ?? 60);
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    };
    const onMouseUp = () => {
      dragging.current = false;
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const handleSave = () => {
    flowStorage.saveFlow(flowName, flowDescription, nodes, edges);
    setSaveDialogOpen(false);
  };

  const handleLoad = (flowId: string) => {
    const flow = flowStorage.loadFlow(flowId);
    if (flow) {
      setNodes(flow.nodes);
      setEdges(flow.edges);
      setFlowName(flow.name);
      setFlowDescription(flow.description);
      setLoadDialogOpen(false);
    }
  };

  const handleExport = () => {
    const flow: SavedFlow = {
      id: `flow-${Date.now()}`,
      name: flowName,
      description: flowDescription,
      nodes,
      edges,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    flowStorage.exportFlow(flow);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const flow = await flowStorage.importFlow(file);
        setNodes(flow.nodes);
        setEdges(flow.edges);
        setFlowName(flow.name);
        setFlowDescription(flow.description);
      } catch {
        // silently fail
      }
    }
  };

  const handleOpenLoadDialog = () => {
    setSavedFlows(flowStorage.getAllFlows());
    setLoadDialogOpen(true);
  };

  const handleDeleteFlow = (flowId: string) => {
    flowStorage.deleteFlow(flowId);
    setSavedFlows(flowStorage.getAllFlows());
  };

  const handleRunClick = () => {
    if (!isConnected) {
      setWalletModalOpen(true);
      return;
    }
    setRunDialogOpen(true);
  };

  const truncateAddress = (addr: string) =>
    `${addr.slice(0, 4)}...${addr.slice(-3)}`;

  if (!initialized) return null;

  return (
    <>
      <div
        ref={cardRef}
        onMouseDown={onMouseDown}
        style={{
          position: "fixed",
          left: position.x,
          top: position.y,
          zIndex: 9999,
          userSelect: "none",
        }}
      >
        {/* Glow border */}
        <div
          style={{
            borderRadius: 14,
            padding: 1,
            background:
              "linear-gradient(135deg, rgba(56,189,248,0.35) 0%, rgba(139,92,246,0.25) 100%)",
            boxShadow:
              "0 0 24px rgba(56,189,248,0.15), 0 8px 32px rgba(0,0,0,0.5)",
          }}
        >
          <div
            style={{
              borderRadius: 13,
              background: "rgba(10,15,25,0.92)",
              backdropFilter: "blur(16px)",
              overflow: "hidden",
            }}
          >
            {/* Drag handle */}
            <div
              data-drag-handle="true"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "5px 10px 4px",
                cursor: "grab",
                borderBottom: minimized
                  ? "none"
                  : "1px solid rgba(56,189,248,0.1)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <GripHorizontal
                  size={13}
                  style={{
                    color: "rgba(56,189,248,0.5)",
                    pointerEvents: "none",
                  }}
                />
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: "0.12em",
                    color: "rgba(56,189,248,0.6)",
                    textTransform: "uppercase",
                    pointerEvents: "none",
                  }}
                >
                  FlowDeFi
                </span>
              </div>
              <button
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => setMinimized((v) => !v)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "rgba(56,189,248,0.5)",
                  display: "flex",
                  alignItems: "center",
                  padding: 2,
                  borderRadius: 4,
                }}
                title={minimized ? "Expand" : "Minimize"}
              >
                {minimized ? (
                  <ChevronUp size={13} />
                ) : (
                  <ChevronDown size={13} />
                )}
              </button>
            </div>

            {/* Toolbar buttons */}
            {!minimized && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  padding: "6px 8px",
                }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                {/* Save */}
                <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                  <DialogTrigger asChild>
                    <ToolBtn title="Save Flow">
                      <Save size={15} />
                    </ToolBtn>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Save Flow</DialogTitle>
                      <DialogDescription>
                        Save your flow to load it later
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Flow Name</Label>
                        <Input
                          value={flowName}
                          onChange={(e) => setFlowName(e.target.value)}
                          placeholder="LayerZero Farmer"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Input
                          value={flowDescription}
                          onChange={(e) => setFlowDescription(e.target.value)}
                          placeholder="Daily farming across 20 wallets"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleSave}>Save Flow</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Load */}
                <Dialog open={loadDialogOpen} onOpenChange={setLoadDialogOpen}>
                  <DialogTrigger asChild>
                    <ToolBtn title="Load Flow" onClick={handleOpenLoadDialog}>
                      <FolderOpen size={15} />
                    </ToolBtn>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Load Flow</DialogTitle>
                      <DialogDescription>
                        Select a saved flow to load
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {savedFlows.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          No saved flows yet.
                        </p>
                      ) : (
                        savedFlows.map((flow) => (
                          <Card key={flow.id} className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-semibold">{flow.name}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {flow.description}
                                </p>
                                <p className="text-xs text-muted-foreground mt-2">
                                  {flow.nodes.length} nodes · Updated{" "}
                                  {new Date(
                                    flow.updatedAt,
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleLoad(flow.id)}
                                >
                                  Load
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteFlow(flow.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))
                      )}
                    </div>
                  </DialogContent>
                </Dialog>

                <Divider />

                {/* Export */}
                <ToolBtn title="Export as JSON" onClick={handleExport}>
                  <Download size={15} />
                </ToolBtn>

                {/* Import */}
                <ToolBtn title="Import from JSON" asLabel>
                  <Upload size={15} />
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleImport}
                  />
                </ToolBtn>

                <Divider />

                {/* Wallet status OR connect button */}
                {isConnected && walletAddress ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "0 8px",
                      height: 32,
                      borderRadius: 7,
                      background: "rgba(34,197,94,0.08)",
                      border: "1px solid rgba(34,197,94,0.2)",
                    }}
                  >
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#22c55e",
                        boxShadow: "0 0 6px #22c55e",
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 10,
                        fontFamily: "monospace",
                        color: "rgba(34,197,94,0.9)",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {truncateAddress(walletAddress)}
                    </span>
                  </div>
                ) : (
                  <ToolBtn
                    title="Connect Wallet"
                    onClick={() => setWalletModalOpen(true)}
                    walletBtn
                  >
                    <Wallet size={15} />
                  </ToolBtn>
                )}

                <Divider />

                {/* Run */}
                <ToolBtn
                  title={
                    nodes.length === 0
                      ? "Add nodes first"
                      : !isConnected
                        ? "Connect wallet to run"
                        : "Run Flow"
                  }
                  disabled={nodes.length === 0}
                  highlight
                  onClick={handleRunClick}
                >
                  <Play size={15} />
                </ToolBtn>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Run flow dialog */}
      <RunFlowDialog
        open={runDialogOpen}
        onClose={() => setRunDialogOpen(false)}
      />

      {/* Wallet connect modal */}
      <WalletConnectModal
        open={walletModalOpen}
        onOpenChange={setWalletModalOpen}
      />
    </>
  );
}

// ── Helpers ──────────────────────────────────────────────────

function Divider() {
  return (
    <div
      style={{
        width: 1,
        height: 22,
        background: "rgba(56,189,248,0.15)",
        margin: "0 4px",
        flexShrink: 0,
      }}
    />
  );
}

function ToolBtn({
  children,
  title,
  onClick,
  disabled,
  highlight,
  walletBtn,
  asLabel,
}: {
  children: React.ReactNode;
  title?: string;
  onClick?: () => void;
  disabled?: boolean;
  highlight?: boolean;
  walletBtn?: boolean;
  asLabel?: boolean;
}) {
  const base: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 32,
    borderRadius: 7,
    border: "none",
    background: "transparent",
    cursor: disabled ? "not-allowed" : "pointer",
    color: highlight
      ? disabled
        ? "rgba(34,197,94,0.3)"
        : "rgb(34,197,94)"
      : walletBtn
        ? "rgba(56,189,248,0.7)"
        : "rgba(148,163,184,0.8)",
    opacity: disabled ? 0.4 : 1,
    transition: "background 0.15s, color 0.15s",
  };

  const hoverStyle = `
    .tool-btn:hover { background: rgba(56,189,248,0.1) !important; color: rgb(56,189,248) !important; }
    .tool-btn-green:hover { background: rgba(34,197,94,0.1) !important; color: rgb(34,197,94) !important; }
    .tool-btn-wallet:hover { background: rgba(56,189,248,0.15) !important; color: rgb(56,189,248) !important; }
  `;

  const className = highlight
    ? "tool-btn-green"
    : walletBtn
      ? "tool-btn-wallet"
      : "tool-btn";

  if (asLabel)
    return (
      <>
        <style>{hoverStyle}</style>
        <label
          title={title}
          className={className}
          style={{ ...base, cursor: "pointer" }}
        >
          {children}
        </label>
      </>
    );

  return (
    <>
      <style>{hoverStyle}</style>
      <button
        title={title}
        onClick={onClick}
        disabled={disabled}
        className={className}
        style={base}
      >
        {children}
      </button>
    </>
  );
}
