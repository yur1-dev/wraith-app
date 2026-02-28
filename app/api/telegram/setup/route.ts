// app/api/telegram/setup/route.ts
// Visit this URL once after deploying to register the bot webhook + commands.
// https://your-app.vercel.app/api/telegram/setup

import { NextResponse } from "next/server";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://wraith-app.vercel.app";

export async function GET() {
  const webhookUrl = `${APP_URL}/api/telegram/webhook`;

  // 1. Set webhook
  const webhookRes = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ["message", "callback_query"],
        drop_pending_updates: true,
      }),
    },
  );
  const webhookData = await webhookRes.json();

  // 2. Set bot commands
  const commandsRes = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/setMyCommands`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        commands: [
          { command: "start", description: "Connect wallet or view status" },
          { command: "status", description: "Check linked wallet & chat ID" },
          { command: "alerts", description: "Alert delivery info" },
          {
            command: "disconnect",
            description: "Unlink wallet from this chat",
          },
          { command: "help", description: "Show all commands" },
        ],
      }),
    },
  );
  const commandsData = await commandsRes.json();

  // 3. Set bot description
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setMyDescription`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      description:
        "Wraith — real-time DeFi automation alerts. Connects to your Wraith flows and notifies you of swaps, bridges, and completions.",
    }),
  });

  return NextResponse.json({
    webhook: webhookData,
    commands: commandsData,
    webhookUrl,
  });
}
