"use client";

import { useFlowStore } from "@/lib/hooks/useFlowStore";
import { Input } from "@/components/ui/input";
import {
  X,
  Trash2,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  ChevronDown,
  Check,
} from "lucide-react";
import { useTelegram } from "@/lib/hooks/useTelegram";
import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

const str = (val: unknown, fallback = ""): string =>
  typeof val === "string" ? val : fallback;

const bool = (val: unknown, fallback = false): boolean =>
  typeof val === "boolean" ? val : fallback;

const walletList = (val: unknown): string[] =>
  Array.isArray(val) ? (val as string[]) : [];

const NODE_COLORS: Record<string, string> = {
  trigger: "#a855f7",
  multiWallet: "#f97316",
  swap: "#3b82f6",
  bridge: "#06b6d4",
  chainSwitch: "#8b5cf6",
  alert: "#f59e0b",
  condition: "#eab308",
  walletConnect: "#10b981",
  lendStake: "#10b981",
  twitter: "#38bdf8",
  discord: "#818cf8",
  galxe: "#a78bfa",
  volumeFarmer: "#f59e0b",
  claimAirdrop: "#f43f5e",
  waitDelay: "#94a3b8",
  loop: "#e879f9",
  priceCheck: "#2dd4bf",
  gasOptimizer: "#84cc16",
};

const NODE_LABELS: Record<string, string> = {
  trigger: "TRIGGER",
  multiWallet: "MULTI-WALLET",
  swap: "TOKEN SWAP",
  bridge: "BRIDGE",
  chainSwitch: "CHAIN SWITCH",
  alert: "ALERT",
  condition: "CONDITION",
  walletConnect: "WALLET CONNECT",
  lendStake: "LEND / STAKE",
  twitter: "TWITTER TASK",
  discord: "DISCORD TASK",
  galxe: "GALXE TASK",
  volumeFarmer: "VOLUME FARMER",
  claimAirdrop: "CLAIM AIRDROP",
  waitDelay: "WAIT / DELAY",
  loop: "LOOP",
  priceCheck: "PRICE CHECK",
  gasOptimizer: "GAS OPTIMIZER",
};

const SEVERITY_COLORS: Record<string, string> = {
  info: "#38bdf8",
  success: "#34d399",
  warning: "#fbbf24",
  urgent: "#f87171",
};

// ── Reusable primitives ───────────────────────────────────────────────────────

function FieldGroup({ children }: { children: React.ReactNode }) {
  return <div className="space-y-1.5">{children}</div>;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[9px] font-mono font-bold tracking-widest text-slate-500 uppercase">
      {children}
    </div>
  );
}

function StyledInput(props: React.ComponentProps<typeof Input>) {
  return (
    <Input
      {...props}
      className={`h-8 bg-slate-950 border-slate-700/80 text-cyan-100 text-xs font-mono
        focus:border-cyan-500 focus:ring-0 focus:ring-offset-0
        placeholder:text-slate-600 transition-colors
        ${props.className ?? ""}`}
    />
  );
}

function StyledTextarea(
  props: React.ComponentProps<"textarea"> & { rows?: number },
) {
  return (
    <textarea
      {...props}
      className={`w-full bg-slate-950 border border-slate-700/80 text-cyan-100 text-xs font-mono
        rounded-md px-3 py-2 focus:outline-none focus:border-cyan-500
        placeholder:text-slate-600 resize-none transition-colors
        ${props.className ?? ""}`}
    />
  );
}

function StyledCheckbox({
  id,
  checked,
  onChange,
  label,
}: {
  id: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label: string;
}) {
  return (
    <label
      htmlFor={id}
      className="flex items-center gap-2.5 cursor-pointer group"
    >
      <div className="relative">
        <input
          type="checkbox"
          id={id}
          checked={checked}
          onChange={onChange}
          className="sr-only"
        />
        <div
          className={`w-4 h-4 rounded border transition-all ${
            checked
              ? "bg-cyan-500 border-cyan-500"
              : "bg-slate-950 border-slate-600 group-hover:border-cyan-500/50"
          }`}
        >
          {checked && (
            <svg
              viewBox="0 0 10 8"
              className="w-full h-full p-0.5 text-slate-950"
            >
              <path
                d="M1 4l2.5 2.5L9 1"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
          )}
        </div>
      </div>
      <span className="text-xs font-mono text-slate-400 group-hover:text-cyan-400 transition-colors">
        {label}
      </span>
    </label>
  );
}

// ── Portal dropdown — renders outside panel so it's never clipped ─────────────
function StyledSelect({
  options,
  value,
  onChange,
  accent,
  placeholder,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  accent: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownHeight = Math.min(options.length * 36 + 8, 220);
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const showAbove = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

    setDropdownStyle({
      position: "fixed",
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      zIndex: 99999,
      top: showAbove
        ? `${rect.top - dropdownHeight - 4}px`
        : `${rect.bottom + 4}px`,
    });
  }, [options.length]);

  const handleOpen = () => {
    updatePosition();
    setOpen((o) => !o);
  };

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      )
        return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, updatePosition]);

  const dropdown = open ? (
    <div
      ref={dropdownRef}
      style={{
        ...dropdownStyle,
        background: "rgba(2, 6, 23, 0.99)",
        border: `1px solid ${accent}44`,
        borderRadius: "8px",
        boxShadow: `0 16px 48px rgba(0,0,0,0.9), 0 0 24px ${accent}15`,
        backdropFilter: "blur(24px)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "1px",
          background: `linear-gradient(90deg, ${accent}90, transparent 70%)`,
        }}
      />
      <div style={{ padding: "4px 0", maxHeight: "210px", overflowY: "auto" }}>
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2
                text-xs font-mono cursor-pointer transition-all duration-100"
              style={
                active
                  ? { background: `${accent}18`, color: accent }
                  : {
                      color: "rgba(148,163,184,0.75)",
                      background: "transparent",
                    }
              }
              onMouseEnter={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    `${accent}0d`;
                  (e.currentTarget as HTMLButtonElement).style.color =
                    "rgba(203,213,225,0.9)";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "transparent";
                  (e.currentTarget as HTMLButtonElement).style.color =
                    "rgba(148,163,184,0.75)";
                }
              }}
            >
              <span>{opt.label}</span>
              {active && (
                <Check className="w-3 h-3 shrink-0" style={{ color: accent }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  ) : null;

  return (
    <div className="relative w-full">
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        className="w-full h-8 flex items-center justify-between px-3 rounded-md text-xs font-mono
          transition-all duration-150 cursor-pointer"
        style={{
          background: open ? `${accent}12` : "rgba(2, 6, 23, 0.9)",
          border: open
            ? `1px solid ${accent}55`
            : "1px solid rgba(51,65,85,0.8)",
          color: selected ? "#a5f3fc" : "rgba(100,116,139,0.6)",
        }}
      >
        <span className="truncate">
          {selected ? selected.label : (placeholder ?? "Select...")}
        </span>
        <ChevronDown
          className="w-3 h-3 shrink-0 ml-2"
          style={{
            color: accent,
            opacity: 0.7,
            transition: "transform 200ms",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>

      {typeof document !== "undefined" && dropdown
        ? createPortal(dropdown, document.body)
        : null}
    </div>
  );
}

// ── Chain options shared ──────────────────────────────────────────────────────
const CHAINS = [
  { value: "ethereum", label: "Ethereum" },
  { value: "solana", label: "Solana" },
  { value: "arbitrum", label: "Arbitrum" },
  { value: "optimism", label: "Optimism" },
  { value: "base", label: "Base" },
  { value: "polygon", label: "Polygon" },
  { value: "bsc", label: "BSC" },
];

// ── Main component ────────────────────────────────────────────────────────────
export function NodePropertiesPanel() {
  const selectedNode = useFlowStore((s) =>
    s.selectedNodeId
      ? (s.nodes.find((n) => n.id === s.selectedNodeId) ?? null)
      : null,
  );
  const setSelectedNode = useFlowStore((s) => s.setSelectedNode);
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const deleteNode = useFlowStore((s) => s.deleteNode);
  const { isConnected: tgConnected, openBot } = useTelegram();

  if (!selectedNode) return null;

  const defaultAccent = NODE_COLORS[selectedNode.type ?? ""] ?? "#22d3ee";
  const accent =
    typeof selectedNode.data.customColor === "string"
      ? selectedNode.data.customColor
      : defaultAccent;
  const nodeLabel =
    NODE_LABELS[selectedNode.type ?? ""] ?? selectedNode.type?.toUpperCase();

  const handleClose = () => setSelectedNode(null);
  const handleDelete = () => {
    deleteNode(selectedNode.id);
    setSelectedNode(null);
  };
  const updateField = (field: string, value: unknown) =>
    updateNodeData(selectedNode.id, { [field]: value });

  const renderFields = () => {
    switch (selectedNode.type) {
      // ── TRIGGER ─────────────────────────────────────────────────────────────
      case "trigger": {
        const triggerType = str(selectedNode.data.triggerType, "schedule");
        const schedulePreset = str(selectedNode.data.schedulePreset, "Daily");
        return (
          <>
            <FieldGroup>
              <FieldLabel>Trigger Type</FieldLabel>
              <StyledSelect
                accent={accent}
                value={triggerType}
                onChange={(v) => updateField("triggerType", v)}
                options={[
                  { value: "schedule", label: "Schedule" },
                  { value: "price", label: "Price Alert" },
                  { value: "wallet", label: "Wallet Event" },
                  { value: "manual", label: "Manual" },
                ]}
              />
            </FieldGroup>

            {triggerType === "schedule" && (
              <>
                <FieldGroup>
                  <FieldLabel>Frequency</FieldLabel>
                  <StyledSelect
                    accent={accent}
                    value={schedulePreset}
                    onChange={(v) => updateField("schedulePreset", v)}
                    options={[
                      { value: "Hourly", label: "Hourly" },
                      { value: "Every 6h", label: "Every 6 Hours" },
                      { value: "Daily", label: "Daily" },
                      { value: "Weekly", label: "Weekly" },
                      { value: "Custom", label: "Custom Cron" },
                    ]}
                  />
                </FieldGroup>
                {(schedulePreset === "Daily" ||
                  schedulePreset === "Weekly") && (
                  <FieldGroup>
                    <FieldLabel>Time (UTC)</FieldLabel>
                    <StyledInput
                      type="time"
                      value={str(selectedNode.data.scheduleTime, "03:00")}
                      onChange={(e) =>
                        updateField("scheduleTime", e.target.value)
                      }
                    />
                  </FieldGroup>
                )}
                {schedulePreset === "Custom" && (
                  <FieldGroup>
                    <FieldLabel>Cron Expression</FieldLabel>
                    <StyledInput
                      placeholder="0 */6 * * *"
                      value={str(selectedNode.data.cronExpression)}
                      onChange={(e) =>
                        updateField("cronExpression", e.target.value)
                      }
                    />
                  </FieldGroup>
                )}
              </>
            )}

            {triggerType === "price" && (
              <>
                <FieldGroup>
                  <FieldLabel>Token</FieldLabel>
                  <StyledInput
                    placeholder="SOL, ETH, BTC..."
                    value={str(selectedNode.data.token, "SOL")}
                    onChange={(e) =>
                      updateField("token", e.target.value.toUpperCase())
                    }
                  />
                </FieldGroup>
                <FieldGroup>
                  <FieldLabel>Condition</FieldLabel>
                  <StyledSelect
                    accent={accent}
                    value={str(selectedNode.data.priceCondition, "Above")}
                    onChange={(v) => updateField("priceCondition", v)}
                    options={[
                      { value: "Above", label: "Above" },
                      { value: "Below", label: "Below" },
                      { value: "Crosses Up", label: "Crosses Up" },
                      { value: "Crosses Down", label: "Crosses Down" },
                    ]}
                  />
                </FieldGroup>
                <FieldGroup>
                  <FieldLabel>Target Price (USD)</FieldLabel>
                  <StyledInput
                    type="number"
                    placeholder="0.00"
                    value={str(selectedNode.data.priceTarget)}
                    onChange={(e) => updateField("priceTarget", e.target.value)}
                  />
                </FieldGroup>
              </>
            )}

            {triggerType === "wallet" && (
              <>
                <FieldGroup>
                  <FieldLabel>Event Type</FieldLabel>
                  <StyledSelect
                    accent={accent}
                    value={str(selectedNode.data.walletEvent, "Incoming TX")}
                    onChange={(v) => updateField("walletEvent", v)}
                    options={[
                      { value: "Incoming TX", label: "Incoming TX" },
                      { value: "Outgoing TX", label: "Outgoing TX" },
                      { value: "Balance Change", label: "Balance Change" },
                      { value: "Token Received", label: "Token Received" },
                    ]}
                  />
                </FieldGroup>
                <FieldGroup>
                  <FieldLabel>Min Amount (optional)</FieldLabel>
                  <StyledInput
                    type="number"
                    placeholder="0.00"
                    value={str(selectedNode.data.minAmount)}
                    onChange={(e) => updateField("minAmount", e.target.value)}
                  />
                </FieldGroup>
              </>
            )}

            {triggerType === "manual" && (
              <p className="text-[10px] font-mono text-slate-500 leading-relaxed py-1">
                // fires when flow is manually executed from the toolbar
              </p>
            )}
          </>
        );
      }

      // ── MULTI-WALLET ─────────────────────────────────────────────────────────
      case "multiWallet":
        return (
          <>
            <FieldGroup>
              <FieldLabel>Wallet Addresses</FieldLabel>
              <StyledTextarea
                rows={5}
                placeholder={"0x123...\n0x456...\n0x789..."}
                value={walletList(selectedNode.data.wallets).join("\n")}
                onChange={(e) =>
                  updateField(
                    "wallets",
                    e.target.value.split("\n").filter(Boolean),
                  )
                }
              />
              <div className="text-[9px] font-mono text-slate-600">
                // one per line
              </div>
            </FieldGroup>
            <StyledCheckbox
              id="sequential"
              checked={bool(selectedNode.data.executeSequentially)}
              onChange={(e) =>
                updateField("executeSequentially", e.target.checked)
              }
              label="Execute Sequentially"
            />
          </>
        );

      // ── SWAP ─────────────────────────────────────────────────────────────────
      case "swap":
        return (
          <>
            <div className="grid grid-cols-2 gap-2">
              <FieldGroup>
                <FieldLabel>From Token</FieldLabel>
                <StyledInput
                  placeholder="USDC"
                  value={str(selectedNode.data.fromToken)}
                  onChange={(e) => updateField("fromToken", e.target.value)}
                />
              </FieldGroup>
              <FieldGroup>
                <FieldLabel>To Token</FieldLabel>
                <StyledInput
                  placeholder="SOL"
                  value={str(selectedNode.data.toToken)}
                  onChange={(e) => updateField("toToken", e.target.value)}
                />
              </FieldGroup>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <FieldGroup>
                <FieldLabel>Amount</FieldLabel>
                <StyledInput
                  type="number"
                  placeholder="10"
                  value={str(selectedNode.data.amount)}
                  onChange={(e) => updateField("amount", e.target.value)}
                />
              </FieldGroup>
              <FieldGroup>
                <FieldLabel>Slippage %</FieldLabel>
                <StyledInput
                  type="number"
                  step="0.1"
                  placeholder="1"
                  value={str(selectedNode.data.slippage)}
                  onChange={(e) => updateField("slippage", e.target.value)}
                />
              </FieldGroup>
            </div>
            <FieldGroup>
              <FieldLabel>DEX</FieldLabel>
              <StyledSelect
                accent={accent}
                value={str(selectedNode.data.dex, "jupiter")}
                onChange={(v) => updateField("dex", v)}
                options={[
                  { value: "jupiter", label: "Jupiter" },
                  { value: "uniswap", label: "Uniswap" },
                  { value: "raydium", label: "Raydium" },
                  { value: "pancakeswap", label: "PancakeSwap" },
                ]}
              />
            </FieldGroup>
          </>
        );

      // ── BRIDGE ───────────────────────────────────────────────────────────────
      case "bridge":
        return (
          <>
            <FieldGroup>
              <FieldLabel>From Chain</FieldLabel>
              <StyledSelect
                accent={accent}
                value={str(selectedNode.data.fromChain, "ethereum")}
                onChange={(v) => updateField("fromChain", v)}
                options={CHAINS}
              />
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>To Chain</FieldLabel>
              <StyledSelect
                accent={accent}
                value={str(selectedNode.data.toChain, "arbitrum")}
                onChange={(v) => updateField("toChain", v)}
                options={CHAINS}
              />
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Bridge Protocol</FieldLabel>
              <StyledSelect
                accent={accent}
                value={str(selectedNode.data.bridgeProtocol, "layerzero")}
                onChange={(v) => updateField("bridgeProtocol", v)}
                options={[
                  { value: "layerzero", label: "LayerZero" },
                  { value: "stargate", label: "Stargate" },
                  { value: "wormhole", label: "Wormhole" },
                  { value: "across", label: "Across" },
                ]}
              />
            </FieldGroup>
            <div className="grid grid-cols-2 gap-2">
              <FieldGroup>
                <FieldLabel>Token</FieldLabel>
                <StyledInput
                  placeholder="USDC"
                  value={str(selectedNode.data.token)}
                  onChange={(e) => updateField("token", e.target.value)}
                />
              </FieldGroup>
              <FieldGroup>
                <FieldLabel>Amount</FieldLabel>
                <StyledInput
                  type="number"
                  placeholder="100"
                  value={str(selectedNode.data.amount)}
                  onChange={(e) => updateField("amount", e.target.value)}
                />
              </FieldGroup>
            </div>
          </>
        );

      // ── CHAIN SWITCH ─────────────────────────────────────────────────────────
      case "chainSwitch":
        return (
          <FieldGroup>
            <FieldLabel>Target Chain</FieldLabel>
            <StyledSelect
              accent={accent}
              value={str(selectedNode.data.targetChain, "ethereum")}
              onChange={(v) => updateField("targetChain", v)}
              options={CHAINS}
            />
          </FieldGroup>
        );

      // ── ALERT ────────────────────────────────────────────────────────────────
      case "alert": {
        const alertType = str(selectedNode.data.alertType, "Telegram");
        return (
          <>
            <FieldGroup>
              <FieldLabel>Severity</FieldLabel>
              <div className="grid grid-cols-4 gap-1">
                {(["info", "success", "warning", "urgent"] as const).map(
                  (s) => {
                    const active =
                      str(selectedNode.data.severity, "info") === s;
                    const color = SEVERITY_COLORS[s];
                    return (
                      <button
                        key={s}
                        onClick={() => updateField("severity", s)}
                        className="h-7 rounded-lg border text-[8px] font-mono font-bold uppercase tracking-widest transition-all cursor-pointer"
                        style={
                          active
                            ? {
                                color,
                                borderColor: `${color}66`,
                                background: `${color}18`,
                              }
                            : {
                                color: "rgba(148,163,184,0.4)",
                                borderColor: "rgba(51,65,85,0.8)",
                                background: "transparent",
                              }
                        }
                      >
                        {s}
                      </button>
                    );
                  },
                )}
              </div>
            </FieldGroup>

            <FieldGroup>
              <FieldLabel>Channel</FieldLabel>
              <StyledSelect
                accent={accent}
                value={alertType}
                onChange={(v) => updateField("alertType", v)}
                options={[
                  { value: "Telegram", label: "Telegram" },
                  { value: "Discord", label: "Discord" },
                  { value: "Email", label: "Email" },
                  { value: "Webhook", label: "Webhook" },
                ]}
              />
            </FieldGroup>

            {alertType === "Telegram" && (
              <div
                className="rounded-lg p-3 space-y-2"
                style={{
                  background: tgConnected
                    ? "rgba(34,197,94,0.06)"
                    : "rgba(34,158,217,0.06)",
                  border: `1px solid ${tgConnected ? "rgba(34,197,94,0.2)" : "rgba(34,158,217,0.2)"}`,
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {tgConnected ? (
                      <CheckCircle2 className="w-3 h-3 text-green-400" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-cyan-500/60" />
                    )}
                    <span
                      className={`text-[10px] font-mono font-bold ${tgConnected ? "text-green-400" : "text-cyan-400"}`}
                    >
                      {tgConnected ? "Bot connected" : "Bot not connected"}
                    </span>
                  </div>
                  {!tgConnected && (
                    <button
                      onClick={openBot}
                      className="flex items-center gap-1 text-[8px] font-mono font-bold uppercase tracking-widest
                        px-2 py-1 rounded border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10
                        transition-all cursor-pointer"
                    >
                      Connect <ExternalLink className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
                <p className="text-[9px] font-mono text-slate-500 leading-relaxed">
                  {tgConnected
                    ? "Alerts will be sent to your Telegram private chat."
                    : "Click Connect — the bot opens with your token. Hit Start in Telegram and this will update automatically."}
                </p>
              </div>
            )}

            {(alertType === "Discord" || alertType === "Webhook") && (
              <FieldGroup>
                <FieldLabel>Webhook URL</FieldLabel>
                <StyledInput
                  placeholder="https://discord.com/api/webhooks/..."
                  value={str(selectedNode.data.webhookUrl)}
                  onChange={(e) => updateField("webhookUrl", e.target.value)}
                />
              </FieldGroup>
            )}

            {alertType === "Email" && (
              <>
                <FieldGroup>
                  <FieldLabel>To Address</FieldLabel>
                  <StyledInput
                    placeholder="you@example.com"
                    value={str(selectedNode.data.emailTo)}
                    onChange={(e) => updateField("emailTo", e.target.value)}
                  />
                </FieldGroup>
                <FieldGroup>
                  <FieldLabel>Subject</FieldLabel>
                  <StyledInput
                    placeholder="Flow Alert"
                    value={str(selectedNode.data.emailSubject)}
                    onChange={(e) =>
                      updateField("emailSubject", e.target.value)
                    }
                  />
                </FieldGroup>
              </>
            )}

            <FieldGroup>
              <FieldLabel>Message</FieldLabel>
              <StyledTextarea
                rows={3}
                placeholder="Flow completed successfully!"
                value={str(selectedNode.data.message)}
                onChange={(e) => updateField("message", e.target.value)}
              />
            </FieldGroup>

            <FieldGroup>
              <FieldLabel>Cooldown (seconds)</FieldLabel>
              <StyledInput
                type="number"
                min={0}
                placeholder="0 = no cooldown"
                value={str(selectedNode.data.cooldown, "0")}
                onChange={(e) =>
                  updateField("cooldown", Number(e.target.value))
                }
              />
            </FieldGroup>
          </>
        );
      }

      // ── CONDITION ────────────────────────────────────────────────────────────
      case "condition": {
        const conditionType = str(selectedNode.data.conditionType, "price");
        return (
          <>
            <FieldGroup>
              <FieldLabel>Condition Type</FieldLabel>
              <StyledSelect
                accent={accent}
                value={conditionType}
                onChange={(v) => updateField("conditionType", v)}
                options={[
                  { value: "price", label: "Price" },
                  { value: "balance", label: "Balance" },
                  { value: "gas", label: "Gas Fee" },
                  { value: "custom", label: "Custom Expression" },
                ]}
              />
            </FieldGroup>
            {conditionType === "price" && (
              <FieldGroup>
                <FieldLabel>Token</FieldLabel>
                <StyledInput
                  placeholder="ETH"
                  value={str(selectedNode.data.token)}
                  onChange={(e) => updateField("token", e.target.value)}
                />
              </FieldGroup>
            )}
            <FieldGroup>
              <FieldLabel>Operator</FieldLabel>
              <StyledSelect
                accent={accent}
                value={str(selectedNode.data.operator, ">")}
                onChange={(v) => updateField("operator", v)}
                options={[
                  { value: ">", label: "Greater than  ( > )" },
                  { value: "<", label: "Less than  ( < )" },
                  { value: "=", label: "Equal to  ( = )" },
                  { value: ">=", label: "Greater or equal  ( >= )" },
                  { value: "<=", label: "Less or equal  ( <= )" },
                ]}
              />
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Value</FieldLabel>
              <StyledInput
                placeholder="100"
                value={str(selectedNode.data.value)}
                onChange={(e) => updateField("value", e.target.value)}
              />
            </FieldGroup>
            {conditionType === "custom" && (
              <FieldGroup>
                <FieldLabel>Expression</FieldLabel>
                <StyledInput
                  placeholder="balance > 1000 && gas < 20"
                  value={str(selectedNode.data.expression)}
                  onChange={(e) => updateField("expression", e.target.value)}
                />
              </FieldGroup>
            )}
          </>
        );
      }

      // ── WALLET CONNECT ───────────────────────────────────────────────────────
      case "walletConnect":
        return (
          <>
            <FieldGroup>
              <FieldLabel>Wallet Type</FieldLabel>
              <StyledSelect
                accent={accent}
                value={str(selectedNode.data.walletType, "metamask")}
                onChange={(v) => updateField("walletType", v)}
                options={[
                  { value: "metamask", label: "MetaMask" },
                  { value: "phantom", label: "Phantom" },
                  { value: "rabby", label: "Rabby" },
                  { value: "coinbase", label: "Coinbase Wallet" },
                  { value: "walletconnect", label: "WalletConnect" },
                ]}
              />
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Wallet Address</FieldLabel>
              <StyledInput
                placeholder="0x..."
                value={str(selectedNode.data.address)}
                onChange={(e) => updateField("address", e.target.value)}
                className="font-mono"
              />
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Chain</FieldLabel>
              <StyledSelect
                accent={accent}
                value={str(selectedNode.data.chain, "ethereum")}
                onChange={(v) => updateField("chain", v)}
                options={CHAINS}
              />
            </FieldGroup>
          </>
        );

      // ── LEND / STAKE ─────────────────────────────────────────────────────────
      case "lendStake":
        return (
          <>
            <FieldGroup>
              <FieldLabel>Action</FieldLabel>
              <StyledSelect
                accent={accent}
                value={str(selectedNode.data.actionType, "lend")}
                onChange={(v) => updateField("actionType", v)}
                options={[
                  { value: "lend", label: "Lend" },
                  { value: "stake", label: "Stake" },
                  { value: "unstake", label: "Unstake" },
                  { value: "withdraw", label: "Withdraw" },
                ]}
              />
            </FieldGroup>
            <div className="grid grid-cols-2 gap-2">
              <FieldGroup>
                <FieldLabel>Token</FieldLabel>
                <StyledInput
                  placeholder="USDC"
                  value={str(selectedNode.data.token)}
                  onChange={(e) => updateField("token", e.target.value)}
                />
              </FieldGroup>
              <FieldGroup>
                <FieldLabel>Amount</FieldLabel>
                <StyledInput
                  type="number"
                  placeholder="100"
                  value={str(selectedNode.data.amount)}
                  onChange={(e) => updateField("amount", e.target.value)}
                />
              </FieldGroup>
            </div>
            <FieldGroup>
              <FieldLabel>Protocol</FieldLabel>
              <StyledSelect
                accent={accent}
                value={str(selectedNode.data.protocol, "aave")}
                onChange={(v) => updateField("protocol", v)}
                options={[
                  { value: "aave", label: "AAVE" },
                  { value: "compound", label: "Compound" },
                  { value: "kamino", label: "Kamino" },
                  { value: "marginfi", label: "MarginFi" },
                  { value: "lido", label: "Lido" },
                  { value: "jito", label: "Jito" },
                ]}
              />
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Chain</FieldLabel>
              <StyledSelect
                accent={accent}
                value={str(selectedNode.data.chain, "ethereum")}
                onChange={(v) => updateField("chain", v)}
                options={CHAINS}
              />
            </FieldGroup>
          </>
        );

      // ── TWITTER ──────────────────────────────────────────────────────────────
      case "twitter": {
        const taskType = str(selectedNode.data.taskType, "follow");
        return (
          <>
            <FieldGroup>
              <FieldLabel>Task Type</FieldLabel>
              <StyledSelect
                accent={accent}
                value={taskType}
                onChange={(v) => updateField("taskType", v)}
                options={[
                  { value: "follow", label: "Follow" },
                  { value: "like", label: "Like" },
                  { value: "retweet", label: "Retweet" },
                  { value: "quote", label: "Quote Tweet" },
                  { value: "tweet", label: "Post Tweet" },
                ]}
              />
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Target</FieldLabel>
              <StyledInput
                placeholder="@username or tweet URL"
                value={str(selectedNode.data.target)}
                onChange={(e) => updateField("target", e.target.value)}
              />
            </FieldGroup>
            {(taskType === "quote" || taskType === "tweet") && (
              <FieldGroup>
                <FieldLabel>Tweet Text</FieldLabel>
                <StyledTextarea
                  rows={3}
                  placeholder="gm frens"
                  value={str(selectedNode.data.tweetText)}
                  onChange={(e) => updateField("tweetText", e.target.value)}
                />
              </FieldGroup>
            )}
          </>
        );
      }

      // ── DISCORD ──────────────────────────────────────────────────────────────
      case "discord": {
        const taskType = str(selectedNode.data.taskType, "join");
        return (
          <>
            <FieldGroup>
              <FieldLabel>Task Type</FieldLabel>
              <StyledSelect
                accent={accent}
                value={taskType}
                onChange={(v) => updateField("taskType", v)}
                options={[
                  { value: "join", label: "Join Server" },
                  { value: "react", label: "React to Message" },
                  { value: "message", label: "Send Message" },
                  { value: "role", label: "Get Role" },
                ]}
              />
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Server ID / Invite</FieldLabel>
              <StyledInput
                placeholder="discord.gg/..."
                value={str(selectedNode.data.serverId)}
                onChange={(e) => updateField("serverId", e.target.value)}
              />
            </FieldGroup>
            {(taskType === "message" || taskType === "react") && (
              <FieldGroup>
                <FieldLabel>Channel ID</FieldLabel>
                <StyledInput
                  placeholder="123456789"
                  value={str(selectedNode.data.channelId)}
                  onChange={(e) => updateField("channelId", e.target.value)}
                />
              </FieldGroup>
            )}
            {taskType === "message" && (
              <FieldGroup>
                <FieldLabel>Message</FieldLabel>
                <StyledTextarea
                  rows={2}
                  placeholder="gm!"
                  value={str(selectedNode.data.message)}
                  onChange={(e) => updateField("message", e.target.value)}
                />
              </FieldGroup>
            )}
          </>
        );
      }

      // ── GALXE ────────────────────────────────────────────────────────────────
      case "galxe":
        return (
          <>
            <FieldGroup>
              <FieldLabel>Campaign Name</FieldLabel>
              <StyledInput
                placeholder="Project XYZ Campaign"
                value={str(selectedNode.data.campaignName)}
                onChange={(e) => updateField("campaignName", e.target.value)}
              />
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Campaign URL</FieldLabel>
              <StyledInput
                placeholder="https://galxe.com/..."
                value={str(selectedNode.data.campaignUrl)}
                onChange={(e) => updateField("campaignUrl", e.target.value)}
              />
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Action</FieldLabel>
              <StyledSelect
                accent={accent}
                value={str(selectedNode.data.action, "complete")}
                onChange={(v) => updateField("action", v)}
                options={[
                  { value: "complete", label: "Complete Tasks" },
                  { value: "claim", label: "Claim OAT" },
                  { value: "check", label: "Check Eligibility" },
                ]}
              />
            </FieldGroup>
          </>
        );

      // ── VOLUME FARMER ────────────────────────────────────────────────────────
      case "volumeFarmer":
        return (
          <>
            <div className="grid grid-cols-3 gap-2">
              <FieldGroup>
                <FieldLabel>Swaps</FieldLabel>
                <StyledInput
                  type="number"
                  placeholder="10"
                  value={str(selectedNode.data.swapCount)}
                  onChange={(e) => updateField("swapCount", e.target.value)}
                />
              </FieldGroup>
              <FieldGroup>
                <FieldLabel>$ / Swap</FieldLabel>
                <StyledInput
                  type="number"
                  placeholder="5"
                  value={str(selectedNode.data.swapAmount)}
                  onChange={(e) => updateField("swapAmount", e.target.value)}
                />
              </FieldGroup>
              <FieldGroup>
                <FieldLabel>Target $</FieldLabel>
                <StyledInput
                  type="number"
                  placeholder="100"
                  value={str(selectedNode.data.targetVolume)}
                  onChange={(e) => updateField("targetVolume", e.target.value)}
                />
              </FieldGroup>
            </div>
            <FieldGroup>
              <FieldLabel>Chain</FieldLabel>
              <StyledSelect
                accent={accent}
                value={str(selectedNode.data.chain, "arbitrum")}
                onChange={(v) => updateField("chain", v)}
                options={CHAINS}
              />
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>DEX</FieldLabel>
              <StyledSelect
                accent={accent}
                value={str(selectedNode.data.dex, "uniswap")}
                onChange={(v) => updateField("dex", v)}
                options={[
                  { value: "uniswap", label: "Uniswap" },
                  { value: "jupiter", label: "Jupiter" },
                  { value: "raydium", label: "Raydium" },
                  { value: "pancakeswap", label: "PancakeSwap" },
                ]}
              />
            </FieldGroup>
            <StyledCheckbox
              id="randomize-vol"
              checked={bool(selectedNode.data.randomizeAmounts)}
              onChange={(e) =>
                updateField("randomizeAmounts", e.target.checked)
              }
              label="Randomize amounts"
            />
          </>
        );

      // ── CLAIM AIRDROP ────────────────────────────────────────────────────────
      case "claimAirdrop":
        return (
          <>
            <FieldGroup>
              <FieldLabel>Project Name</FieldLabel>
              <StyledInput
                placeholder="ProjectXYZ"
                value={str(selectedNode.data.projectName)}
                onChange={(e) => updateField("projectName", e.target.value)}
              />
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Contract Address</FieldLabel>
              <StyledInput
                placeholder="0x..."
                value={str(selectedNode.data.contractAddress)}
                onChange={(e) => updateField("contractAddress", e.target.value)}
                className="font-mono"
              />
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Chain</FieldLabel>
              <StyledSelect
                accent={accent}
                value={str(selectedNode.data.chain, "ethereum")}
                onChange={(v) => updateField("chain", v)}
                options={CHAINS}
              />
            </FieldGroup>
            <StyledCheckbox
              id="auto-sell"
              checked={bool(selectedNode.data.autoSell)}
              onChange={(e) => updateField("autoSell", e.target.checked)}
              label="Auto-sell after claim"
            />
          </>
        );

      // ── WAIT / DELAY ─────────────────────────────────────────────────────────
      case "waitDelay":
        return (
          <>
            <div className="grid grid-cols-2 gap-2">
              <FieldGroup>
                <FieldLabel>Duration</FieldLabel>
                <StyledInput
                  type="number"
                  placeholder="60"
                  value={str(selectedNode.data.duration)}
                  onChange={(e) => updateField("duration", e.target.value)}
                />
              </FieldGroup>
              <FieldGroup>
                <FieldLabel>Unit</FieldLabel>
                <StyledSelect
                  accent={accent}
                  value={str(selectedNode.data.unit, "seconds")}
                  onChange={(v) => updateField("unit", v)}
                  options={[
                    { value: "seconds", label: "Seconds" },
                    { value: "minutes", label: "Minutes" },
                    { value: "hours", label: "Hours" },
                    { value: "days", label: "Days" },
                  ]}
                />
              </FieldGroup>
            </div>
            <StyledCheckbox
              id="randomize"
              checked={bool(selectedNode.data.randomize)}
              onChange={(e) => updateField("randomize", e.target.checked)}
              label="Add random variance"
            />
            {selectedNode.data.randomize === true && (
              <FieldGroup>
                <FieldLabel>Variance %</FieldLabel>
                <StyledInput
                  type="number"
                  placeholder="10"
                  value={str(selectedNode.data.randomRange)}
                  onChange={(e) => updateField("randomRange", e.target.value)}
                />
              </FieldGroup>
            )}
          </>
        );

      // ── LOOP ─────────────────────────────────────────────────────────────────
      case "loop":
        return (
          <>
            <FieldGroup>
              <FieldLabel>Iterations</FieldLabel>
              <StyledInput
                type="number"
                placeholder="leave empty for infinite"
                value={str(selectedNode.data.iterations)}
                onChange={(e) => updateField("iterations", e.target.value)}
              />
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Break Condition</FieldLabel>
              <StyledInput
                placeholder="balance > 1000"
                value={str(selectedNode.data.breakCondition)}
                onChange={(e) => updateField("breakCondition", e.target.value)}
              />
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Delay Between Loops</FieldLabel>
              <div className="grid grid-cols-2 gap-2">
                <StyledInput
                  type="number"
                  placeholder="0"
                  value={str(selectedNode.data.loopDelay)}
                  onChange={(e) => updateField("loopDelay", e.target.value)}
                />
                <StyledSelect
                  accent={accent}
                  value={str(selectedNode.data.loopDelayUnit, "seconds")}
                  onChange={(v) => updateField("loopDelayUnit", v)}
                  options={[
                    { value: "seconds", label: "Seconds" },
                    { value: "minutes", label: "Minutes" },
                    { value: "hours", label: "Hours" },
                  ]}
                />
              </div>
            </FieldGroup>
          </>
        );

      // ── PRICE CHECK ──────────────────────────────────────────────────────────
      case "priceCheck":
        return (
          <>
            <FieldGroup>
              <FieldLabel>Token Symbol</FieldLabel>
              <StyledInput
                placeholder="ETH, SOL, PEPE..."
                value={str(selectedNode.data.token)}
                onChange={(e) =>
                  updateField("token", e.target.value.toUpperCase())
                }
              />
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Price Source</FieldLabel>
              <StyledSelect
                accent={accent}
                value={str(selectedNode.data.priceSource, "coingecko")}
                onChange={(v) => updateField("priceSource", v)}
                options={[
                  { value: "coingecko", label: "CoinGecko" },
                  { value: "coinmarketcap", label: "CoinMarketCap" },
                  { value: "dexscreener", label: "DexScreener" },
                  { value: "jupiter", label: "Jupiter (Solana)" },
                  { value: "chainlink", label: "Chainlink Oracle" },
                ]}
              />
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Alert Threshold ($)</FieldLabel>
              <StyledInput
                type="number"
                placeholder="optional"
                value={str(selectedNode.data.alertThreshold)}
                onChange={(e) => updateField("alertThreshold", e.target.value)}
              />
            </FieldGroup>
          </>
        );

      // ── GAS OPTIMIZER ────────────────────────────────────────────────────────
      // Solana-native — microlamports, no EVM chains
      case "gasOptimizer": {
        const strategy = str(selectedNode.data.strategy, "priority");
        return (
          <>
            <FieldGroup>
              <FieldLabel>Strategy</FieldLabel>
              <StyledSelect
                accent={accent}
                value={strategy}
                onChange={(v) => updateField("strategy", v)}
                options={[
                  { value: "priority", label: "Priority Fee" },
                  { value: "jito", label: "Jito Bundle" },
                  { value: "wait", label: "Wait for Low Fee" },
                ]}
              />
            </FieldGroup>

            {/* Urgency — priority + wait */}
            {(strategy === "priority" || strategy === "wait") && (
              <FieldGroup>
                <FieldLabel>Fee Level</FieldLabel>
                <StyledSelect
                  accent={accent}
                  value={str(selectedNode.data.urgency, "medium")}
                  onChange={(v) => updateField("urgency", v)}
                  options={[
                    { value: "low", label: "Low (p25)" },
                    { value: "medium", label: "Medium (p50)" },
                    { value: "high", label: "High (p75)" },
                  ]}
                />
              </FieldGroup>
            )}

            {/* Max fee threshold — wait only */}
            {strategy === "wait" && (
              <FieldGroup>
                <FieldLabel>Max Fee (microlamports)</FieldLabel>
                <StyledInput
                  type="number"
                  placeholder="50000"
                  value={str(selectedNode.data.maxFee, "50000")}
                  onChange={(e) => updateField("maxFee", e.target.value)}
                />
              </FieldGroup>
            )}

            <FieldGroup>
              <FieldLabel>Timeout (minutes)</FieldLabel>
              <StyledInput
                type="number"
                placeholder="60"
                value={str(selectedNode.data.timeout, "60")}
                onChange={(e) => updateField("timeout", e.target.value)}
              />
            </FieldGroup>

            <div
              className="rounded-lg px-3 py-2"
              style={{
                background: "rgba(132,204,22,0.04)",
                border: "1px solid rgba(132,204,22,0.15)",
              }}
            >
              <div className="text-[8px] font-mono text-slate-500 leading-relaxed">
                // Solana only · microlamports · live data from{" "}
                {strategy === "jito"
                  ? "bundles.jito.wtf + Solana RPC"
                  : "Solana Mainnet RPC"}
              </div>
            </div>
          </>
        );
      }

      default:
        return (
          <p className="text-xs font-mono text-slate-600">
            // no properties available
          </p>
        );
    }
  };

  return (
    <div
      className="absolute top-4 right-4 w-72 z-10 flex flex-col rounded-xl"
      style={{
        background: "rgba(2, 6, 23, 0.95)",
        border: `1px solid ${accent}33`,
        boxShadow: `0 0 0 1px ${accent}11, 0 24px 48px rgba(0,0,0,0.7), 0 0 24px ${accent}15`,
        backdropFilter: "blur(20px)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: `1px solid ${accent}20` }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <ChevronRight
            className="w-3 h-3 shrink-0"
            style={{ color: accent }}
          />
          <span
            className="text-[10px] font-mono font-bold tracking-widest truncate"
            style={{ color: accent }}
          >
            {nodeLabel}
          </span>
        </div>
        <button
          onClick={handleClose}
          className="shrink-0 w-5 h-5 rounded flex items-center justify-center
            text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Accent line */}
      <div
        className="h-px w-full shrink-0"
        style={{
          background: `linear-gradient(90deg, ${accent}80, transparent 60%)`,
        }}
      />

      {/* Fields */}
      <div
        className="flex flex-col gap-3 p-4 overflow-y-auto"
        style={{ maxHeight: "calc(100vh - 180px)" }}
      >
        {renderFields()}
      </div>

      {/* Footer */}
      <div
        className="px-4 py-3 shrink-0"
        style={{ borderTop: `1px solid ${accent}15` }}
      >
        <button
          onClick={handleDelete}
          className="w-full h-8 rounded flex items-center justify-center gap-2 text-xs font-mono
            text-red-400/60 border border-red-500/20
            hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/5
            transition-all duration-150"
        >
          <Trash2 className="w-3 h-3" />
          delete_node()
        </button>
      </div>
    </div>
  );
}
