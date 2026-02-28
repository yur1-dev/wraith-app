// lib/telegram-store.ts
import { Redis } from "@upstash/redis";

const kv = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

const P = {
  pending: (token: string) => `tg:pending:${token}`,
  wallet: (wallet: string) => `tg:wallet:${wallet}`,
  chat: (chatId: string) => `tg:chat:${chatId}`,
};

export const telegramStore = {
  async setPending(token: string, wallet: string) {
    await kv.set(P.pending(token), wallet, { ex: 600 }); // 10 min TTL
  },

  async getPending(token: string): Promise<string | null> {
    return kv.get<string>(P.pending(token));
  },

  async linkToken(token: string, chatId: string): Promise<boolean> {
    const wallet = await kv.get<string>(P.pending(token));
    if (!wallet) {
      console.warn(`[telegram-store] token not found: "${token}"`);
      return false;
    }

    // Clean up old chat mapping if wallet reconnects from different chat
    const oldChatId = await kv.get<string>(P.wallet(wallet));
    if (oldChatId && oldChatId !== chatId) {
      await kv.del(P.chat(oldChatId));
    }

    await Promise.all([
      kv.set(P.wallet(wallet), chatId),
      kv.set(P.chat(chatId), wallet),
      kv.del(P.pending(token)),
    ]);

    console.log(`[telegram-store] linked wallet=${wallet} chatId=${chatId}`);
    return true;
  },

  async getChatId(wallet: string): Promise<string | null> {
    return kv.get<string>(P.wallet(wallet));
  },

  async getWalletByChatId(chatId: string): Promise<string | null> {
    return kv.get<string>(P.chat(chatId));
  },

  async isConnected(wallet: string): Promise<boolean> {
    return (await kv.get(P.wallet(wallet))) !== null;
  },

  async isConnectedByChatId(chatId: string): Promise<boolean> {
    return (await kv.get(P.chat(chatId))) !== null;
  },

  async removeByWallet(wallet: string) {
    const chatId = await kv.get<string>(P.wallet(wallet));
    await Promise.all([
      kv.del(P.wallet(wallet)),
      chatId ? kv.del(P.chat(chatId)) : Promise.resolve(),
    ]);
  },

  async disconnectByChatId(chatId: string) {
    const wallet = await kv.get<string>(P.chat(chatId));
    await Promise.all([
      kv.del(P.chat(chatId)),
      wallet ? kv.del(P.wallet(wallet)) : Promise.resolve(),
    ]);
  },
};
