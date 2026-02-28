/**
 * lib/network/solana.config.ts
 *
 * Network config with RUNTIME switching support.
 * The useNetworkStore Zustand store is the source of truth at runtime.
 * Falls back to NEXT_PUBLIC_SOLANA_NETWORK env var for initial value.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SolanaNetwork = "devnet" | "mainnet-beta";

// ── Zustand store — persisted to localStorage ──────────────────────────────

interface NetworkStore {
  network: SolanaNetwork;
  setNetwork: (n: SolanaNetwork) => void;
  toggle: () => void;
}

function getEnvDefault(): SolanaNetwork {
  const env = process.env.NEXT_PUBLIC_SOLANA_NETWORK;
  if (env === "devnet") return "devnet";
  if (env === "mainnet-beta" || env === "mainnet") return "mainnet-beta";
  return process.env.NODE_ENV === "development" ? "devnet" : "mainnet-beta";
}

export const useNetworkStore = create<NetworkStore>()(
  persist(
    (set, get) => ({
      network: getEnvDefault(),
      setNetwork: (network) => set({ network }),
      toggle: () =>
        set({
          network: get().network === "devnet" ? "mainnet-beta" : "devnet",
        }),
    }),
    { name: "flowbuilder-network" },
  ),
);

// ── Helpers that read from the store at call-time ──────────────────────────

export function getNetwork(): SolanaNetwork {
  return useNetworkStore.getState().network;
}

export function isDevnet(): boolean {
  return getNetwork() === "devnet";
}

export function isMainnet(): boolean {
  return getNetwork() === "mainnet-beta";
}

// ── RPC endpoints ──────────────────────────────────────────────────────────────

export const RPC_ENDPOINTS: Record<SolanaNetwork, string[]> = {
  devnet: [
    process.env.NEXT_PUBLIC_SOLANA_RPC_DEVNET || "",
    "https://api.devnet.solana.com",
    "https://devnet.helius-rpc.com/?api-key=889111ff-fea0-486d-a228-7f39cb15b3f8",
  ].filter(Boolean) as string[],

  "mainnet-beta": [
    process.env.NEXT_PUBLIC_SOLANA_RPC || "",
    "https://mainnet.helius-rpc.com/?api-key=889111ff-fea0-486d-a228-7f39cb15b3f8",
    "https://api.mainnet-beta.solana.com",
  ].filter(Boolean) as string[],
};

export function getPrimaryRpc(network?: SolanaNetwork): string {
  const net = network ?? getNetwork();
  return RPC_ENDPOINTS[net][0];
}

export function getAllRpcs(network?: SolanaNetwork): string[] {
  const net = network ?? getNetwork();
  return RPC_ENDPOINTS[net];
}

// ── Jupiter API endpoints ──────────────────────────────────────────────────────
// Jupiter only has mainnet. On devnet, swaps will return "no route found".
// This is expected — devnet has almost no liquidity.
// Strategy: on devnet, still call Jupiter but use very small amounts.

export const JUPITER_ENDPOINTS = {
  quote: (proxyBase: string) => `${proxyBase}/api/jupiter/quote`,
  swap: (proxyBase: string) => `${proxyBase}/api/jupiter/swap`,
};

// ── Block explorers ────────────────────────────────────────────────────────────

export const EXPLORERS: Record<
  SolanaNetwork,
  { tx: (sig: string) => string; address: (addr: string) => string }
> = {
  devnet: {
    tx: (sig) => `https://explorer.solana.com/tx/${sig}?cluster=devnet`,
    address: (addr) =>
      `https://explorer.solana.com/address/${addr}?cluster=devnet`,
  },
  "mainnet-beta": {
    tx: (sig) => `https://solscan.io/tx/${sig}`,
    address: (addr) => `https://solscan.io/account/${addr}`,
  },
};

export function getExplorerTxUrl(
  signature: string,
  network?: SolanaNetwork,
): string {
  const net = network ?? getNetwork();
  return EXPLORERS[net].tx(signature);
}

export function getExplorerAddressUrl(
  address: string,
  network?: SolanaNetwork,
): string {
  const net = network ?? getNetwork();
  return EXPLORERS[net].address(address);
}

// ── Token addresses ────────────────────────────────────────────────────────────
// Mainnet tokens are the real ones.
// Devnet tokens: SOL works natively; others are test mints with no real liquidity.

export const TOKEN_ADDRESSES: Record<SolanaNetwork, Record<string, string>> = {
  "mainnet-beta": {
    SOL: "So11111111111111111111111111111111111111112",
    USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    BONK: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    JUP: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
    RAY: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
  },
  devnet: {
    // Native wrapped SOL — works the same on devnet
    SOL: "So11111111111111111111111111111111111111112",
    // Circle's official devnet USDC
    USDC: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
    // No devnet versions of these — fall back to SOL for swap testing
    USDT: "So11111111111111111111111111111111111111112",
    BONK: "So11111111111111111111111111111111111111112",
    JUP: "So11111111111111111111111111111111111111112",
    RAY: "So11111111111111111111111111111111111111112",
  },
};

export function getTokenAddress(
  symbol: string,
  network?: SolanaNetwork,
): string {
  const net = network ?? getNetwork();
  const upper = symbol.toUpperCase();
  return TOKEN_ADDRESSES[net][upper] || symbol; // fallback: treat as raw mint address
}

// ── Airdrop (devnet only) ──────────────────────────────────────────────────────

export const AIRDROP_AMOUNT_SOL = 2; // SOL to request from devnet faucet

// ── Network display helpers ────────────────────────────────────────────────────

export const NETWORK_DISPLAY: Record<
  SolanaNetwork,
  { label: string; color: string; bgColor: string; borderColor: string }
> = {
  devnet: {
    label: "DEVNET",
    color: "#facc15",
    bgColor: "rgba(250,204,21,0.08)",
    borderColor: "rgba(250,204,21,0.25)",
  },
  "mainnet-beta": {
    label: "MAINNET",
    color: "#22c55e",
    bgColor: "rgba(34,197,94,0.08)",
    borderColor: "rgba(34,197,94,0.25)",
  },
};

export function getNetworkDisplay(network?: SolanaNetwork) {
  const net = network ?? getNetwork();
  return NETWORK_DISPLAY[net];
}
