import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const response = await axios.post(
      "https://quote-api.jup.ag/v6/swap",
      body,
      { headers: { "Content-Type": "application/json" } },
    );

    return NextResponse.json(response.data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: error.response?.status ?? 500 },
    );
  }
}
