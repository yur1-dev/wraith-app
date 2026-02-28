// lib/telegram/sendAlert.ts
import { telegramStore } from "@/lib/telegram-store";
import {
  buildExecutionAlert,
  type NodeResult,
} from "@/app/api/telegram/webhook/route";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN!;

export type { NodeResult };

export interface SendFlowAlertParams {
  walletAddress: string;
  results: NodeResult[];
  elapsedMs?: number;
  network?: string;
  flowName?: string;
}

export async function sendFlowAlert(params: SendFlowAlertParams) {
  const chatId = await telegramStore.getChatId(params.walletAddress);
  if (!chatId) return; // No bot connected — skip silently

  const { text, reply_markup } = buildExecutionAlert(params);

  await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      reply_markup,
    }),
  });
}
