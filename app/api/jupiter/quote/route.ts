import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

// Server-side proxy for Jupiter API
// This bypasses any client-side DNS/ISP blocks since the request
// goes from YOUR SERVER → Jupiter, not from the user's browser

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const params = {
      inputMint: searchParams.get("inputMint"),
      outputMint: searchParams.get("outputMint"),
      amount: searchParams.get("amount"),
      slippageBps: searchParams.get("slippageBps"),
    };

    const response = await axios.get("https://quote-api.jup.ag/v6/quote", {
      params,
    });

    return NextResponse.json(response.data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: error.response?.status ?? 500 },
    );
  }
}
