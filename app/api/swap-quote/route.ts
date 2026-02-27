// app/api/swap-quote/route.ts
import { NextResponse } from "next/server";

const CACHE: Record<string, { data: unknown; ts: number }> = {};
const CACHE_TTL = 15_000; // 15s

function cached(key: string, data: unknown) {
  CACHE[key] = { data, ts: Date.now() };
}
function getCache(key: string) {
  const entry = CACHE[key];
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) return null;
  return entry.data;
}

// ── Token address maps ────────────────────────────────────────────────────────

const SOLANA_TOKENS: Record<string, string> = {
  SOL: "So11111111111111111111111111111111111111112",
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  BONK: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
  JTO: "jtojtomepa8berpoaqv2zqd1yayatz9fn4j7amggr4",
  WIF: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
  JUP: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
  PYTH: "HZ1JovNiVvGrGs4qHK9wf3mkYq5jHCnVcJh3UxnnjX7",
  RAY: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
  ORCA: "orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE",
};

const EVM_TOKENS: Record<string, Record<string, string>> = {
  ethereum: {
    ETH: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    WBTC: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
    DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  },
  arbitrum: {
    ETH: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    USDC: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    ARB: "0x912CE59144191C1204E64559FE8253a0e49E6548",
    WBTC: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",
    GMX: "0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a",
  },
  optimism: {
    ETH: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    USDC: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607",
    USDT: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
    WBTC: "0x68f180fcCe6836688e9084f035309E29Bf0A2095",
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
    OP: "0x4200000000000000000000000000000000000042",
  },
  base: {
    ETH: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    WETH: "0x4200000000000000000000000000000000000006",
    cbETH: "0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22",
  },
};

// EVM chains where a given token actually exists — used for cross-chain validation
const EVM_CHAINS = new Set(Object.keys(EVM_TOKENS));

// ── Token validators ──────────────────────────────────────────────────────────

function isSolanaToken(token: string): boolean {
  return token.toUpperCase() in SOLANA_TOKENS;
}

function isEvmToken(chain: string, token: string): boolean {
  const chainTokens = EVM_TOKENS[chain];
  if (!chainTokens) return false;
  return token.toUpperCase() in chainTokens;
}

// ── Jupiter (Solana) ─────────────────────────────────────────────────────────

const COINGECKO_IDS: Record<string, string> = {
  SOL: "solana",
  USDC: "usd-coin",
  USDT: "tether",
  BONK: "bonk",
  JTO: "jito-governance-token",
  WIF: "dogwifcoin",
  JUP: "jupiter-exchange-solana",
  PYTH: "pyth-network",
  RAY: "raydium",
  ORCA: "orca",
};

async function fetchCoinGeckoPrices(
  tokens: string[],
): Promise<Record<string, number>> {
  const ids = tokens
    .map((t) => COINGECKO_IDS[t])
    .filter(Boolean)
    .join(",");
  if (!ids) return {};
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
      {
        signal: AbortSignal.timeout(5000),
        headers: { Accept: "application/json" },
      },
    );
    if (!res.ok) return {};
    const data = await res.json();
    const result: Record<string, number> = {};
    for (const [token, id] of Object.entries(COINGECKO_IDS)) {
      if (data[id]?.usd) result[token] = data[id].usd;
    }
    return result;
  } catch {
    return {};
  }
}

async function fetchJupiterQuote(
  fromToken: string,
  toToken: string,
  amount: number,
  slippage: number,
) {
  const fromUpper = fromToken.toUpperCase();
  const toUpper = toToken.toUpperCase();
  const inputMint = SOLANA_TOKENS[fromUpper];
  const outputMint = SOLANA_TOKENS[toUpper];

  // FIX: Return structured error instead of null so caller can distinguish
  // "unsupported token" from "API failure"
  if (!inputMint || !outputMint) {
    console.error(
      `[swap-quote] Unknown Solana token: ${fromToken} or ${toToken}`,
    );
    return {
      _error: "unsupported_token",
      message: `Token(s) not supported on Solana: ${!inputMint ? fromToken : ""}${!inputMint && !outputMint ? ", " : ""}${!outputMint ? toToken : ""}. Available: ${Object.keys(SOLANA_TOKENS).join(", ")}`,
    } as const;
  }

  const decimals: Record<string, number> = {
    SOL: 9,
    USDC: 6,
    USDT: 6,
    BONK: 5,
    JTO: 9,
    WIF: 6,
    JUP: 6,
    PYTH: 6,
    RAY: 6,
    ORCA: 6,
  };
  const dec = decimals[fromUpper] ?? 9;
  const outDec = decimals[toUpper] ?? 9;
  const rawAmount = Math.floor(amount * Math.pow(10, dec));
  const slippageBps = Math.round(slippage * 100);

  const params = `inputMint=${inputMint}&outputMint=${outputMint}&amount=${rawAmount}&slippageBps=${slippageBps}&onlyDirectRoutes=false`;
  const endpoints = [
    `https://quote-api.jup.ag/v6/quote?${params}`,
    `https://lite-api.jup.ag/swap/v1/quote?${params}`,
  ];

  for (const endpoint of endpoints) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(endpoint, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      clearTimeout(timeout);
      if (!res.ok) continue;
      const data = await res.json();
      if (data.error) continue;

      const outAmount = parseInt(data.outAmount ?? "0") / Math.pow(10, outDec);
      const inAmount = parseInt(data.inAmount ?? "0") / Math.pow(10, dec);
      const routes =
        data.routePlan
          ?.map((r: { swapInfo: { label: string } }) => r.swapInfo?.label)
          .filter(Boolean) ?? [];

      return {
        dex: "Jupiter",
        chain: "solana",
        fromToken: fromUpper,
        toToken: toUpper,
        inAmount,
        outAmount,
        rate: outAmount / inAmount,
        priceImpact: parseFloat(data.priceImpactPct ?? "0"),
        slippage,
        minReceived: outAmount * (1 - slippage / 100),
        route: routes.slice(0, 3).join(" → ") || "Direct",
        fee: data.platformFee
          ? parseFloat(data.platformFee.amount) / 1e6
          : null,
        isEstimate: false,
      };
    } catch {
      continue;
    }
  }

  // Jupiter unreachable — fall back to CoinGecko price estimate
  console.warn(
    `[swap-quote] Jupiter unreachable, using CoinGecko price estimate`,
  );
  const prices = await fetchCoinGeckoPrices([fromUpper, toUpper]);
  const fromPrice = prices[fromUpper];
  const toPrice = prices[toUpper];

  if (!fromPrice || !toPrice) return null;

  const rate = fromPrice / toPrice;
  const outAmount = amount * rate * (1 - 0.003);
  return {
    dex: "Jupiter (est.)",
    chain: "solana",
    fromToken: fromUpper,
    toToken: toUpper,
    inAmount: amount,
    outAmount,
    rate,
    priceImpact: null,
    slippage,
    minReceived: outAmount * (1 - slippage / 100),
    route: "CoinGecko price estimate",
    fee: null,
    isEstimate: true,
  };
}

// ── 1inch (EVM) ──────────────────────────────────────────────────────────────

const CHAIN_IDS: Record<string, number> = {
  ethereum: 1,
  arbitrum: 42161,
  base: 8453,
  optimism: 10,
  polygon: 137,
};

async function fetch1inchQuote(
  chain: string,
  fromToken: string,
  toToken: string,
  amount: number,
  slippage: number,
) {
  const chainId = CHAIN_IDS[chain];
  if (!chainId) return null;
  const tokens = EVM_TOKENS[chain] ?? EVM_TOKENS.ethereum;
  const src = tokens[fromToken] ?? fromToken;
  const dst = tokens[toToken] ?? toToken;

  const decimals: Record<string, number> = {
    ETH: 18,
    WETH: 18,
    USDC: 6,
    USDT: 6,
    WBTC: 8,
    DAI: 18,
    ARB: 18,
    GMX: 18,
    cbETH: 18,
    OP: 18,
  };
  const dec = decimals[fromToken] ?? 18;
  const rawAmount = Math.floor(amount * Math.pow(10, dec)).toString();

  const url = `https://api.1inch.dev/swap/v6.0/${chainId}/quote?src=${src}&dst=${dst}&amount=${rawAmount}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();

    const outDec = decimals[toToken] ?? 18;
    const outAmount = parseInt(data.dstAmount ?? "0") / Math.pow(10, outDec);
    const inAmount = amount;

    return {
      dex: "1inch",
      chain,
      fromToken,
      toToken,
      inAmount,
      outAmount,
      rate: outAmount / inAmount,
      priceImpact: null,
      slippage,
      minReceived: outAmount * (1 - slippage / 100),
      route: data.protocols?.[0]?.[0]?.[0]?.name ?? "Aggregated",
      fee: null,
      gas: data.gas ?? null,
    };
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

// ── Paraswap fallback ────────────────────────────────────────────────────────

async function fetchParaswapQuote(
  chain: string,
  fromToken: string,
  toToken: string,
  amount: number,
  slippage: number,
) {
  const chainId = CHAIN_IDS[chain];
  if (!chainId) return null;
  const tokens = EVM_TOKENS[chain] ?? EVM_TOKENS.ethereum;
  const srcToken = tokens[fromToken] ?? fromToken;
  const destToken = tokens[toToken] ?? toToken;

  const decimals: Record<string, number> = {
    ETH: 18,
    WETH: 18,
    USDC: 6,
    USDT: 6,
    WBTC: 8,
    DAI: 18,
    ARB: 18,
    OP: 18,
  };
  const dec = decimals[fromToken] ?? 18;
  const rawAmount = Math.floor(amount * Math.pow(10, dec)).toString();

  const url = `https://apiv5.paraswap.io/prices/?srcToken=${srcToken}&destToken=${destToken}&amount=${rawAmount}&srcDecimals=${dec}&destDecimals=${decimals[toToken] ?? 18}&network=${chainId}&side=SELL`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    const route = data.priceRoute;
    if (!route) return null;

    const outDec = decimals[toToken] ?? 18;
    const outAmount = parseInt(route.destAmount ?? "0") / Math.pow(10, outDec);

    return {
      dex: "Paraswap",
      chain,
      fromToken,
      toToken,
      inAmount: amount,
      outAmount,
      rate: outAmount / amount,
      priceImpact: null,
      slippage,
      minReceived: outAmount * (1 - slippage / 100),
      route:
        route.bestRoute?.[0]?.swaps?.[0]?.swapExchanges?.[0]?.exchange ??
        "Aggregated",
      fee: null,
      gas: route.gasCost ?? null,
    };
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const fromToken = (
      url.searchParams.get("fromToken") ?? "SOL"
    ).toUpperCase();
    const toToken = (url.searchParams.get("toToken") ?? "USDC").toUpperCase();
    const amount = parseFloat(url.searchParams.get("amount") ?? "1");
    const slippage = parseFloat(url.searchParams.get("slippage") ?? "0.5");
    const chain = (url.searchParams.get("chain") ?? "solana").toLowerCase();
    // FIX: normalize dex param — uniswap is an EVM dex, not valid on Solana;
    // treat it as "auto" so we fall through to 1inch/Paraswap on EVM chains.
    const dexRaw = (url.searchParams.get("dex") ?? "auto").toLowerCase();
    const SOLANA_DEXES = new Set(["jupiter", "orca", "raydium", "auto"]);
    const EVM_DEXES = new Set(["1inch", "paraswap", "uniswap", "auto"]);
    const dex = dexRaw; // kept for logging; routing logic uses sets above

    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    // FIX: Validate token/chain compatibility before attempting any fetch
    if (chain === "solana") {
      if (!SOLANA_DEXES.has(dexRaw) && dexRaw !== "uniswap") {
        return NextResponse.json(
          {
            error: `DEX "${dex}" is not supported on Solana. Use: jupiter, orca, raydium, or auto`,
          },
          { status: 400 },
        );
      }
      if (!isSolanaToken(fromToken)) {
        return NextResponse.json(
          {
            error: `"${fromToken}" is not a Solana token. Did you mean to use chain=ethereum or chain=arbitrum?`,
            supportedTokens: Object.keys(SOLANA_TOKENS),
          },
          { status: 400 },
        );
      }
      if (!isSolanaToken(toToken)) {
        return NextResponse.json(
          {
            error: `"${toToken}" is not a Solana token. Did you mean to use chain=ethereum or chain=arbitrum?`,
            supportedTokens: Object.keys(SOLANA_TOKENS),
          },
          { status: 400 },
        );
      }
    } else if (EVM_CHAINS.has(chain)) {
      if (!EVM_DEXES.has(dexRaw)) {
        return NextResponse.json(
          {
            error: `DEX "${dex}" is not supported on ${chain}. Use: 1inch, paraswap, uniswap, or auto`,
          },
          { status: 400 },
        );
      }
      if (!isEvmToken(chain, fromToken)) {
        return NextResponse.json(
          {
            error: `"${fromToken}" is not supported on ${chain}.`,
            supportedTokens: Object.keys(EVM_TOKENS[chain] ?? {}),
          },
          { status: 400 },
        );
      }
      if (!isEvmToken(chain, toToken)) {
        return NextResponse.json(
          {
            error: `"${toToken}" is not supported on ${chain}.`,
            supportedTokens: Object.keys(EVM_TOKENS[chain] ?? {}),
          },
          { status: 400 },
        );
      }
    } else {
      return NextResponse.json(
        {
          error: `Unsupported chain: "${chain}". Supported: solana, ${Object.keys(CHAIN_IDS).join(", ")}`,
        },
        { status: 400 },
      );
    }

    const cacheKey = `${chain}-${fromToken}-${toToken}-${amount}-${slippage}-${dex}`;
    const hit = getCache(cacheKey);
    if (hit) {
      return NextResponse.json({ ...(hit as object), cached: true });
    }

    let quote = null;

    if (chain === "solana") {
      // All Solana DEX options (Jupiter, Orca, Raydium) route through Jupiter aggregator
      const result = await fetchJupiterQuote(
        fromToken,
        toToken,
        amount,
        slippage,
      );
      // FIX: handle structured error object returned from fetchJupiterQuote
      if (result && "_error" in result) {
        return NextResponse.json({ error: result.message }, { status: 400 });
      }
      quote = result;
    } else {
      // EVM chains: try 1inch first (uniswap is treated as auto/1inch),
      // then fall back to Paraswap
      const use1inch =
        dexRaw === "auto" || dexRaw === "1inch" || dexRaw === "uniswap";
      const useParaswap = dexRaw === "auto" || dexRaw === "paraswap";

      if (use1inch) {
        quote = await fetch1inchQuote(
          chain,
          fromToken,
          toToken,
          amount,
          slippage,
        );
      }
      if (!quote && useParaswap) {
        quote = await fetchParaswapQuote(
          chain,
          fromToken,
          toToken,
          amount,
          slippage,
        );
      }
    }

    if (!quote) {
      return NextResponse.json(
        {
          error: `No quote available for ${fromToken} → ${toToken} on ${chain}. The DEX APIs may be temporarily unavailable.`,
        },
        { status: 502 },
      );
    }

    cached(cacheKey, quote);
    return NextResponse.json(quote);
  } catch (err) {
    console.error("[swap-quote]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
