// lib/telegram-store.ts
// ─────────────────────────────────────────────────────────────
// In-memory store for development.
// In production, replace the Map reads/writes with your DB
// (Prisma, Supabase, Redis, etc.) — the interface stays the same.
// ─────────────────────────────────────────────────────────────

interface PendingEntry {
  wallet: string;
  expiresAt: number; // unix ms
}

// wallet → chatId
const walletToChatId = new Map<string, string>();

// token → { wallet, expiresAt }
const pendingTokens = new Map<string, PendingEntry>();

export const telegramStore = {
  // Called when user clicks "Connect" in the app — reserves a token for them
  setPending(token: string, wallet: string) {
    pendingTokens.set(token, {
      wallet,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 min
    });
  },

  // Called by the webhook when user hits /start <token> in Telegram
  linkToken(token: string, chatId: string) {
    const entry = pendingTokens.get(token);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      pendingTokens.delete(token);
      return false;
    }
    walletToChatId.set(entry.wallet, chatId);
    pendingTokens.delete(token);
    return true;
  },

  // Called by /api/telegram/status
  getChatId(wallet: string): string | null {
    return walletToChatId.get(wallet) ?? null;
  },

  // Called by the flow runner when firing an alert
  isConnected(wallet: string): boolean {
    return walletToChatId.has(wallet);
  },
};
