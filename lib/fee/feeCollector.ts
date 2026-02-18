/**
 * Protocol fee collector
 * Collects a small fee from the user's wallet before executing a flow.
 *
 * SOL: 0.001 SOL  → ApV8E3XhaDMZhubjyWSAvJYrRNYFU6pYnqXpNhVxw11B
 * ETH: 0.00079 ETH → 0xc7c56559146982ea4e54224e750c854116d82081
 *
 * Fee collection happens CLIENT-SIDE (browser) because the server never
 * holds private keys. The client signs and sends the fee tx, then passes
 * the signature to the server which verifies it before running the flow.
 */

export const FEE_CONFIG = {
  SOL: {
    amount: 0.001,
    lamports: 1_000_000, // 0.001 SOL in lamports
    treasury: "ApV8E3XhaDMZhubjyWSAvJYrRNYFU6pYnqXpNhVxw11B",
    display: "0.001 SOL",
    usdApprox: "$0.15",
  },
  ETH: {
    amount: 0.00079,
    wei: "790000000000000", // 0.00079 ETH in wei
    treasury: "0xc7c56559146982ea4e54224e750c854116d82081",
    display: "0.00079 ETH",
    usdApprox: "$1.50",
  },
} as const;

export type FeeResult =
  | { success: true; signature: string; walletType: "phantom" | "metamask" }
  | { success: false; error: string; skipped?: boolean };

/**
 * Collect fee from a Phantom (Solana) wallet.
 * Called client-side only.
 */
export async function collectSolanaFee(): Promise<FeeResult> {
  try {
    const win = window as any;
    if (!win.solana?.isPhantom) {
      return { success: false, error: "Phantom wallet not found" };
    }

    // Dynamically import to avoid SSR issues
    const {
      Connection,
      PublicKey,
      Transaction,
      SystemProgram,
      LAMPORTS_PER_SOL,
    } = await import("@solana/web3.js");

    // Helius is the primary RPC — fast, reliable, free tier
    const freeRpcs = [
      process.env.NEXT_PUBLIC_SOLANA_RPC,
      "https://mainnet.helius-rpc.com/?api-key=889111ff-fea0-486d-a228-7f39cb15b3f8",
    ].filter(Boolean) as string[];

    let connection!: InstanceType<typeof Connection>;
    let blockhash = "";
    let lastSlot = 0;

    for (const rpc of freeRpcs) {
      try {
        connection = new Connection(rpc, "confirmed");
        const latest = await connection.getLatestBlockhash();
        blockhash = latest.blockhash;
        lastSlot = latest.lastValidBlockHeight;
        break;
      } catch {
        continue;
      }
    }

    if (!blockhash) {
      return {
        success: false,
        error:
          "All Solana RPCs failed. Please try again or add NEXT_PUBLIC_SOLANA_RPC to .env.local",
      };
    }

    const fromPubkey = new PublicKey(win.solana.publicKey.toString());
    const toPubkey = new PublicKey(FEE_CONFIG.SOL.treasury);

    const transaction = new Transaction({
      recentBlockhash: blockhash,
      feePayer: fromPubkey,
    }).add(
      SystemProgram.transfer({
        fromPubkey,
        toPubkey,
        lamports: FEE_CONFIG.SOL.lamports,
      }),
    );

    const signed = await win.solana.signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signed.serialize());
    await connection.confirmTransaction(signature, "confirmed");

    return { success: true, signature, walletType: "phantom" };
  } catch (err: any) {
    // User rejected
    if (err.code === 4001 || err.message?.includes("rejected")) {
      return { success: false, error: "Fee rejected by user" };
    }
    return { success: false, error: err.message || "Fee collection failed" };
  }
}

/**
 * Collect fee from a MetaMask (EVM) wallet.
 * Called client-side only.
 */
export async function collectEthFee(): Promise<FeeResult> {
  try {
    const win = window as any;
    if (!win.ethereum) {
      return { success: false, error: "MetaMask not found" };
    }

    const accounts: string[] = await win.ethereum.request({
      method: "eth_accounts",
    });

    if (!accounts.length) {
      return { success: false, error: "No MetaMask account connected" };
    }

    const txHash = await win.ethereum.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: accounts[0],
          to: FEE_CONFIG.ETH.treasury,
          value: "0x" + BigInt(FEE_CONFIG.ETH.wei).toString(16),
          gas: "0x5208", // 21000 — standard ETH transfer
        },
      ],
    });

    // Wait for confirmation
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

    if (!receipt) {
      return { success: false, error: "Fee transaction timed out" };
    }

    return { success: true, signature: txHash, walletType: "metamask" };
  } catch (err: any) {
    if (err.code === 4001) {
      return { success: false, error: "Fee rejected by user" };
    }
    return { success: false, error: err.message || "Fee collection failed" };
  }
}

/**
 * Main entry point — detects wallet type and collects the right fee.
 */
export async function collectProtocolFee(
  walletType: "phantom" | "metamask",
): Promise<FeeResult> {
  if (walletType === "phantom") {
    return collectSolanaFee();
  } else {
    return collectEthFee();
  }
}

/**
 * Get fee info for display in UI.
 */
export function getFeeDisplay(walletType: "phantom" | "metamask" | null) {
  if (walletType === "phantom") {
    return FEE_CONFIG.SOL;
  }
  if (walletType === "metamask") {
    return FEE_CONFIG.ETH;
  }
  return null;
}
