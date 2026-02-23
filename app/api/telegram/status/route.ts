// app/api/telegram/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { telegramStore } from "@/lib/telegram-store";

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");
  if (!wallet) return NextResponse.json({ chatId: null });

  const chatId = telegramStore.getChatId(wallet);
  return NextResponse.json({ chatId: chatId ?? null });
}
