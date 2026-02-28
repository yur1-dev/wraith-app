import { NextRequest, NextResponse } from "next/server";
import { FEE_CONFIG } from "@/lib/fee/feeCollector";

/**
 * Server-side fee verification.
 * Checks that the fee tx signature actually sent the right amount
 * to the right treasury address before the flow runs.
 */
export async function POST(request: NextRequest) {
  try {
    const { signature, walletType, walletAddress } = await request.json();

    if (!signature || !walletType) {
      return NextResponse.json(
        { verified: false, error: "Missing signature or walletType" },
        { status: 400 },
      );
    }

    if (walletType === "phantom") {
      const verified = await verifySolanaFee(signature, walletAddress);
      return NextResponse.json(verified);
    } else if (walletType === "metamask") {
      const verified = await verifyEthFee(signature, walletAddress);
      return NextResponse.json(verified);
    }

    return NextResponse.json(
      { verified: false, error: "Unknown wallet type" },
      { status: 400 },
    );
  } catch (err: any) {
    return NextResponse.json(
      { verified: false, error: err.message },
      { status: 500 },
    );
  }
}

// ── Price helpers (server-side) ───────────────────────────────────────────────

async function getLiveSolPrice(): Promise<number> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
      { signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) throw new Error();
    const d = await res.json();
    return d.solana.usd as number;
  } catch {
    return 150; // fallback
  }
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
    return 2500; // fallback
  }
}

function computeLamports(usd: number, solPrice: number): number {
  const raw = (usd / solPrice) * 1e9;
  return Math.round(raw / 1000) * 1000;
}

function computeWei(usd: number, ethPrice: number): bigint {
  const ethAmount = usd / ethPrice;
  return BigInt(Math.round(ethAmount * 1e18));
}

// ── Verifiers ─────────────────────────────────────────────────────────────────

async function verifySolanaFee(
  signature: string,
  walletAddress: string,
): Promise<{ verified: boolean; error?: string }> {
  try {
    const isDevnet =
      process.env.NEXT_PUBLIC_SOLANA_NETWORK === "devnet" ||
      process.env.SOLANA_NETWORK === "devnet";

    const rpcUrl = isDevnet
      ? "https://api.devnet.solana.com"
      : process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";

    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTransaction",
        params: [
          signature,
          { encoding: "jsonParsed", commitment: "confirmed" },
        ],
      }),
    });

    const data = await response.json();
    const tx = data.result;

    if (!tx) {
      return { verified: false, error: "Transaction not found on chain" };
    }

    if (tx.meta?.err) {
      return { verified: false, error: "Transaction failed on chain" };
    }

    const instructions = tx.transaction?.message?.instructions ?? [];
    const transfer = instructions.find(
      (ix: any) =>
        ix.parsed?.type === "transfer" &&
        ix.parsed?.info?.destination === FEE_CONFIG.SOL.treasury,
    );

    if (!transfer) {
      return {
        verified: false,
        error: "No transfer to treasury found in transaction",
      };
    }

    const lamports: number = transfer.parsed?.info?.lamports ?? 0;

    // Compute the expected lamports dynamically
    let expectedLamports: number;
    if (isDevnet) {
      expectedLamports = FEE_CONFIG.SOL.devnetLamports;
    } else {
      const solPrice = await getLiveSolPrice();
      expectedLamports = computeLamports(FEE_CONFIG.SOL.targetUsd, solPrice);
    }

    const minLamports = Math.floor(expectedLamports * 0.99); // 1% tolerance

    if (lamports < minLamports) {
      return {
        verified: false,
        error: `Fee too low: got ${lamports} lamports, expected ~${expectedLamports}`,
      };
    }

    return { verified: true };
  } catch (err: any) {
    if (
      process.env.NODE_ENV === "development" &&
      process.env.SKIP_FEE_VERIFY === "true"
    ) {
      return { verified: true };
    }
    return { verified: false, error: err.message };
  }
}

async function verifyEthFee(
  txHash: string,
  walletAddress: string,
): Promise<{ verified: boolean; error?: string }> {
  try {
    const rpcUrl = process.env.ETHEREUM_RPC_URL || "https://eth.llamarpc.com";

    const receiptRes = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getTransactionReceipt",
        params: [txHash],
      }),
    });

    const receiptData = await receiptRes.json();
    const receipt = receiptData.result;

    if (!receipt) {
      return { verified: false, error: "Transaction not found on chain" };
    }

    if (receipt.status !== "0x1") {
      return { verified: false, error: "Transaction failed on chain" };
    }

    const txRes = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "eth_getTransactionByHash",
        params: [txHash],
      }),
    });

    const txData = await txRes.json();
    const tx = txData.result;

    if (tx?.to?.toLowerCase() !== FEE_CONFIG.ETH.treasury.toLowerCase()) {
      return { verified: false, error: "Fee not sent to treasury" };
    }

    const valueWei = BigInt(tx.value);

    // Compute expected wei dynamically
    const ethPrice = await getLiveEthPrice();
    const expectedWei = computeWei(FEE_CONFIG.ETH.targetUsd, ethPrice);
    const minWei = (expectedWei * BigInt(99)) / BigInt(100); // 1% tolerance

    if (valueWei < minWei) {
      return {
        verified: false,
        error: `Fee too low: got ${valueWei} wei, expected ~${expectedWei}`,
      };
    }

    return { verified: true };
  } catch (err: any) {
    if (
      process.env.NODE_ENV === "development" &&
      process.env.SKIP_FEE_VERIFY === "true"
    ) {
      return { verified: true };
    }
    return { verified: false, error: err.message };
  }
}
