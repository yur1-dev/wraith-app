/**
 * jupiterSwap.ts
 * Real on-chain swap execution via Jupiter Aggregator v6 API.
 * Uses Phantom (or any window.solana-compatible wallet) to sign + send.
 * No simulation. No mocks.
 */

import {
  Connection,
  VersionedTransaction,
  PublicKey,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";

// ── Known token mints ──────────────────────────────────────────────────────
export const TOKEN_MINTS: Record<string, string> = {
  SOL: "So11111111111111111111111111111111111111112",
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  BONK: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
  JUP: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
  RAY: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
  WIF: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
  PYTH: "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3",
};

// ── RPC endpoints — falls back through list ────────────────────────────────
const RPC_ENDPOINTS = [
  "https://api.mainnet-beta.solana.com",
  "https://solana-api.projectserum.com",
  "https://rpc.ankr.com/solana",
];

// ── Jupiter API base ───────────────────────────────────────────────────────
const JUPITER_QUOTE_API = "https://quote-api.jup.ag/v6";

export interface SwapParams {
  inputMint: string; // token mint address
  outputMint: string; // token mint address
  amountUSD: number; // USD value to swap
  slippageBps: number; // e.g. 50 = 0.5%, 100 = 1%
  walletPublicKey: string;
}

export interface SwapResult {
  txSignature: string;
  inputAmount: number;
  outputAmount: number;
  priceImpactPct: number;
  fee: number;
}

// ── Get a working RPC connection ───────────────────────────────────────────
async function getConnection(): Promise<Connection> {
  for (const endpoint of RPC_ENDPOINTS) {
    try {
      const conn = new Connection(endpoint, "confirmed");
      await conn.getLatestBlockhash(); // test it works
      return conn;
    } catch {
      continue;
    }
  }
  throw new Error("All RPC endpoints unreachable — check your connection");
}

// ── Get SOL price in USD via Jupiter price API ─────────────────────────────
async function getSolPriceUSD(): Promise<number> {
  const res = await fetch(
    `${JUPITER_QUOTE_API}/price?ids=${TOKEN_MINTS.SOL}&vsToken=${TOKEN_MINTS.USDC}`,
  );
  if (!res.ok) throw new Error("Failed to fetch SOL price");
  const data = await res.json();
  const price = data?.data?.[TOKEN_MINTS.SOL]?.price;
  if (!price) throw new Error("SOL price unavailable");
  return Number(price);
}

// ── Convert USD amount to token lamports ──────────────────────────────────
async function usdToInputLamports(
  inputMint: string,
  amountUSD: number,
): Promise<number> {
  if (inputMint === TOKEN_MINTS.SOL) {
    const solPrice = await getSolPriceUSD();
    const solAmount = amountUSD / solPrice;
    return Math.floor(solAmount * LAMPORTS_PER_SOL);
  }
  // For USDC/USDT (6 decimals), 1 USD = 1,000,000 units
  if (inputMint === TOKEN_MINTS.USDC || inputMint === TOKEN_MINTS.USDT) {
    return Math.floor(amountUSD * 1_000_000);
  }
  // Fallback: treat as 9 decimal token
  return Math.floor(amountUSD * LAMPORTS_PER_SOL);
}

// ── Get Jupiter quote ──────────────────────────────────────────────────────
async function getQuote(params: {
  inputMint: string;
  outputMint: string;
  amount: number; // in lamports/smallest unit
  slippageBps: number;
}) {
  const url = new URL(`${JUPITER_QUOTE_API}/quote`);
  url.searchParams.set("inputMint", params.inputMint);
  url.searchParams.set("outputMint", params.outputMint);
  url.searchParams.set("amount", String(params.amount));
  url.searchParams.set("slippageBps", String(params.slippageBps));
  url.searchParams.set("onlyDirectRoutes", "false");
  url.searchParams.set("asLegacyTransaction", "false");

  const res = await fetch(url.toString());
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Jupiter quote failed: ${err}`);
  }
  return res.json();
}

// ── Get swap transaction from Jupiter ─────────────────────────────────────
async function getSwapTransaction(
  quoteResponse: unknown,
  walletPublicKey: string,
) {
  const res = await fetch(`${JUPITER_QUOTE_API}/swap`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      quoteResponse,
      userPublicKey: walletPublicKey,
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: "auto",
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Jupiter swap tx failed: ${err}`);
  }
  return res.json();
}

// ── Get Phantom provider ───────────────────────────────────────────────────
function getPhantomProvider() {
  // EIP-1193 multi-wallet: if providers[] array exists, find the right one
  // For Solana wallets: prefer window.phantom.solana (specific), then solana, backpack, solflare
  const win = window as any;
  const provider =
    win.phantom?.solana ??
    (win.solana?.isPhantom ? win.solana : null) ??
    win.backpack ??
    (win.solflare?.isSolflare ? win.solflare : null) ??
    // Fallback: any injected Solana provider
    win.solana;

  if (!provider) {
    throw new Error(
      "No Solana wallet detected — connect Phantom/Backpack in the WalletConnect node first",
    );
  }
  if (!provider.isConnected || !provider.publicKey) {
    throw new Error(
      "Wallet is not connected — use the WalletConnect node to connect first",
    );
  }
  return provider;
}

// ── Main swap function ─────────────────────────────────────────────────────
export async function executeJupiterSwap(
  params: SwapParams,
): Promise<SwapResult> {
  const { inputMint, outputMint, amountUSD, slippageBps, walletPublicKey } =
    params;

  // 1. Validate wallet
  const provider = getPhantomProvider();
  const pubkey = provider.publicKey.toString();
  if (pubkey !== walletPublicKey) {
    throw new Error(
      `Connected wallet (${pubkey.slice(0, 8)}…) doesn't match node wallet (${walletPublicKey.slice(0, 8)}…)`,
    );
  }

  // 2. Get RPC connection
  const connection = await getConnection();

  // 3. Check SOL balance (need gas)
  const balance = await connection.getBalance(new PublicKey(walletPublicKey));
  const solBalance = balance / LAMPORTS_PER_SOL;
  if (solBalance < 0.002) {
    throw new Error(
      `Insufficient SOL for gas — need at least 0.002 SOL, have ${solBalance.toFixed(4)}`,
    );
  }

  // 4. Convert USD amount to input token units
  const inputAmount = await usdToInputLamports(inputMint, amountUSD);
  if (inputAmount <= 0) {
    throw new Error("Swap amount too small");
  }

  // 5. Get quote
  const quote = await getQuote({
    inputMint,
    outputMint,
    amount: inputAmount,
    slippageBps,
  });

  const priceImpactPct = parseFloat(quote.priceImpactPct ?? "0");
  if (priceImpactPct > 5) {
    throw new Error(
      `Price impact too high: ${priceImpactPct.toFixed(2)}% — reduce swap amount`,
    );
  }

  // 6. Get swap transaction
  const { swapTransaction } = await getSwapTransaction(quote, walletPublicKey);

  // 7. Deserialize + sign via wallet
  const txBuffer = Buffer.from(swapTransaction, "base64");
  const transaction = VersionedTransaction.deserialize(txBuffer);

  let signedTx: VersionedTransaction;
  try {
    signedTx = await provider.signTransaction(transaction);
  } catch (err: any) {
    if (err?.code === 4001 || err?.message?.includes("rejected")) {
      throw new Error("Transaction rejected by user in wallet");
    }
    throw new Error(`Wallet signing failed: ${err?.message ?? "unknown"}`);
  }

  // 8. Send + confirm transaction
  const rawTx = signedTx.serialize();
  let txSignature: string;
  try {
    txSignature = await connection.sendRawTransaction(rawTx, {
      skipPreflight: false,
      maxRetries: 3,
      preflightCommitment: "confirmed",
    });
  } catch (err: any) {
    const msg = err?.message ?? "";
    if (msg.includes("insufficient funds")) {
      throw new Error("Insufficient token balance for this swap");
    }
    if (msg.includes("blockhash")) {
      throw new Error("Transaction expired — network congested, try again");
    }
    throw new Error(`Send failed: ${msg}`);
  }

  // 9. Confirm
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash();
  const confirmation = await connection.confirmTransaction(
    { signature: txSignature, blockhash, lastValidBlockHeight },
    "confirmed",
  );

  if (confirmation.value.err) {
    throw new Error(
      `Transaction failed on-chain: ${JSON.stringify(confirmation.value.err)}`,
    );
  }

  return {
    txSignature,
    inputAmount: inputAmount / LAMPORTS_PER_SOL,
    outputAmount: parseFloat(quote.outAmount ?? "0") / 1_000_000,
    priceImpactPct,
    fee: 0.000005, // base Solana tx fee
  };
}

// ── Back-and-forth helper: SOL→USDC→SOL ───────────────────────────────────
export async function executeRoundTripSwap(params: {
  amountUSD: number;
  slippageBps: number;
  walletPublicKey: string;
}): Promise<SwapResult> {
  // First leg: SOL → USDC
  const leg1 = await executeJupiterSwap({
    inputMint: TOKEN_MINTS.SOL,
    outputMint: TOKEN_MINTS.USDC,
    amountUSD: params.amountUSD,
    slippageBps: params.slippageBps,
    walletPublicKey: params.walletPublicKey,
  });

  // Small pause between legs to avoid nonce issues
  await new Promise((res) => setTimeout(res, 1500));

  // Second leg: USDC → SOL (using output from first leg)
  const leg2 = await executeJupiterSwap({
    inputMint: TOKEN_MINTS.USDC,
    outputMint: TOKEN_MINTS.SOL,
    amountUSD: params.amountUSD * (1 - leg1.priceImpactPct / 100),
    slippageBps: params.slippageBps,
    walletPublicKey: params.walletPublicKey,
  });

  return {
    txSignature: leg2.txSignature,
    inputAmount: leg1.inputAmount,
    outputAmount: leg2.outputAmount,
    priceImpactPct: leg1.priceImpactPct + leg2.priceImpactPct,
    fee: leg1.fee + leg2.fee,
  };
}
