// app/api/telegram/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;

// Simple in-memory store for dev — replace with your DB in prod
// Key: pendingToken (from /start payload), Value: chatId
// Key: walletAddress, Value: chatId
import { telegramStore } from "@/lib/telegram-store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = body?.message;

    if (!message) return NextResponse.json({ ok: true });

    const chatId = message.chat?.id;
    const text = message.text ?? "";
    const firstName = message.from?.first_name ?? "anon";

    // /start <token> — token was generated when user clicked "Connect" in the app
    if (text.startsWith("/start")) {
      const parts = text.split(" ");
      const token = parts[1]; // e.g. /start abc123token

      if (token) {
        // Link the pending token → chatId
        telegramStore.linkToken(token, String(chatId));
      }

      // Confirm to user
      await sendMessage(
        chatId,
        [
          `👋 Hey ${firstName}!`,
          ``,
          `✅ <b>Wraith alerts connected.</b>`,
          ``,
          `You'll receive flow execution alerts here — swaps, bridges, errors, completions.`,
          ``,
          `<i>You can close this chat. Alerts will arrive automatically.</i>`,
        ].join("\n"),
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[telegram/webhook]", err);
    return NextResponse.json({ ok: true }); // always 200 to Telegram
  }
}

async function sendMessage(chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
}
