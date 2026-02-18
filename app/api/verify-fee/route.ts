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

async function verifySolanaFee(
  signature: string,
  walletAddress: string,
): Promise<{ verified: boolean; error?: string }> {
  try {
    const rpcUrl =
      process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";

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

    // Check it didn't fail
    if (tx.meta?.err) {
      return { verified: false, error: "Transaction failed on chain" };
    }

    // Check transfer went to our treasury
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

    const lamports = transfer.parsed?.info?.lamports ?? 0;
    const minLamports = FEE_CONFIG.SOL.lamports * 0.99; // 1% tolerance

    if (lamports < minLamports) {
      return {
        verified: false,
        error: `Fee too low: got ${lamports} lamports, expected ${FEE_CONFIG.SOL.lamports}`,
      };
    }

    return { verified: true };
  } catch (err: any) {
    // In dev/simulation mode — skip verification
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

    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getTransactionReceipt",
        params: [txHash],
      }),
    });

    const data = await response.json();
    const receipt = data.result;

    if (!receipt) {
      return { verified: false, error: "Transaction not found on chain" };
    }

    if (receipt.status !== "0x1") {
      return { verified: false, error: "Transaction failed on chain" };
    }

    // Verify recipient is our treasury
    const txResponse = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "eth_getTransactionByHash",
        params: [txHash],
      }),
    });

    const txData = await txResponse.json();
    const tx = txData.result;

    if (tx?.to?.toLowerCase() !== FEE_CONFIG.ETH.treasury.toLowerCase()) {
      return { verified: false, error: "Fee not sent to treasury" };
    }

    const valueWei = BigInt(tx.value);
    const minWei = (BigInt(FEE_CONFIG.ETH.wei) * BigInt(99)) / BigInt(100);

    if (valueWei < minWei) {
      return { verified: false, error: `Fee too low: got ${valueWei} wei` };
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
