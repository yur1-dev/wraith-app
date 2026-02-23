"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useWallet } from "@/lib/hooks/useWallet";

// Kept outside the store so it doesn't pollute persisted state
let _pollInterval: ReturnType<typeof setInterval> | null = null;

function stopPolling() {
  if (_pollInterval) {
    clearInterval(_pollInterval);
    _pollInterval = null;
  }
}

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
    (set, get) => ({
      chatId: null,
      isConnected: false,
      isChecking: false,

      checkConnection: async () => {
        const wallet = useWallet.getState().walletAddress();
        if (!wallet) return;

        set({ isChecking: true });
        try {
          const res = await fetch(
            `/api/telegram/status?wallet=${encodeURIComponent(wallet)}`,
          );
          if (res.ok) {
            const data = await res.json();
            if (data.chatId) {
              set({ chatId: data.chatId, isConnected: true });
              stopPolling(); // already connected — stop
            }
          }
        } catch {
          // silently fail
        } finally {
          set({ isChecking: false });
        }
      },

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

        // After opening the bot, poll every 3s (up to 2 min = 40 attempts)
        // until the user hits /start and the backend links their chatId
        stopPolling();
        let attempts = 0;
        _pollInterval = setInterval(async () => {
          attempts++;
          await get().checkConnection();
          if (attempts >= 40 || get().isConnected) {
            stopPolling();
          }
        }, 3000);
      },

      disconnect: () => {
        stopPolling();
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
