"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type WalletType = "phantom" | "metamask";

export interface ConnectedWallet {
  address: string;
  type: WalletType;
  label: string; // e.g. "Phantom 1", "MetaMask 2"
  balance?: string;
  chainId?: string;
  connectedAt: number;
}

interface WalletStore {
  wallets: ConnectedWallet[];
  activeWalletAddress: string | null;
  isConnecting: boolean;

  // Computed helpers
  activeWallet: () => ConnectedWallet | null;
  isConnected: () => boolean;
  walletAddress: () => string | null;
  walletType: () => WalletType | null;

  // Actions
  connectPhantom: () => Promise<void>;
  connectMetaMask: () => Promise<void>;
  disconnectWallet: (address: string) => void;
  disconnectAll: () => void;
  setActiveWallet: (address: string) => void;
  setBalance: (address: string, balance: string) => void;
  updateLabel: (address: string, label: string) => void;
}

function generateLabel(type: WalletType, existing: ConnectedWallet[]): string {
  const ofType = existing.filter((w) => w.type === type);
  const name = type === "phantom" ? "Phantom" : "MetaMask";
  return ofType.length === 0 ? name : `${name} ${ofType.length + 1}`;
}

export const useWallet = create<WalletStore>()(
  persist(
    (set, get) => ({
      wallets: [],
      activeWalletAddress: null,
      isConnecting: false,

      activeWallet: () => {
        const { wallets, activeWalletAddress } = get();
        return wallets.find((w) => w.address === activeWalletAddress) ?? null;
      },

      isConnected: () => get().wallets.length > 0,

      walletAddress: () => {
        const active = get().activeWallet();
        return active?.address ?? null;
      },

      walletType: () => {
        const active = get().activeWallet();
        return active?.type ?? null;
      },

      connectPhantom: async () => {
        try {
          set({ isConnecting: true });
          const win = window as any;

          if (!win.solana?.isPhantom) {
            window.open("https://phantom.app/", "_blank");
            throw new Error("Phantom wallet not found. Please install it.");
          }

          const response = await win.solana.connect();
          const address = response.publicKey.toString();

          const { wallets } = get();

          // Already connected — just switch to it
          if (wallets.find((w) => w.address === address)) {
            set({ activeWalletAddress: address, isConnecting: false });
            return;
          }

          const newWallet: ConnectedWallet = {
            address,
            type: "phantom",
            label: generateLabel("phantom", wallets),
            connectedAt: Date.now(),
          };

          set({
            wallets: [...wallets, newWallet],
            activeWalletAddress: address,
            isConnecting: false,
          });
        } catch (error) {
          set({ isConnecting: false });
          throw error;
        }
      },

      connectMetaMask: async () => {
        try {
          set({ isConnecting: true });
          const win = window as any;

          if (!win.ethereum) {
            window.open("https://metamask.io/", "_blank");
            throw new Error("MetaMask not found. Please install it.");
          }

          const accounts: string[] = await win.ethereum.request({
            method: "eth_requestAccounts",
          });

          const address = accounts[0];
          const { wallets } = get();

          if (wallets.find((w) => w.address === address)) {
            set({ activeWalletAddress: address, isConnecting: false });
            return;
          }

          // Get chain id
          let chainId: string | undefined;
          try {
            chainId = await win.ethereum.request({ method: "eth_chainId" });
          } catch {}

          const newWallet: ConnectedWallet = {
            address,
            type: "metamask",
            label: generateLabel("metamask", wallets),
            chainId,
            connectedAt: Date.now(),
          };

          set({
            wallets: [...wallets, newWallet],
            activeWalletAddress: address,
            isConnecting: false,
          });
        } catch (error) {
          set({ isConnecting: false });
          throw error;
        }
      },

      disconnectWallet: (address: string) => {
        const { wallets, activeWalletAddress } = get();
        const win = window as any;

        const wallet = wallets.find((w) => w.address === address);
        if (wallet?.type === "phantom" && win.solana) {
          win.solana.disconnect();
        }

        const remaining = wallets.filter((w) => w.address !== address);
        const newActive =
          activeWalletAddress === address
            ? (remaining[0]?.address ?? null)
            : activeWalletAddress;

        set({ wallets: remaining, activeWalletAddress: newActive });
      },

      disconnectAll: () => {
        const win = window as any;
        if (win.solana) win.solana.disconnect();
        set({ wallets: [], activeWalletAddress: null });
      },

      setActiveWallet: (address: string) => {
        set({ activeWalletAddress: address });
      },

      setBalance: (address: string, balance: string) => {
        set((state) => ({
          wallets: state.wallets.map((w) =>
            w.address === address ? { ...w, balance } : w,
          ),
        }));
      },

      updateLabel: (address: string, label: string) => {
        set((state) => ({
          wallets: state.wallets.map((w) =>
            w.address === address ? { ...w, label } : w,
          ),
        }));
      },
    }),
    {
      name: "flowdefi-wallet-v2",
      partialize: (state) => ({
        wallets: state.wallets,
        activeWalletAddress: state.activeWalletAddress,
      }),
    },
  ),
);
