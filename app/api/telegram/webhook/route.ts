// app/api/telegram/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { telegramStore } from "@/lib/telegram-store";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = body?.message;
    if (!message) return NextResponse.json({ ok: true });

    const chatId = String(message.chat?.id);
    const text = (message.text ?? "").trim();
    const firstName = message.from?.first_name ?? "anon";

    if (text.startsWith("/start")) {
      const token = text.split(" ")[1];
      const linked = token ? telegramStore.linkToken(token, chatId) : false;

      if (linked) {
        await send(
          chatId,
          [
            `👋 Hey ${firstName}!`,
            ``,
            `✅ <b>Wraith alerts connected.</b>`,
            ``,
            `Your flow alerts will be delivered here privately — swaps, bridges, errors, completions.`,
            ``,
            `Type /help to see available commands.`,
          ].join("\n"),
        );
      } else {
        await send(
          chatId,
          [
            `👋 Hey ${firstName}!`,
            ``,
            `I'm the <b>Wraith</b> alert bot.`,
            ``,
            `To connect me to your flows, open the Wraith app, drop an Alert node, select Telegram, and click <b>Open bot</b> in the properties panel.`,
            ``,
            `Type /help for more info.`,
          ].join("\n"),
        );
      }
    } else if (text === "/status") {
      const connected = telegramStore.isConnectedByChatId(chatId);
      await send(
        chatId,
        connected
          ? [
              `✅ <b>Connected</b>`,
              ``,
              `Your Wraith flows are linked to this chat. Alerts will arrive here automatically.`,
            ].join("\n")
          : [
              `❌ <b>Not connected</b>`,
              ``,
              `Open the Wraith app and click <b>Open bot</b> on an Alert node to link your wallet.`,
            ].join("\n"),
      );
    } else if (text === "/disconnect") {
      telegramStore.disconnectByChatId(chatId);
      await send(
        chatId,
        [
          `🔌 <b>Disconnected</b>`,
          ``,
          `Your wallet has been unlinked. You won't receive flow alerts until you reconnect from the app.`,
        ].join("\n"),
      );
    } else if (text === "/help") {
      await send(
        chatId,
        [
          `<b>Wraith Bot — Commands</b>`,
          ``,
          `/status — check if your wallet is connected`,
          `/disconnect — unlink your wallet from alerts`,
          `/help — show this message`,
          ``,
          `<i>Alerts fire automatically when your flows execute. No further action needed.</i>`,
        ].join("\n"),
      );
    } else {
      await send(
        chatId,
        [
          `I only send alerts — I don't respond to messages.`,
          ``,
          `Type /help to see available commands.`,
        ].join("\n"),
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[telegram/webhook]", err);
    return NextResponse.json({ ok: true });
  }
}

async function send(chatId: string, text: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
}
