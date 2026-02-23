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

        // Use XMLHttpRequest — browser extensions interfere with fetch
        // but XHR responses are more reliably readable
        const botUrl = await new Promise<string>((resolve) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", "/api/telegram/connect");
          xhr.setRequestHeader("Content-Type", "application/json");
          xhr.timeout = 8000;
          xhr.onload = () => {
            try {
              const data = JSON.parse(xhr.responseText);
              console.log("[Telegram] connect response:", data);
              if (data.botUrl && !data.botUrl.includes("undefined")) {
                resolve(data.botUrl);
              } else {
                console.warn("[Telegram] botUrl missing or undefined:", data);
                resolve("https://t.me/wraithopxzbot");
              }
            } catch (e) {
              console.error("[Telegram] parse error:", e, xhr.responseText);
              resolve("https://t.me/wraithopxzbot");
            }
          };
          xhr.onerror = () => {
            console.error("[Telegram] XHR error");
            resolve("https://t.me/wraithopxzbot");
          };
          xhr.ontimeout = () => {
            console.error("[Telegram] XHR timeout");
            resolve("https://t.me/wraithopxzbot");
          };
          xhr.send(JSON.stringify({ wallet }));
        });

        console.log("[Telegram] opening:", botUrl);
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
