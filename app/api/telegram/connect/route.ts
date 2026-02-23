// app/api/telegram/connect/route.ts
import { NextRequest, NextResponse } from "next/server";
import { telegramStore } from "@/lib/telegram-store";
import { randomBytes } from "crypto";

export async function POST(req: NextRequest) {
  const { wallet } = await req.json();
  if (!wallet)
    return NextResponse.json({ error: "No wallet" }, { status: 400 });

  // Generate a short-lived token to pass as /start payload
  const token = randomBytes(16).toString("hex");

  // Store pending: token → wallet (expires in 10 minutes)
  telegramStore.setPending(token, wallet);

  const botUrl = `https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME}?start=${token}`;

  return NextResponse.json({ botUrl, token });
}
