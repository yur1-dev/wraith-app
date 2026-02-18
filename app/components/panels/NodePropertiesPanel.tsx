"use client";

import { useFlowStore } from "@/lib/hooks/useFlowStore";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Trash2, ChevronRight } from "lucide-react";

// Helper to safely cast node data fields to string
const str = (val: unknown, fallback = ""): string =>
  typeof val === "string" ? val : fallback;

// Helper to safely cast node data fields to boolean
const bool = (val: unknown, fallback = false): boolean =>
  typeof val === "boolean" ? val : fallback;

// Helper to safely cast wallets array
const walletList = (val: unknown): string[] =>
  Array.isArray(val) ? (val as string[]) : [];

// Node type → accent color
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
  trigger: "SCHEDULE TRIGGER",
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

function FieldGroup({ children }: { children: React.ReactNode }) {
  return <div className="space-y-1.5">{children}</div>;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-mono font-semibold tracking-widest text-cyan-500/70 uppercase">
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

function StyledSelect({
  value,
  onValueChange,
  children,
}: {
  value: string;
  onValueChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="h-8 bg-slate-950 border-slate-700/80 text-cyan-100 text-xs font-mono focus:border-cyan-500 focus:ring-0">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-slate-900 border-slate-700 text-cyan-100 text-xs font-mono">
        {children}
      </SelectContent>
    </Select>
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

const CHAIN_OPTIONS = (
  <>
    <SelectItem value="solana">Solana</SelectItem>
    <SelectItem value="ethereum">Ethereum</SelectItem>
    <SelectItem value="arbitrum">Arbitrum</SelectItem>
    <SelectItem value="optimism">Optimism</SelectItem>
    <SelectItem value="base">Base</SelectItem>
    <SelectItem value="polygon">Polygon</SelectItem>
    <SelectItem value="bsc">BSC</SelectItem>
  </>
);

export function NodePropertiesPanel() {
  // ✅ KEY FIX: Derive live selectedNode from nodes array — never stale
  const selectedNode = useFlowStore((s) =>
    s.selectedNodeId
      ? (s.nodes.find((n) => n.id === s.selectedNodeId) ?? null)
      : null,
  );
  const setSelectedNode = useFlowStore((s) => s.setSelectedNode);
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const deleteNode = useFlowStore((s) => s.deleteNode);

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
  const updateField = (field: string, value: unknown) => {
    updateNodeData(selectedNode.id, { [field]: value });
  };

  const renderFields = () => {
    switch (selectedNode.type) {
      case "trigger":
        return (
          <>
            <FieldGroup>
              <FieldLabel>Schedule Type</FieldLabel>
              <StyledSelect
                value={str(selectedNode.data.scheduleType, "daily")}
                onValueChange={(v) => updateField("scheduleType", v)}
              >
                <SelectItem value="once">Once</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="custom">Custom Cron</SelectItem>
              </StyledSelect>
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Time</FieldLabel>
              <StyledInput
                type="time"
                value={str(selectedNode.data.scheduleTime, "03:00")}
                onChange={(e) => updateField("scheduleTime", e.target.value)}
              />
            </FieldGroup>
            {selectedNode.data.scheduleType === "custom" && (
              <FieldGroup>
                <FieldLabel>Cron Expression</FieldLabel>
                <StyledInput
                  placeholder="0 3 * * *"
                  value={str(selectedNode.data.cronExpression)}
                  onChange={(e) =>
                    updateField("cronExpression", e.target.value)
                  }
                />
              </FieldGroup>
            )}
          </>
        );

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
              <div className="text-[10px] font-mono text-slate-600">
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

      case "swap":
        return (
          <>
            <div className="grid grid-cols-2 gap-2">
              <FieldGroup>
                <FieldLabel>From</FieldLabel>
                <StyledInput
                  placeholder="USDC"
                  value={str(selectedNode.data.fromToken)}
                  onChange={(e) => updateField("fromToken", e.target.value)}
                />
              </FieldGroup>
              <FieldGroup>
                <FieldLabel>To</FieldLabel>
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
                value={str(selectedNode.data.dex, "jupiter")}
                onValueChange={(v) => updateField("dex", v)}
              >
                <SelectItem value="jupiter">Jupiter (Solana)</SelectItem>
                <SelectItem value="uniswap">Uniswap (Ethereum)</SelectItem>
                <SelectItem value="raydium">Raydium (Solana)</SelectItem>
                <SelectItem value="pancakeswap">PancakeSwap (BSC)</SelectItem>
              </StyledSelect>
            </FieldGroup>
          </>
        );

      case "bridge":
        return (
          <>
            <div className="grid grid-cols-2 gap-2">
              <FieldGroup>
                <FieldLabel>From Chain</FieldLabel>
                <StyledSelect
                  value={str(selectedNode.data.fromChain, "ethereum")}
                  onValueChange={(v) => updateField("fromChain", v)}
                >
                  {CHAIN_OPTIONS}
                </StyledSelect>
              </FieldGroup>
              <FieldGroup>
                <FieldLabel>To Chain</FieldLabel>
                <StyledSelect
                  value={str(selectedNode.data.toChain, "arbitrum")}
                  onValueChange={(v) => updateField("toChain", v)}
                >
                  {CHAIN_OPTIONS}
                </StyledSelect>
              </FieldGroup>
            </div>
            <FieldGroup>
              <FieldLabel>Bridge Protocol</FieldLabel>
              <StyledSelect
                value={str(selectedNode.data.bridgeProtocol, "layerzero")}
                onValueChange={(v) => updateField("bridgeProtocol", v)}
              >
                <SelectItem value="layerzero">LayerZero</SelectItem>
                <SelectItem value="stargate">Stargate</SelectItem>
                <SelectItem value="wormhole">Wormhole</SelectItem>
                <SelectItem value="across">Across</SelectItem>
              </StyledSelect>
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

      case "chainSwitch":
        return (
          <>
            <FieldGroup>
              <FieldLabel>Target Chain</FieldLabel>
              <StyledSelect
                value={str(selectedNode.data.targetChain, "ethereum")}
                onValueChange={(v) => updateField("targetChain", v)}
              >
                {CHAIN_OPTIONS}
              </StyledSelect>
            </FieldGroup>
          </>
        );

      case "alert":
        return (
          <>
            <FieldGroup>
              <FieldLabel>Alert Type</FieldLabel>
              <StyledSelect
                value={str(selectedNode.data.alertType, "telegram")}
                onValueChange={(v) => updateField("alertType", v)}
              >
                <SelectItem value="telegram">Telegram</SelectItem>
                <SelectItem value="discord">Discord</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="webhook">Webhook</SelectItem>
              </StyledSelect>
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Message</FieldLabel>
              <StyledTextarea
                rows={3}
                placeholder="Flow completed successfully!"
                value={str(selectedNode.data.message)}
                onChange={(e) => updateField("message", e.target.value)}
              />
            </FieldGroup>
            {selectedNode.data.alertType === "telegram" && (
              <FieldGroup>
                <FieldLabel>Chat ID</FieldLabel>
                <StyledInput
                  placeholder="-100123456789"
                  value={str(selectedNode.data.chatId)}
                  onChange={(e) => updateField("chatId", e.target.value)}
                />
              </FieldGroup>
            )}
            {selectedNode.data.alertType === "webhook" && (
              <FieldGroup>
                <FieldLabel>Webhook URL</FieldLabel>
                <StyledInput
                  placeholder="https://..."
                  value={str(selectedNode.data.webhookUrl)}
                  onChange={(e) => updateField("webhookUrl", e.target.value)}
                />
              </FieldGroup>
            )}
          </>
        );

      case "condition":
        return (
          <>
            <FieldGroup>
              <FieldLabel>Condition Type</FieldLabel>
              <StyledSelect
                value={str(selectedNode.data.conditionType, "price")}
                onValueChange={(v) => updateField("conditionType", v)}
              >
                <SelectItem value="price">Price</SelectItem>
                <SelectItem value="balance">Balance</SelectItem>
                <SelectItem value="gas">Gas Fee</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </StyledSelect>
            </FieldGroup>
            {selectedNode.data.conditionType === "price" && (
              <FieldGroup>
                <FieldLabel>Token</FieldLabel>
                <StyledInput
                  placeholder="ETH"
                  value={str(selectedNode.data.token)}
                  onChange={(e) => updateField("token", e.target.value)}
                />
              </FieldGroup>
            )}
            <div className="grid grid-cols-2 gap-2">
              <FieldGroup>
                <FieldLabel>Operator</FieldLabel>
                <StyledSelect
                  value={str(selectedNode.data.operator, ">")}
                  onValueChange={(v) => updateField("operator", v)}
                >
                  <SelectItem value=">">Greater &gt;</SelectItem>
                  <SelectItem value="<">Less &lt;</SelectItem>
                  <SelectItem value="=">Equal =</SelectItem>
                  <SelectItem value=">=">≥ or equal</SelectItem>
                  <SelectItem value="<=">≤ or equal</SelectItem>
                </StyledSelect>
              </FieldGroup>
              <FieldGroup>
                <FieldLabel>Value</FieldLabel>
                <StyledInput
                  placeholder="100"
                  value={str(selectedNode.data.value)}
                  onChange={(e) => updateField("value", e.target.value)}
                />
              </FieldGroup>
            </div>
            {selectedNode.data.conditionType === "custom" && (
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

      case "walletConnect":
        return (
          <>
            <FieldGroup>
              <FieldLabel>Wallet Type</FieldLabel>
              <StyledSelect
                value={str(selectedNode.data.walletType, "metamask")}
                onValueChange={(v) => updateField("walletType", v)}
              >
                <SelectItem value="metamask">MetaMask</SelectItem>
                <SelectItem value="phantom">Phantom</SelectItem>
                <SelectItem value="rabby">Rabby</SelectItem>
                <SelectItem value="coinbase">Coinbase Wallet</SelectItem>
                <SelectItem value="walletconnect">WalletConnect</SelectItem>
              </StyledSelect>
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
                value={str(selectedNode.data.chain, "ethereum")}
                onValueChange={(v) => updateField("chain", v)}
              >
                {CHAIN_OPTIONS}
              </StyledSelect>
            </FieldGroup>
          </>
        );

      case "lendStake":
        return (
          <>
            <FieldGroup>
              <FieldLabel>Action</FieldLabel>
              <StyledSelect
                value={str(selectedNode.data.actionType, "lend")}
                onValueChange={(v) => updateField("actionType", v)}
              >
                <SelectItem value="lend">Lend</SelectItem>
                <SelectItem value="stake">Stake</SelectItem>
                <SelectItem value="unstake">Unstake</SelectItem>
                <SelectItem value="withdraw">Withdraw</SelectItem>
              </StyledSelect>
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
                value={str(selectedNode.data.protocol, "aave")}
                onValueChange={(v) => updateField("protocol", v)}
              >
                <SelectItem value="aave">AAVE</SelectItem>
                <SelectItem value="compound">Compound</SelectItem>
                <SelectItem value="kamino">Kamino (Solana)</SelectItem>
                <SelectItem value="marginfi">MarginFi (Solana)</SelectItem>
                <SelectItem value="lido">Lido</SelectItem>
                <SelectItem value="jito">Jito (Solana)</SelectItem>
              </StyledSelect>
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Chain</FieldLabel>
              <StyledSelect
                value={str(selectedNode.data.chain, "ethereum")}
                onValueChange={(v) => updateField("chain", v)}
              >
                {CHAIN_OPTIONS}
              </StyledSelect>
            </FieldGroup>
          </>
        );

      case "twitter":
        return (
          <>
            <FieldGroup>
              <FieldLabel>Task Type</FieldLabel>
              <StyledSelect
                value={str(selectedNode.data.taskType, "follow")}
                onValueChange={(v) => updateField("taskType", v)}
              >
                <SelectItem value="follow">Follow Account</SelectItem>
                <SelectItem value="like">Like Tweet</SelectItem>
                <SelectItem value="retweet">Retweet</SelectItem>
                <SelectItem value="quote">Quote Tweet</SelectItem>
                <SelectItem value="tweet">Post Tweet</SelectItem>
              </StyledSelect>
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Target</FieldLabel>
              <StyledInput
                placeholder="@username or tweet URL"
                value={str(selectedNode.data.target)}
                onChange={(e) => updateField("target", e.target.value)}
              />
            </FieldGroup>
            {(selectedNode.data.taskType === "quote" ||
              selectedNode.data.taskType === "tweet") && (
              <FieldGroup>
                <FieldLabel>Tweet Text</FieldLabel>
                <StyledTextarea
                  rows={3}
                  placeholder="GM frens 🌅"
                  value={str(selectedNode.data.tweetText)}
                  onChange={(e) => updateField("tweetText", e.target.value)}
                />
              </FieldGroup>
            )}
          </>
        );

      case "discord":
        return (
          <>
            <FieldGroup>
              <FieldLabel>Task Type</FieldLabel>
              <StyledSelect
                value={str(selectedNode.data.taskType, "join")}
                onValueChange={(v) => updateField("taskType", v)}
              >
                <SelectItem value="join">Join Server</SelectItem>
                <SelectItem value="react">React to Message</SelectItem>
                <SelectItem value="message">Send Message</SelectItem>
                <SelectItem value="role">Get Role</SelectItem>
              </StyledSelect>
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Server ID / Invite</FieldLabel>
              <StyledInput
                placeholder="discord.gg/..."
                value={str(selectedNode.data.serverId)}
                onChange={(e) => updateField("serverId", e.target.value)}
              />
            </FieldGroup>
            {(selectedNode.data.taskType === "message" ||
              selectedNode.data.taskType === "react") && (
              <FieldGroup>
                <FieldLabel>Channel ID</FieldLabel>
                <StyledInput
                  placeholder="123456789"
                  value={str(selectedNode.data.channelId)}
                  onChange={(e) => updateField("channelId", e.target.value)}
                />
              </FieldGroup>
            )}
            {selectedNode.data.taskType === "message" && (
              <FieldGroup>
                <FieldLabel>Message</FieldLabel>
                <StyledTextarea
                  rows={2}
                  placeholder="Hello!"
                  value={str(selectedNode.data.message)}
                  onChange={(e) => updateField("message", e.target.value)}
                />
              </FieldGroup>
            )}
          </>
        );

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
                value={str(selectedNode.data.action, "complete")}
                onValueChange={(v) => updateField("action", v)}
              >
                <SelectItem value="complete">Complete Tasks</SelectItem>
                <SelectItem value="claim">Claim OAT</SelectItem>
                <SelectItem value="check">Check Eligibility</SelectItem>
              </StyledSelect>
            </FieldGroup>
          </>
        );

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
                value={str(selectedNode.data.chain, "arbitrum")}
                onValueChange={(v) => updateField("chain", v)}
              >
                {CHAIN_OPTIONS}
              </StyledSelect>
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>DEX</FieldLabel>
              <StyledSelect
                value={str(selectedNode.data.dex, "uniswap")}
                onValueChange={(v) => updateField("dex", v)}
              >
                <SelectItem value="uniswap">Uniswap</SelectItem>
                <SelectItem value="jupiter">Jupiter</SelectItem>
                <SelectItem value="raydium">Raydium</SelectItem>
                <SelectItem value="pancakeswap">PancakeSwap</SelectItem>
              </StyledSelect>
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
                value={str(selectedNode.data.chain, "ethereum")}
                onValueChange={(v) => updateField("chain", v)}
              >
                {CHAIN_OPTIONS}
              </StyledSelect>
            </FieldGroup>
            <StyledCheckbox
              id="auto-sell"
              checked={bool(selectedNode.data.autoSell)}
              onChange={(e) => updateField("autoSell", e.target.checked)}
              label="Auto-sell after claim"
            />
          </>
        );

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
                  value={str(selectedNode.data.unit, "seconds")}
                  onValueChange={(v) => updateField("unit", v)}
                >
                  <SelectItem value="seconds">Seconds</SelectItem>
                  <SelectItem value="minutes">Minutes</SelectItem>
                  <SelectItem value="hours">Hours</SelectItem>
                  <SelectItem value="days">Days</SelectItem>
                </StyledSelect>
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

      case "loop":
        return (
          <>
            <FieldGroup>
              <FieldLabel>Iterations</FieldLabel>
              <StyledInput
                type="number"
                placeholder="leave empty for ∞"
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
                  value={str(selectedNode.data.loopDelayUnit, "seconds")}
                  onValueChange={(v) => updateField("loopDelayUnit", v)}
                >
                  <SelectItem value="seconds">Seconds</SelectItem>
                  <SelectItem value="minutes">Minutes</SelectItem>
                  <SelectItem value="hours">Hours</SelectItem>
                </StyledSelect>
              </div>
            </FieldGroup>
          </>
        );

      case "priceCheck":
        return (
          <>
            <FieldGroup>
              <FieldLabel>Token Symbol</FieldLabel>
              <StyledInput
                placeholder="ETH"
                value={str(selectedNode.data.token)}
                onChange={(e) => updateField("token", e.target.value)}
              />
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Price Source</FieldLabel>
              <StyledSelect
                value={str(selectedNode.data.priceSource, "coingecko")}
                onValueChange={(v) => updateField("priceSource", v)}
              >
                <SelectItem value="coingecko">CoinGecko</SelectItem>
                <SelectItem value="coinmarketcap">CoinMarketCap</SelectItem>
                <SelectItem value="dexscreener">DexScreener</SelectItem>
                <SelectItem value="jupiter">Jupiter (Solana)</SelectItem>
                <SelectItem value="chainlink">Chainlink Oracle</SelectItem>
              </StyledSelect>
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

      case "gasOptimizer":
        return (
          <>
            <div className="grid grid-cols-2 gap-2">
              <FieldGroup>
                <FieldLabel>Max Gas (gwei)</FieldLabel>
                <StyledInput
                  type="number"
                  placeholder="20"
                  value={str(selectedNode.data.maxGas)}
                  onChange={(e) => updateField("maxGas", e.target.value)}
                />
              </FieldGroup>
              <FieldGroup>
                <FieldLabel>Timeout (min)</FieldLabel>
                <StyledInput
                  type="number"
                  placeholder="60"
                  value={str(selectedNode.data.timeout)}
                  onChange={(e) => updateField("timeout", e.target.value)}
                />
              </FieldGroup>
            </div>
            <FieldGroup>
              <FieldLabel>Strategy</FieldLabel>
              <StyledSelect
                value={str(selectedNode.data.strategy, "wait")}
                onValueChange={(v) => updateField("strategy", v)}
              >
                <SelectItem value="wait">Wait for low gas</SelectItem>
                <SelectItem value="flashbots">Use Flashbots</SelectItem>
                <SelectItem value="eip1559">EIP-1559 optimized</SelectItem>
              </StyledSelect>
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Chain</FieldLabel>
              <StyledSelect
                value={str(selectedNode.data.chain, "ethereum")}
                onValueChange={(v) => updateField("chain", v)}
              >
                {CHAIN_OPTIONS}
              </StyledSelect>
            </FieldGroup>
          </>
        );

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
      className="absolute top-4 right-4 w-72 z-10 flex flex-col overflow-hidden rounded-xl"
      style={{
        background: "rgba(2, 6, 23, 0.93)",
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
          className="shrink-0 w-5 h-5 rounded flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
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
