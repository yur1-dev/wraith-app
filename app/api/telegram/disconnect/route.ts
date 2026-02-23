// app/api/telegram/disconnect/route.ts
import { NextRequest, NextResponse } from "next/server";
import { telegramStore } from "@/lib/telegram-store";

export async function POST(req: NextRequest) {
  try {
    const { wallet } = await req.json();
    if (!wallet)
      return NextResponse.json({ error: "wallet required" }, { status: 400 });

    await telegramStore.removeByWallet(wallet);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
