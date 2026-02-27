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
  History,
  Clock,
  MoreHorizontal,
  X,
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
import { ExecutionHistoryPanel } from "./ExecutionHistoryPanel";
import { ScheduleDialog } from "./ScheduleDialog";

export function FlowControls() {
  const { nodes, edges, setNodes, setEdges } = useFlowStore();

  const isConnected = useWallet((s) => s.isConnected());
  const walletAddress = useWallet((s) => s.walletAddress());
  const wallets = useWallet((s) => s.wallets);

  const [flowName, setFlowName] = useState("My DeFi Flow");
  const [flowDescription, setFlowDescription] = useState(
    "Automated airdrop farming",
  );
  const [savedFlows, setSavedFlows] = useState<SavedFlow[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  // Desktop: draggable pill
  const [minimized, setMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [initialized, setInitialized] = useState(false);
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  // Mobile: bottom sheet open state
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

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
      if (isMobile) return;
      if (!(e.target as HTMLElement).closest("[data-drag-handle]")) return;
      e.preventDefault();
      dragging.current = true;
      dragOffset.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
    },
    [position, isMobile],
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
      } catch {}
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
    setMobileOpen(false);
  };

  const truncateAddress = (addr: string) =>
    `${addr.slice(0, 4)}...${addr.slice(-3)}`;

  if (!initialized) return null;

  // ── MOBILE LAYOUT ─────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        {/* Mobile FAB trigger */}
        <div style={{ position: "fixed", bottom: 20, right: 16, zIndex: 9999 }}>
          <button
            onClick={() => setMobileOpen((v) => !v)}
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: mobileOpen
                ? "rgba(34,211,238,0.2)"
                : "rgba(10,15,25,0.95)",
              border: "1px solid rgba(56,189,248,0.4)",
              backdropFilter: "blur(16px)",
              color: "rgb(34,211,238)",
              cursor: "pointer",
              boxShadow:
                "0 0 24px rgba(56,189,248,0.25), 0 8px 24px rgba(0,0,0,0.6)",
              transition: "all 0.2s",
            }}
          >
            {mobileOpen ? <X size={20} /> : <MoreHorizontal size={20} />}
          </button>
        </div>

        {/* Mobile bottom sheet */}
        {mobileOpen && (
          <>
            <div
              onClick={() => setMobileOpen(false)}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 9997,
                background: "rgba(0,0,0,0.5)",
                backdropFilter: "blur(2px)",
              }}
            />
            <div
              style={{
                position: "fixed",
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 9998,
                borderRadius: "16px 16px 0 0",
                background: "rgba(10,15,25,0.98)",
                border: "1px solid rgba(56,189,248,0.2)",
                borderBottom: "none",
                backdropFilter: "blur(20px)",
                padding: "8px 16px 32px",
                boxShadow: "0 -16px 48px rgba(0,0,0,0.6)",
              }}
            >
              {/* Drag handle */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  padding: "8px 0 12px",
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 4,
                    borderRadius: 2,
                    background: "rgba(56,189,248,0.3)",
                  }}
                />
              </div>

              {/* Label */}
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.15em",
                  color: "rgba(56,189,248,0.6)",
                  textTransform: "uppercase",
                  marginBottom: 16,
                  textAlign: "center",
                }}
              >
                Wraith Controls
              </div>

              {/* Action grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                <MobileBtn
                  icon={<Save size={18} />}
                  label="Save"
                  onClick={() => {
                    setSaveDialogOpen(true);
                    setMobileOpen(false);
                  }}
                />
                <MobileBtn
                  icon={<FolderOpen size={18} />}
                  label="Load"
                  onClick={() => {
                    handleOpenLoadDialog();
                    setMobileOpen(false);
                  }}
                />
                <MobileBtn
                  icon={<Download size={18} />}
                  label="Export"
                  onClick={() => {
                    handleExport();
                    setMobileOpen(false);
                  }}
                />
                <MobileBtn
                  icon={<Upload size={18} />}
                  label="Import"
                  asLabel
                  onImport={handleImport}
                  onClose={() => setMobileOpen(false)}
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 8,
                  marginBottom: 16,
                }}
              >
                <MobileBtn
                  icon={<Clock size={18} />}
                  label="Schedule"
                  onClick={() => {
                    setScheduleOpen(true);
                    setMobileOpen(false);
                  }}
                  active={scheduleOpen}
                />
                <MobileBtn
                  icon={<History size={18} />}
                  label="History"
                  onClick={() => {
                    setHistoryOpen(true);
                    setMobileOpen(false);
                  }}
                  active={historyOpen}
                />
                <MobileBtn
                  icon={<Wallet size={18} />}
                  label={
                    isConnected && walletAddress
                      ? truncateAddress(walletAddress)
                      : "Wallet"
                  }
                  onClick={() => {
                    setWalletModalOpen(true);
                    setMobileOpen(false);
                  }}
                  active={isConnected}
                  green={isConnected}
                />
                <div /> {/* spacer */}
              </div>

              {/* Run button */}
              <button
                onClick={handleRunClick}
                disabled={nodes.length === 0}
                style={{
                  width: "100%",
                  height: 48,
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  background:
                    nodes.length === 0
                      ? "rgba(34,197,94,0.15)"
                      : "linear-gradient(135deg, #22d3ee, #818cf8)",
                  color: nodes.length === 0 ? "rgba(34,197,94,0.4)" : "white",
                  border: "none",
                  cursor: nodes.length === 0 ? "not-allowed" : "pointer",
                  opacity: nodes.length === 0 ? 0.5 : 1,
                  boxShadow:
                    nodes.length > 0 ? "0 0 24px rgba(34,211,238,0.3)" : "none",
                }}
              >
                <Play size={16} />
                Execute Flow
              </button>
            </div>
          </>
        )}

        {/* Dialogs */}
        <SaveDialog
          open={saveDialogOpen}
          onOpenChange={setSaveDialogOpen}
          flowName={flowName}
          setFlowName={setFlowName}
          flowDescription={flowDescription}
          setFlowDescription={setFlowDescription}
          onSave={handleSave}
        />
        <LoadDialog
          open={loadDialogOpen}
          onOpenChange={setLoadDialogOpen}
          savedFlows={savedFlows}
          onLoad={handleLoad}
          onDelete={handleDeleteFlow}
        />
        {historyOpen && (
          <ExecutionHistoryPanel onClose={() => setHistoryOpen(false)} />
        )}
        <ScheduleDialog
          open={scheduleOpen}
          onClose={() => setScheduleOpen(false)}
        />
        <RunFlowDialog
          open={runDialogOpen}
          onClose={() => setRunDialogOpen(false)}
        />
        <WalletConnectModal
          open={walletModalOpen}
          onOpenChange={setWalletModalOpen}
        />
      </>
    );
  }

  // ── DESKTOP LAYOUT (original draggable pill) ───────────────────────────────
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
                  Wraith
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
              >
                {minimized ? (
                  <ChevronUp size={13} />
                ) : (
                  <ChevronDown size={13} />
                )}
              </button>
            </div>

            {/* Buttons */}
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
                <SaveDialog
                  open={saveDialogOpen}
                  onOpenChange={setSaveDialogOpen}
                  flowName={flowName}
                  setFlowName={setFlowName}
                  flowDescription={flowDescription}
                  setFlowDescription={setFlowDescription}
                  onSave={handleSave}
                  asToolBtn
                />

                {/* Load */}
                <LoadDialog
                  open={loadDialogOpen}
                  onOpenChange={setLoadDialogOpen}
                  savedFlows={savedFlows}
                  onLoad={handleLoad}
                  onDelete={handleDeleteFlow}
                  asToolBtn
                  onOpenTrigger={handleOpenLoadDialog}
                />

                <Divider />

                <ToolBtn title="Export as JSON" onClick={handleExport}>
                  <Download size={15} />
                </ToolBtn>

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

                <ToolBtn
                  title="Schedule Flow"
                  onClick={() => setScheduleOpen((v) => !v)}
                  active={scheduleOpen}
                >
                  <Clock size={15} />
                </ToolBtn>
                <ToolBtn
                  title="Execution History"
                  onClick={() => setHistoryOpen((v) => !v)}
                  active={historyOpen}
                >
                  <History size={15} />
                </ToolBtn>

                <Divider />

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
                      cursor: "pointer",
                    }}
                    onClick={() => setWalletModalOpen(true)}
                    title="Manage wallets"
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
                    {wallets.length > 1 && (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          padding: "1px 5px",
                          borderRadius: 999,
                          background: "rgba(34,211,238,0.15)",
                          color: "#22d3ee",
                          border: "1px solid rgba(34,211,238,0.25)",
                        }}
                      >
                        {wallets.length}
                      </span>
                    )}
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

      {historyOpen && (
        <ExecutionHistoryPanel onClose={() => setHistoryOpen(false)} />
      )}
      <ScheduleDialog
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
      />
      <RunFlowDialog
        open={runDialogOpen}
        onClose={() => setRunDialogOpen(false)}
      />
      <WalletConnectModal
        open={walletModalOpen}
        onOpenChange={setWalletModalOpen}
      />
    </>
  );
}

// ── Mobile Button ──────────────────────────────────────────────────────────────

function MobileBtn({
  icon,
  label,
  onClick,
  active,
  green,
  asLabel,
  onImport,
  onClose,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
  green?: boolean;
  asLabel?: boolean;
  onImport?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClose?: () => void;
}) {
  const style: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    height: 64,
    borderRadius: 12,
    border: `1px solid ${active && green ? "rgba(34,197,94,0.3)" : active ? "rgba(56,189,248,0.3)" : "rgba(56,189,248,0.1)"}`,
    background:
      active && green
        ? "rgba(34,197,94,0.1)"
        : active
          ? "rgba(56,189,248,0.12)"
          : "rgba(20,28,48,0.6)",
    color:
      active && green
        ? "#22c55e"
        : active
          ? "rgb(56,189,248)"
          : "rgba(148,163,184,0.8)",
    cursor: "pointer",
    fontSize: 9,
    fontWeight: 600,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
  };

  if (asLabel) {
    return (
      <label style={{ ...style, cursor: "pointer" }}>
        {icon}
        <span>{label}</span>
        <input
          type="file"
          accept=".json"
          className="hidden"
          onChange={(e) => {
            onImport?.(e);
            onClose?.();
          }}
        />
      </label>
    );
  }

  return (
    <button onClick={onClick} style={style}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

// ── Shared Dialogs ─────────────────────────────────────────────────────────────

function SaveDialog({
  open,
  onOpenChange,
  flowName,
  setFlowName,
  flowDescription,
  setFlowDescription,
  onSave,
  asToolBtn,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  flowName: string;
  setFlowName: (v: string) => void;
  flowDescription: string;
  setFlowDescription: (v: string) => void;
  onSave: () => void;
  asToolBtn?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {asToolBtn && (
        <DialogTrigger asChild>
          <ToolBtn title="Save Flow">
            <Save size={15} />
          </ToolBtn>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save Flow</DialogTitle>
          <DialogDescription>Save your flow to load it later</DialogDescription>
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
          <Button onClick={onSave}>Save Flow</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LoadDialog({
  open,
  onOpenChange,
  savedFlows,
  onLoad,
  onDelete,
  asToolBtn,
  onOpenTrigger,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  savedFlows: SavedFlow[];
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
  asToolBtn?: boolean;
  onOpenTrigger?: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {asToolBtn && (
        <DialogTrigger asChild>
          <ToolBtn title="Load Flow" onClick={onOpenTrigger}>
            <FolderOpen size={15} />
          </ToolBtn>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Load Flow</DialogTitle>
          <DialogDescription>Select a saved flow to load</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {savedFlows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No saved flows yet.
            </p>
          ) : (
            savedFlows.map((flow) => (
              <Card key={flow.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold truncate">{flow.name}</h4>
                    <p className="text-sm text-muted-foreground truncate">
                      {flow.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {flow.nodes.length} nodes · Updated{" "}
                      {new Date(flow.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" onClick={() => onLoad(flow.id)}>
                      Load
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDelete(flow.id)}
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
  );
}

// ── Desktop ToolBtn ────────────────────────────────────────────────────────────

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
  active,
}: {
  children: React.ReactNode;
  title?: string;
  onClick?: () => void;
  disabled?: boolean;
  highlight?: boolean;
  walletBtn?: boolean;
  asLabel?: boolean;
  active?: boolean;
}) {
  const base: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 32,
    borderRadius: 7,
    border: "none",
    background: active ? "rgba(56,189,248,0.15)" : "transparent",
    cursor: disabled ? "not-allowed" : "pointer",
    color: highlight
      ? disabled
        ? "rgba(34,197,94,0.3)"
        : "rgb(34,197,94)"
      : active
        ? "rgb(56,189,248)"
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
