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

  async linkToken(token: string, chatId: string): Promise<boolean> {
    const wallet = await kv.get<string>(P.pending(token));
    if (!wallet) return false;

    await Promise.all([
      kv.set(P.wallet(wallet), chatId),
      kv.set(P.chat(chatId), wallet),
      kv.del(P.pending(token)),
    ]);
    return true;
  },

  async getChatId(wallet: string): Promise<string | null> {
    return kv.get<string>(P.wallet(wallet));
  },

  async isConnected(wallet: string): Promise<boolean> {
    return (await kv.get(P.wallet(wallet))) !== null;
  },

  async isConnectedByChatId(chatId: string): Promise<boolean> {
    return (await kv.get(P.chat(chatId))) !== null;
  },

  async disconnectByChatId(chatId: string) {
    const wallet = await kv.get<string>(P.chat(chatId));
    await Promise.all([
      wallet ? kv.del(P.wallet(wallet)) : Promise.resolve(),
      kv.del(P.chat(chatId)),
    ]);
  },

  async removeByWallet(wallet: string) {
    const chatId = await kv.get<string>(P.wallet(wallet));
    await Promise.all([
      kv.del(P.wallet(wallet)),
      chatId ? kv.del(P.chat(chatId)) : Promise.resolve(),
    ]);
  },
};
