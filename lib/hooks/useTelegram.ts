"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useWallet } from "@/lib/hooks/useWallet";

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
  disconnect: () => Promise<void>;
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
              stopPolling();
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
        if (!wallet) {
          console.warn("[Telegram] No wallet connected");
          return;
        }

        const botUrl = await new Promise<string>((resolve) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", "/api/telegram/connect");
          xhr.setRequestHeader("Content-Type", "application/json");
          xhr.timeout = 8000;
          xhr.onload = () => {
            try {
              const data = JSON.parse(xhr.responseText);
              if (data.botUrl && !data.botUrl.includes("undefined")) {
                resolve(data.botUrl);
              } else {
                resolve("https://t.me/wraithopxzbot");
              }
            } catch {
              resolve("https://t.me/wraithopxzbot");
            }
          };
          xhr.onerror = () => resolve("https://t.me/wraithopxzbot");
          xhr.ontimeout = () => resolve("https://t.me/wraithopxzbot");
          xhr.send(JSON.stringify({ wallet }));
        });

        window.open(botUrl, "_blank");

        // Poll every 3s for up to 2 minutes until connected
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

      /**
       * Disconnect — clears both local state AND the server-side mapping.
       * This means the bot will also lose the link (no more alerts).
       */
      disconnect: async () => {
        stopPolling();
        const wallet = useWallet.getState().walletAddress();

        // Clear server mapping
        if (wallet) {
          try {
            await fetch("/api/telegram/disconnect", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ wallet }),
            });
          } catch {
            // ignore — local state cleared regardless
          }
        }

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
