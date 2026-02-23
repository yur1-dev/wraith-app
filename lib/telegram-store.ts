// lib/telegram-store.ts
// ─────────────────────────────────────────────────────────────
// In-memory store for development.
// In production, replace Map reads/writes with your DB
// (Prisma, Supabase, Redis, etc.) — the interface stays the same.
// ─────────────────────────────────────────────────────────────

interface PendingEntry {
  wallet: string;
  expiresAt: number;
}

// wallet → chatId
const walletToChatId = new Map<string, string>();
// chatId → wallet (reverse lookup)
const chatIdToWallet = new Map<string, string>();
// token → { wallet, expiresAt }
const pendingTokens = new Map<string, PendingEntry>();

export const telegramStore = {
  // Called when user clicks "Connect" in the app
  setPending(token: string, wallet: string) {
    pendingTokens.set(token, {
      wallet,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 min
    });
  },

  // Called by webhook when user hits /start <token>
  linkToken(token: string, chatId: string): boolean {
    const entry = pendingTokens.get(token);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      pendingTokens.delete(token);
      return false;
    }
    walletToChatId.set(entry.wallet, chatId);
    chatIdToWallet.set(chatId, entry.wallet);
    pendingTokens.delete(token);
    return true;
  },

  // Called by /api/telegram/status
  getChatId(wallet: string): string | null {
    return walletToChatId.get(wallet) ?? null;
  },

  // Called by the flow runner when sending an alert
  isConnected(wallet: string): boolean {
    return walletToChatId.has(wallet);
  },

  // Called by /status command in bot
  isConnectedByChatId(chatId: string): boolean {
    return chatIdToWallet.has(chatId);
  },

  // Called by /disconnect command in bot
  disconnectByChatId(chatId: string) {
    const wallet = chatIdToWallet.get(chatId);
    if (wallet) walletToChatId.delete(wallet);
    chatIdToWallet.delete(chatId);
  },

  // Called by /api/telegram/disconnect (app-side disconnect)
  removeByWallet(wallet: string) {
    const chatId = walletToChatId.get(wallet);
    if (chatId) chatIdToWallet.delete(chatId);
    walletToChatId.delete(wallet);
  },
};
