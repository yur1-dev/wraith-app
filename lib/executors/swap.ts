/**
 * lib/executors/swap.ts
 *
 * Unified swap executor supporting:
 *  - Jupiter  → mainnet only (best routes, most liquidity)
 *  - Raydium  → mainnet + devnet (via api-v3-devnet.raydium.io)
 *  - Orca     → mainnet + devnet (Whirlpools SDK)
 *  - Auto     → picks best DEX for current network
 *
 * On devnet, Jupiter is blocked (no liquidity) and Auto routes to Raydium.
 */

import { Node } from "@xyflow/react";
import {
  Connection,
  Keypair,
  VersionedTransaction,
  Transaction,
  PublicKey,
  LAMPORTS_PER_SOL,
  SystemProgram,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import bs58 from "bs58";
import {
  getNetwork,
  isDevnet,
  getPrimaryRpc,
  getTokenAddress,
  getExplorerTxUrl,
  AIRDROP_AMOUNT_SOL,
  type SolanaNetwork,
} from "@/lib/network/solana.config";

const PROXY_BASE = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// ── Raydium API base URLs ──────────────────────────────────────────────────────
const RAYDIUM_API = {
  devnet: "https://api-v3-devnet.raydium.io",
  "mainnet-beta": "https://api-v3.raydium.io",
};

// ── Known devnet pool IDs (SOL/USDC) ──────────────────────────────────────────
// Raydium devnet CPMM SOL-USDC pool
const RAYDIUM_DEVNET_SOL_USDC_POOL =
  "7JuwJuNU88gurFnyWeiyGKbFmExMWcmRZntn9imEzdny";

// ── Helper: decode private key (base58 or JSON array) ─────────────────────────
function decodePrivateKey(privateKey: string): Keypair {
  const trimmed = privateKey.trim();
  if (trimmed.startsWith("[")) {
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(trimmed)));
  }
  return Keypair.fromSecretKey(bs58.decode(trimmed));
}

// ── Helper: parse amount to lamports/base units ───────────────────────────────
function parseAmount(amount: string | number, token: string): number {
  const decimals = String(token).toUpperCase() === "USDC" ? 6 : 9;
  return Math.floor(parseFloat(String(amount)) * Math.pow(10, decimals));
}

// ── Helper: ensure ATA exists for output token ────────────────────────────────
async function ensureAta(
  connection: Connection,
  wallet: Keypair,
  outputMint: string,
): Promise<void> {
  const isNativeSol =
    outputMint === "So11111111111111111111111111111111111111112";
  if (isNativeSol) return;

  const mintPubkey = new PublicKey(outputMint);
  const ata = await getAssociatedTokenAddress(
    mintPubkey,
    wallet.publicKey,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );

  const info = await connection.getAccountInfo(ata);
  if (info !== null) return;

  console.log(`🏗️  Creating ATA: ${ata.toString()}`);
  const ix = createAssociatedTokenAccountInstruction(
    wallet.publicKey,
    ata,
    wallet.publicKey,
    mintPubkey,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");
  const tx = new Transaction({
    feePayer: wallet.publicKey,
    blockhash,
    lastValidBlockHeight,
  }).add(ix);
  tx.sign(wallet);
  const sig = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
  });
  await connection.confirmTransaction(
    { signature: sig, blockhash, lastValidBlockHeight },
    "confirmed",
  );
  console.log(`✅ ATA created: ${sig}`);
}

// ── JUPITER SWAP (mainnet only) ───────────────────────────────────────────────
async function executeJupiterSwap(
  connection: Connection,
  wallet: Keypair,
  network: SolanaNetwork,
  fromToken: string,
  toToken: string,
  amount: string | number,
  slippage: string | number,
): Promise<SwapResult> {
  if (network !== "mainnet-beta") {
    return {
      success: false,
      error:
        "Jupiter only works on mainnet. Switch to Raydium or Orca for devnet testing, or switch your network to mainnet.",
    };
  }

  const inputMint = getTokenAddress(fromToken.toUpperCase(), network);
  const outputMint = getTokenAddress(toToken.toUpperCase(), network);
  const amountLamports = parseAmount(amount, fromToken);
  const slippageBps = Math.floor(parseFloat(String(slippage || "1")) * 100);

  await ensureAta(connection, wallet, outputMint);

  const quoteParams = new URLSearchParams({
    inputMint,
    outputMint,
    amount: String(amountLamports),
    slippageBps: String(slippageBps),
  });

  const quoteRes = await fetch(
    `${PROXY_BASE}/api/jupiter/quote?${quoteParams}`,
  );
  if (!quoteRes.ok)
    throw new Error(`Jupiter quote failed: ${await quoteRes.text()}`);
  const quote = await quoteRes.json();
  if (quote.error) throw new Error(`Jupiter: ${quote.error}`);

  const swapRes = await fetch(`${PROXY_BASE}/api/jupiter/swap`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      quoteResponse: quote,
      userPublicKey: wallet.publicKey.toString(),
      wrapAndUnwrapSol: true,
    }),
  });
  if (!swapRes.ok)
    throw new Error(`Jupiter swap tx failed: ${await swapRes.text()}`);
  const swapData = await swapRes.json();
  if (swapData.error) throw new Error(`Jupiter: ${swapData.error}`);

  const transaction = VersionedTransaction.deserialize(
    Buffer.from(swapData.swapTransaction, "base64"),
  );
  transaction.sign([wallet]);

  const signature = await connection.sendTransaction(transaction, {
    skipPreflight: false,
    maxRetries: 3,
  });
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");
  const confirmation = await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    "confirmed",
  );
  if (confirmation.value.err) {
    throw new Error(
      `On-chain error: ${JSON.stringify(confirmation.value.err)}`,
    );
  }

  const outDecimals = toToken.toUpperCase() === "SOL" ? 9 : 6;
  return {
    success: true,
    signature,
    explorerUrl: getExplorerTxUrl(signature, network),
    output: {
      fromToken,
      toToken,
      amountIn: amount,
      amountOut: (
        parseInt(quote.outAmount) / Math.pow(10, outDecimals)
      ).toFixed(6),
      dex: "Jupiter",
      network,
    },
  };
}

// ── RAYDIUM SWAP (mainnet + devnet) ───────────────────────────────────────────
async function executeRaydiumSwap(
  connection: Connection,
  wallet: Keypair,
  network: SolanaNetwork,
  fromToken: string,
  toToken: string,
  amount: string | number,
  slippage: string | number,
): Promise<SwapResult> {
  const inputMint = getTokenAddress(fromToken.toUpperCase(), network);
  const outputMint = getTokenAddress(toToken.toUpperCase(), network);
  const amountLamports = parseAmount(amount, fromToken);
  const slippageBps = Math.floor(parseFloat(String(slippage || "1")) * 100);
  const apiBase = RAYDIUM_API[network];

  console.log(`🔄 Raydium [${network}]: ${amount} ${fromToken} → ${toToken}`);

  // Step 1: find best pool via Raydium API
  let poolId: string;
  try {
    const poolRes = await fetch(
      `${apiBase}/pools/info/mint?mint1=${inputMint}&mint2=${outputMint}&poolType=all&poolSortField=liquidity&sortType=desc&pageSize=1&page=1`,
    );
    const poolData = await poolRes.json();
    const pools = poolData?.data?.data;

    if (!pools || pools.length === 0) {
      // On devnet, fall back to known SOL/USDC pool
      if (network === "devnet") {
        poolId = RAYDIUM_DEVNET_SOL_USDC_POOL;
        console.log(
          `⚠️  No pool found via API, using known devnet SOL/USDC pool`,
        );
      } else {
        throw new Error(`No Raydium pool found for ${fromToken}/${toToken}`);
      }
    } else {
      poolId = pools[0].id;
      console.log(`✅ Found pool: ${poolId} (liquidity: ${pools[0].tvl})`);
    }
  } catch (e) {
    if (network === "devnet") {
      poolId = RAYDIUM_DEVNET_SOL_USDC_POOL;
      console.log(`⚠️  API error, using fallback devnet pool`);
    } else {
      throw e;
    }
  }

  // Step 2: get swap quote from Raydium API
  const quoteRes = await fetch(
    `${apiBase}/compute/swap-base-in?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amountLamports}&slippageBps=${slippageBps}&txVersion=V0`,
  );
  if (!quoteRes.ok)
    throw new Error(`Raydium quote failed: ${await quoteRes.text()}`);
  const quoteData = await quoteRes.json();
  if (!quoteData.success)
    throw new Error(`Raydium: ${quoteData.msg || "Quote failed"}`);

  console.log(`💱 Quote: ${quoteData.data?.outputAmount} ${toToken} out`);

  // Step 3: build swap transaction via Raydium API
  const swapRes = await fetch(`${apiBase}/transaction/swap-base-in`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      computeUnitPriceMicroLamports: "100000",
      swapResponse: quoteData,
      txVersion: "V0",
      wallet: wallet.publicKey.toString(),
      wrapSol: true,
      unwrapSol: true,
    }),
  });
  if (!swapRes.ok)
    throw new Error(`Raydium tx build failed: ${await swapRes.text()}`);
  const swapData = await swapRes.json();
  if (!swapData.success)
    throw new Error(`Raydium: ${swapData.msg || "Tx build failed"}`);

  // Step 4: sign and send
  const transactions: string[] = Array.isArray(swapData.data)
    ? swapData.data.map((d: any) => d.transaction)
    : [swapData.data.transaction];

  let lastSig = "";
  for (const txBase64 of transactions) {
    const txBuf = Buffer.from(txBase64, "base64");
    const tx = VersionedTransaction.deserialize(txBuf);
    tx.sign([wallet]);

    const sig = await connection.sendTransaction(tx, {
      skipPreflight: false,
      maxRetries: 3,
    });
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash("confirmed");
    const conf = await connection.confirmTransaction(
      { signature: sig, blockhash, lastValidBlockHeight },
      "confirmed",
    );
    if (conf.value.err)
      throw new Error(`On-chain error: ${JSON.stringify(conf.value.err)}`);
    lastSig = sig;
    console.log(`✅ Raydium tx confirmed: ${sig}`);
  }

  const outDecimals = toToken.toUpperCase() === "SOL" ? 9 : 6;
  const outAmount = quoteData.data?.outputAmount
    ? (
        parseInt(quoteData.data.outputAmount) / Math.pow(10, outDecimals)
      ).toFixed(6)
    : "~";

  return {
    success: true,
    signature: lastSig,
    explorerUrl: getExplorerTxUrl(lastSig, network),
    output: {
      fromToken,
      toToken,
      amountIn: amount,
      amountOut: outAmount,
      dex: "Raydium",
      network,
      poolId,
    },
  };
}

// ── ORCA SWAP (mainnet + devnet via Whirlpools) ───────────────────────────────
// Uses Orca's hosted swap API — no SDK import needed, just HTTP calls
async function executeOrcaSwap(
  connection: Connection,
  wallet: Keypair,
  network: SolanaNetwork,
  fromToken: string,
  toToken: string,
  amount: string | number,
  slippage: string | number,
): Promise<SwapResult> {
  const inputMint = getTokenAddress(fromToken.toUpperCase(), network);
  const outputMint = getTokenAddress(toToken.toUpperCase(), network);
  const amountLamports = parseAmount(amount, fromToken);
  const slippagePct = parseFloat(String(slippage || "1")) / 100; // Orca uses 0.01 format

  // Orca Whirlpools API
  const orcaApiBase =
    network === "devnet"
      ? "https://api.orca.so/v2/solana/devnet"
      : "https://api.orca.so/v2/solana/mainnet";

  console.log(`🌀 Orca [${network}]: ${amount} ${fromToken} → ${toToken}`);

  // Step 1: Get quote from Orca
  const quoteRes = await fetch(
    `${orcaApiBase}/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amountLamports}&slippage=${slippagePct}`,
  );
  if (!quoteRes.ok) {
    const err = await quoteRes.text();
    throw new Error(`Orca quote failed: ${err}`);
  }
  const quote = await quoteRes.json();
  if (quote.error) throw new Error(`Orca: ${quote.error}`);

  console.log(`💱 Orca quote: ${quote.estimatedAmountOut} ${toToken} out`);

  // Step 2: Get swap transaction
  const swapRes = await fetch(`${orcaApiBase}/swap`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      quote,
      userPublicKey: wallet.publicKey.toString(),
      wrapUnwrapSOL: true,
    }),
  });
  if (!swapRes.ok)
    throw new Error(`Orca swap tx failed: ${await swapRes.text()}`);
  const swapData = await swapRes.json();
  if (swapData.error) throw new Error(`Orca: ${swapData.error}`);

  // Step 3: Sign and send
  const txBuf = Buffer.from(swapData.transaction, "base64");
  const tx = VersionedTransaction.deserialize(txBuf);
  tx.sign([wallet]);

  const signature = await connection.sendTransaction(tx, {
    skipPreflight: false,
    maxRetries: 3,
  });
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");
  const conf = await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    "confirmed",
  );
  if (conf.value.err)
    throw new Error(`On-chain error: ${JSON.stringify(conf.value.err)}`);

  const outDecimals = toToken.toUpperCase() === "SOL" ? 9 : 6;
  const outAmount = quote.estimatedAmountOut
    ? (parseInt(quote.estimatedAmountOut) / Math.pow(10, outDecimals)).toFixed(
        6,
      )
    : "~";

  return {
    success: true,
    signature,
    explorerUrl: getExplorerTxUrl(signature, network),
    output: {
      fromToken,
      toToken,
      amountIn: amount,
      amountOut: outAmount,
      dex: "Orca",
      network,
    },
  };
}

// ── Result type ────────────────────────────────────────────────────────────────
interface SwapResult {
  success: boolean;
  signature?: string;
  explorerUrl?: string;
  error?: string;
  output?: Record<string, unknown>;
}

// ── Main SwapExecutor class ────────────────────────────────────────────────────
export class SwapExecutor {
  private connection: Connection;
  private network: SolanaNetwork;

  constructor(
    private node: Node,
    private walletPrivateKey: string,
    network?: SolanaNetwork,
  ) {
    this.network = network ?? getNetwork();
    this.connection = new Connection(getPrimaryRpc(this.network), "confirmed");
  }

  async execute(): Promise<SwapResult> {
    let wallet: Keypair;
    try {
      wallet = decodePrivateKey(this.walletPrivateKey);
    } catch {
      return {
        success: false,
        error:
          "Invalid private key. Export your Solana private key as Base58 from Phantom: Settings → Security → Export Private Key.",
      };
    }

    const { fromToken, toToken, amount, slippage } = this.node.data as {
      fromToken?: string;
      toToken?: string;
      amount?: string | number;
      slippage?: string | number;
      dex?: string;
    };

    const from = (fromToken || "SOL").toUpperCase();
    const to = (toToken || "USDC").toUpperCase();
    const amt = amount || "0.01";
    const slip = slippage || "1";

    // Resolve DEX — "auto" picks best for current network
    let dex = String(this.node.data?.dex || "auto").toLowerCase();
    if (dex === "auto" || dex === "") {
      dex = this.network === "devnet" ? "raydium" : "jupiter";
    }

    console.log(
      `🔀 SwapExecutor: DEX=${dex} network=${this.network} ${amt} ${from}→${to}`,
    );

    try {
      switch (dex) {
        case "jupiter":
          return await executeJupiterSwap(
            this.connection,
            wallet,
            this.network,
            from,
            to,
            amt,
            slip,
          );
        case "raydium":
          return await executeRaydiumSwap(
            this.connection,
            wallet,
            this.network,
            from,
            to,
            amt,
            slip,
          );
        case "orca":
          return await executeOrcaSwap(
            this.connection,
            wallet,
            this.network,
            from,
            to,
            amt,
            slip,
          );
        default:
          return { success: false, error: `Unknown DEX: ${dex}` };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`❌ Swap failed [${dex}]:`, msg);
      return { success: false, error: msg };
    }
  }

  async getBalance(): Promise<number> {
    const wallet = decodePrivateKey(this.walletPrivateKey);
    const balance = await this.connection.getBalance(wallet.publicKey);
    return balance / LAMPORTS_PER_SOL;
  }

  async requestAirdrop(): Promise<string> {
    if (!isDevnet()) throw new Error("Airdrop only available on devnet");
    const wallet = decodePrivateKey(this.walletPrivateKey);
    const sig = await this.connection.requestAirdrop(
      wallet.publicKey,
      AIRDROP_AMOUNT_SOL * LAMPORTS_PER_SOL,
    );
    await this.connection.confirmTransaction(sig);
    return sig;
  }
}
