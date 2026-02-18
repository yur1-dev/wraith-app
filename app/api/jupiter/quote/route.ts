import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const params = searchParams.toString();

  const res = await fetch(`https://api.jup.ag/swap/v1/quote?${params}`, {
    headers: {
      "x-api-key": process.env.JUPITER_API_KEY || "",
    },
  });
  const data = await res.json();
  return NextResponse.json(data);
}
