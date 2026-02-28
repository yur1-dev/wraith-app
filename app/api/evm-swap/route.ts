// app/api/evm-swap/route.ts
import { NextRequest, NextResponse } from "next/server";

const ONEINCH_API = "https://api.1inch.dev/swap/v6.0";
const API_KEY = process.env.ONEINCH_API_KEY ?? "";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      chainId,
      src,
      dst,
      amount,
      from,
      slippage,
      disableEstimate,
      allowPartialFill,
    } = body;

    if (!chainId || !src || !dst || !amount || !from) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const params = new URLSearchParams({
      src,
      dst,
      amount,
      from,
      slippage: String(slippage ?? 1),
      disableEstimate: String(disableEstimate ?? false),
      allowPartialFill: String(allowPartialFill ?? false),
    });

    const res = await fetch(`${ONEINCH_API}/${chainId}/swap?${params}`, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        Accept: "application/json",
      },
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data?.description ?? "1inch API error" },
        { status: res.status },
      );
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Internal error" },
      { status: 500 },
    );
  }
}
