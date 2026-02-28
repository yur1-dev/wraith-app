/**
 * lib/fee/feeCollector.ts
 *
 * Always collects exactly $0.79 USD worth of SOL/ETH.
 * Fetches live price at collection time → calculates exact lamports/wei.
 * Falls back to conservative price if fetch fails.
 *
 * DEVNET: sends 5000 lamports to treasury (verify flow end-to-end)
 * MAINNET: sends dynamic lamports = $0.79 / SOL_PRICE * 1e9
 *
 * FIX: Retry loop with fresh blockhash on each attempt — prevents
 * TransactionExpiredBlockheightExceededError on slow connections.
 */

import { getNetwork, isDevnet, getAllRpcs } from "@/lib/network/solana.config";

export const FEE_CONFIG = {
  SOL: {
    targetUsd: 0.79,
    devnetLamports: 5_000,
    treasury: "ApV8E3XhaDMZhubjyWSAvJYrRNYFU6pYnqXpNhVxw11B",
    devnetDisplay: "0.000005 SOL (devnet test)",
    usdApprox: "$0.79",
  },
  ETH: {
    targetUsd: 0.79,
    treasury: "0xc7c56559146982ea4e54224e750c854116d82081",
    usdApprox: "$0.79",
  },
} as const;

// ── Live price fetching ───────────────────────────────────────────────────────

let _solPriceCache: { price: number; ts: number } | null = null;

async function getLiveSolPrice(): Promise<number> {
  const FALLBACK = 150;
  const CACHE_TTL = 60_000;

  if (_solPriceCache && Date.now() - _solPriceCache.ts < CACHE_TTL) {
    return _solPriceCache.price;
  }

  const sources = [
    async () => {
      const res = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
        { signal: AbortSignal.timeout(5000) },
      );
      if (!res.ok) throw new Error("cg failed");
      const d = await res.json();
      return d.solana.usd as number;
    },
    async () => {
      const res = await fetch("https://price.jup.ag/v6/price?ids=SOL", {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error("jup failed");
      const d = await res.json();
      return d.data.SOL.price as number;
    },
    async () => {
      const res = await fetch(
        "https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT",
        { signal: AbortSignal.timeout(5000) },
      );
      if (!res.ok) throw new Error("binance failed");
      const d = await res.json();
      return parseFloat(d.price);
    },
  ];

  for (const source of sources) {
    try {
      const price = await source();
      if (price > 0) {
        _solPriceCache = { price, ts: Date.now() };
        console.log(`[feeCollector] SOL price: $${price.toFixed(2)}`);
        return price;
      }
    } catch {
      continue;
    }
  }

  console.warn(
    `[feeCollector] Price fetch failed, using fallback $${FALLBACK}`,
  );
  return FALLBACK;
}

async function getLiveEthPrice(): Promise<number> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
      { signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) throw new Error();
    const d = await res.json();
    return d.ethereum.usd as number;
  } catch {
    return 2500;
  }
}

function lamportsFor(usd: number, solPrice: number): number {
  const raw = (usd / solPrice) * 1e9;
  return Math.round(raw / 1000) * 1000;
}

function solDisplay(lamports: number): string {
  const sol = lamports / 1e9;
  return sol < 0.001 ? `${sol.toFixed(6)} SOL` : `${sol.toFixed(4)} SOL`;
}

// ── Public: get display info for FeeConfirmStep ───────────────────────────────

export async function getSolFeeDisplay(): Promise<{
  display: string;
  usdApprox: string;
  lamports: number;
  solPrice: number;
}> {
  if (isDevnet()) {
    return {
      display: FEE_CONFIG.SOL.devnetDisplay,
      usdApprox: "~$0 (devnet test)",
      lamports: FEE_CONFIG.SOL.devnetLamports,
      solPrice: 0,
    };
  }
  const solPrice = await getLiveSolPrice();
  const lamports = lamportsFor(FEE_CONFIG.SOL.targetUsd, solPrice);
  return {
    display: solDisplay(lamports),
    usdApprox: `$0.79 (@ $${solPrice.toFixed(2)}/SOL)`,
    lamports,
    solPrice,
  };
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type FeeResult =
  | { success: true; signature: string; walletType: "phantom" | "metamask" }
  | { success: false; error: string };

// ── Solana fee ────────────────────────────────────────────────────────────────

export async function collectSolanaFee(): Promise<FeeResult> {
  try {
    const win = window as any;
    const phantom = win.phantom?.solana ?? win.solana ?? null;

    if (!phantom?.isPhantom) {
      return {
        success: false,
        error: "Phantom not found. Please install or unlock Phantom.",
      };
    }

    const pubkeyStr: string | null = phantom.publicKey?.toString() ?? null;
    if (!pubkeyStr) {
      return {
        success: false,
        error: "Phantom is not connected. Please connect your wallet first.",
      };
    }

    const {
      Connection,
      PublicKey,
      SystemProgram,
      TransactionMessage,
      VersionedTransaction,
    } = await import("@solana/web3.js");

    const network = getNetwork();
    const rpcs = getAllRpcs(network);
    const devnet = isDevnet();

    const lamports = devnet
      ? FEE_CONFIG.SOL.devnetLamports
      : lamportsFor(FEE_CONFIG.SOL.targetUsd, await getLiveSolPrice());

    // Find a working RPC connection
    let connection!: InstanceType<typeof Connection>;
    for (const rpc of rpcs) {
      try {
        const c = new Connection(rpc, "confirmed");
        await c.getLatestBlockhash("confirmed"); // test it works
        connection = c;
        break;
      } catch {
        continue;
      }
    }

    if (!connection) {
      return {
        success: false,
        error: "Cannot reach Solana RPC. Check internet connection.",
      };
    }

    const fromPubkey = new PublicKey(pubkeyStr);
    const toPubkey = new PublicKey(FEE_CONFIG.SOL.treasury);

    console.log(
      `[feeCollector] ${devnet ? "DEVNET" : "MAINNET"} collecting ${lamports} lamports`,
      `(${devnet ? "~$0 test" : "$0.79"})`,
      "\n  from:",
      pubkeyStr,
      "\n  to:  ",
      FEE_CONFIG.SOL.treasury,
    );

    // ── Retry loop: fresh blockhash on each attempt ───────────────────────────
    const MAX_ATTEMPTS = 3;
    let lastError: string = "Fee collection failed";

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        console.log(`[feeCollector] attempt ${attempt}/${MAX_ATTEMPTS}`);

        // Always fetch a fresh blockhash — never reuse stale ones
        const { blockhash, lastValidBlockHeight } =
          await connection.getLatestBlockhash("confirmed");

        const message = new TransactionMessage({
          payerKey: fromPubkey,
          recentBlockhash: blockhash,
          instructions: [
            SystemProgram.transfer({ fromPubkey, toPubkey, lamports }),
          ],
        }).compileToV0Message();

        const tx = new VersionedTransaction(message);

        // Sign via Phantom (just signs bytes, doesn't submit)
        const signedTx = await phantom.signTransaction(tx);

        // Submit via our own RPC so Phantom's network setting is irrelevant
        const signature = await connection.sendRawTransaction(
          signedTx.serialize(),
          {
            skipPreflight: devnet,
            preflightCommitment: "confirmed",
            maxRetries: 3,
          },
        );

        console.log(`[feeCollector] submitted sig:`, signature);

        // Confirm with the blockhash we used — proper expiry tracking
        const confirmation = await connection.confirmTransaction(
          { signature, blockhash, lastValidBlockHeight },
          "confirmed",
        );

        if (confirmation.value.err) {
          throw new Error(
            `On-chain error: ${JSON.stringify(confirmation.value.err)}`,
          );
        }

        const explorerUrl = devnet
          ? `https://explorer.solana.com/tx/${signature}?cluster=devnet`
          : `https://solscan.io/tx/${signature}`;

        console.log(
          `✅ Fee confirmed [${network}] attempt ${attempt}:`,
          explorerUrl,
        );
        return { success: true, signature, walletType: "phantom" };
      } catch (attemptErr: any) {
        const msg: string = attemptErr?.message ?? String(attemptErr);

        // Don't retry user rejections
        const isRejection =
          attemptErr?.code === 4001 ||
          msg.includes("User rejected") ||
          msg.includes("rejected") ||
          msg.includes("denied");

        if (isRejection) {
          console.log("[feeCollector] user cancelled — ok");
          return { success: false, error: "You cancelled the transaction." };
        }

        lastError = msg;

        // Blockhash expired → retry immediately with a fresh one
        const isExpired =
          msg.includes("block height exceeded") ||
          msg.includes("BlockheightExceeded") ||
          msg.includes("expired");

        if (isExpired && attempt < MAX_ATTEMPTS) {
          console.warn(
            `[feeCollector] blockhash expired on attempt ${attempt}, retrying with fresh blockhash...`,
          );
          // Small delay before retry
          await new Promise((r) => setTimeout(r, 500));
          continue;
        }

        // Non-retriable error or last attempt
        if (attempt === MAX_ATTEMPTS) {
          console.error(`[feeCollector] all ${MAX_ATTEMPTS} attempts failed`);
        }

        // Known error messages → friendly output
        if (
          msg.includes("cluster") ||
          msg.includes("network") ||
          msg.includes("blockhash not found")
        ) {
          return {
            success: false,
            error: `Network mismatch — in Phantom: Settings → Developer Settings → select "Solana Devnet" and turn OFF Testnet Mode.`,
          };
        }
        if (
          msg.includes("context invalidated") ||
          msg.includes("Extension context")
        ) {
          return {
            success: false,
            error:
              "Phantom was reloaded. Hard-refresh (Ctrl+Shift+R) and reconnect.",
          };
        }
        if (
          msg.includes("insufficient funds") ||
          msg.includes("insufficient lamports")
        ) {
          return {
            success: false,
            error: "Not enough SOL to pay the fee. Please top up your wallet.",
          };
        }

        // If not expired, don't retry
        if (!isExpired) break;
      }
    }

    return {
      success: false,
      error: lastError || "Fee collection failed after retries",
    };
  } catch (err: any) {
    const msg: string = err?.message ?? String(err);

    const isRejection =
      err?.code === 4001 ||
      msg.includes("User rejected") ||
      msg.includes("rejected") ||
      msg.includes("denied");

    if (isRejection) {
      console.log("[feeCollector] user cancelled — ok");
      return { success: false, error: "You cancelled the transaction." };
    }

    console.error("[feeCollector] outer error:", err);
    return { success: false, error: msg || "Fee collection failed" };
  }
}

// ── ETH fee ───────────────────────────────────────────────────────────────────

export async function collectEthFee(): Promise<FeeResult> {
  try {
    const win = window as any;
    if (!win.ethereum) return { success: false, error: "MetaMask not found" };

    const ethPrice = await getLiveEthPrice();
    const ethAmount = FEE_CONFIG.ETH.targetUsd / ethPrice;
    const wei = BigInt(Math.round(ethAmount * 1e18));

    console.log(
      `[feeCollector] ETH fee: ${ethAmount.toFixed(8)} ETH = $0.79 @ $${ethPrice}`,
    );

    const accounts: string[] = await win.ethereum.request({
      method: "eth_accounts",
    });
    if (!accounts.length)
      return { success: false, error: "No MetaMask account connected" };

    const txHash = await win.ethereum.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: accounts[0],
          to: FEE_CONFIG.ETH.treasury,
          value: "0x" + wei.toString(16),
          gas: "0x5208",
        },
      ],
    });

    let receipt = null;
    let attempts = 0;
    while (!receipt && attempts < 30) {
      await new Promise((r) => setTimeout(r, 2000));
      receipt = await win.ethereum.request({
        method: "eth_getTransactionReceipt",
        params: [txHash],
      });
      attempts++;
    }

    if (!receipt) return { success: false, error: "Fee transaction timed out" };
    return { success: true, signature: txHash, walletType: "metamask" };
  } catch (err: any) {
    if (err.code === 4001)
      return { success: false, error: "Fee rejected by user" };
    return { success: false, error: err.message || "Fee collection failed" };
  }
}

// ── Exports ───────────────────────────────────────────────────────────────────

export async function collectProtocolFee(
  walletType: "phantom" | "metamask",
): Promise<FeeResult> {
  if (walletType === "phantom") return collectSolanaFee();
  return collectEthFee();
}

export function getFeeDisplay(walletType: "phantom" | "metamask" | null) {
  if (!walletType) return null;
  if (walletType === "phantom") {
    return {
      display: isDevnet() ? FEE_CONFIG.SOL.devnetDisplay : "Loading price...",
      usdApprox: isDevnet() ? "~$0 (devnet test)" : "$0.79",
      treasury: FEE_CONFIG.SOL.treasury,
    };
  }
  return {
    display: "Loading price...",
    usdApprox: "$0.79",
    treasury: FEE_CONFIG.ETH.treasury,
  };
}
