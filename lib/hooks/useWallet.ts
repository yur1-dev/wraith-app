"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type WalletType = "phantom" | "metamask" | null;

interface WalletStore {
  walletAddress: string | null;
  walletType: WalletType;
  isConnecting: boolean;
  isConnected: boolean;
  balance: string | null;
  connectPhantom: () => Promise<void>;
  connectMetaMask: () => Promise<void>;
  disconnect: () => void;
  setBalance: (balance: string) => void;
}

export const useWallet = create<WalletStore>()(
  persist(
    (set, get) => ({
      walletAddress: null,
      walletType: null,
      isConnecting: false,
      isConnected: false,
      balance: null,

      connectPhantom: async () => {
        try {
          set({ isConnecting: true });

          const win = window as any;

          if (!win.solana || !win.solana.isPhantom) {
            window.open("https://phantom.app/", "_blank");
            throw new Error("Phantom wallet not found. Please install it.");
          }

          const response = await win.solana.connect();
          const address = response.publicKey.toString();

          set({
            walletAddress: address,
            walletType: "phantom",
            isConnected: true,
            isConnecting: false,
          });
        } catch (error: any) {
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

          const accounts = await win.ethereum.request({
            method: "eth_requestAccounts",
          });

          const address = accounts[0];

          set({
            walletAddress: address,
            walletType: "metamask",
            isConnected: true,
            isConnecting: false,
          });
        } catch (error: any) {
          set({ isConnecting: false });
          throw error;
        }
      },

      disconnect: () => {
        const { walletType } = get();
        const win = window as any;

        if (walletType === "phantom" && win.solana) {
          win.solana.disconnect();
        }

        set({
          walletAddress: null,
          walletType: null,
          isConnected: false,
          balance: null,
        });
      },

      setBalance: (balance: string) => set({ balance }),
    }),
    {
      name: "flowdefi-wallet",
      partialize: (state) => ({
        walletAddress: state.walletAddress,
        walletType: state.walletType,
        isConnected: state.isConnected,
      }),
    },
  ),
);
