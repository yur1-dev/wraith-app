/**
 * DEVNET TEST SCRIPT
 * Run with: npx tsx scripts/test-devnet.ts
 */

// ✅ Points to your live Vercel deployment
process.env.NEXT_PUBLIC_APP_URL = "https://wraith-app.vercel.app";

import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { SwapExecutor } from "../lib/executors/swap.js";

async function main() {
  const privateKey =
    "e8vhxyA1sm61vn1UQwtZCRcyuvAZw4KzwRVYHMALhcAdTxkN4L1Uoth7Q8RSCexL2SrTj6xHoMvvi5M9ro4oy3i";
  const wallet = Keypair.fromSecretKey(bs58.decode(privateKey));
  console.log("👛 Wallet:", wallet.publicKey.toString());

  const mockSwapNode = {
    id: "test-swap-1",
    type: "swap",
    position: { x: 0, y: 0 },
    data: {
      fromToken: "SOL",
      toToken: "USDC",
      amount: "0.01",
      slippage: 1,
      dex: "jupiter",
    },
  };

  const executor = new SwapExecutor(mockSwapNode as any, privateKey, true);

  const balance = await executor.getDevnetBalance();
  console.log(`💰 Balance: ${balance} SOL`);

  if (balance < 0.05) {
    console.error("❌ Not enough SOL.");
    process.exit(1);
  }

  console.log("\n🔄 Executing swap: 0.01 SOL → USDC via Vercel proxy...");
  const result = await executor.execute();
  console.log("\n📦 Result:", JSON.stringify(result, null, 2));

  if ((result as any).explorerUrl) {
    console.log("\n🔍 View on explorer:", (result as any).explorerUrl);
  }
}

main().catch(console.error);
