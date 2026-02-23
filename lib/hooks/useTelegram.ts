"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useWallet } from "@/lib/hooks/useWallet";

interface TelegramStore {
  chatId: string | null;
  isConnected: boolean;
  isChecking: boolean;

  checkConnection: () => Promise<void>;
  openBot: () => Promise<void>;
  disconnect: () => void;
}

export const useTelegram = create<TelegramStore>()(
  persist(
    (set) => ({
      chatId: null,
      isConnected: false,
      isChecking: false,

      checkConnection: async () => {
        const wallet = useWallet.getState().walletAddress();
        if (!wallet) return;

        set({ isChecking: true });
        try {
          const res = await fetch(`/api/telegram/status?wallet=${wallet}`);
          if (res.ok) {
            const data = await res.json();
            if (data.chatId) {
              set({ chatId: data.chatId, isConnected: true });
            }
          }
        } catch {
          // silently fail
        } finally {
          set({ isChecking: false });
        }
      },

      // Generates a token → opens t.me/wraithopxzbot?start=<token>
      openBot: async () => {
        const wallet = useWallet.getState().walletAddress();
        if (!wallet) return;

        try {
          const res = await fetch("/api/telegram/connect", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ wallet }),
          });
          const data = await res.json();
          if (data.botUrl) {
            window.open(data.botUrl, "_blank");
          }
        } catch {
          window.open("https://t.me/wraithopxzbot", "_blank");
        }
      },

      disconnect: () => {
        set({ chatId: null, isConnected: false });
      },
    }),
    {
      name: "flowdefi-telegram",
      partialize: (state) => ({
        chatId: state.chatId,
        isConnected: state.isConnected,
      }),
    },
  ),
);
