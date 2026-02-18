import { Node } from "@xyflow/react";
import {
  Connection,
  Keypair,
  VersionedTransaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import bs58 from "bs58";

const DEVNET_RPC = "https://api.devnet.solana.com";
const PROXY_BASE = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const TOKEN_ADDRESSES: Record<string, string> = {
  SOL: "So11111111111111111111111111111111111111112",
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
};

export class SwapExecutor {
  private connection: Connection;

  constructor(
    private node: Node,
    private walletPrivateKey: string,
    private devnet = true,
  ) {
    this.connection = new Connection(
      devnet ? DEVNET_RPC : "https://api.mainnet-beta.solana.com",
      "confirmed",
    );
  }

  async execute(context: Record<string, unknown> = {}): Promise<unknown> {
    const { dex } = this.node.data;
    if (dex === "jupiter") return await this.executeJupiterSwap();
    throw new Error(`Unsupported DEX: ${dex}`);
  }

  async getDevnetBalance(): Promise<number> {
    const wallet = Keypair.fromSecretKey(bs58.decode(this.walletPrivateKey));
    const balance = await this.connection.getBalance(wallet.publicKey);
    return balance / LAMPORTS_PER_SOL;
  }

  async requestDevnetAirdrop(): Promise<string> {
    const wallet = Keypair.fromSecretKey(bs58.decode(this.walletPrivateKey));
    const sig = await this.connection.requestAirdrop(
      wallet.publicKey,
      2 * LAMPORTS_PER_SOL,
    );
    await this.connection.confirmTransaction(sig);
    return sig;
  }

  private async executeJupiterSwap(): Promise<unknown> {
    try {
      const { fromToken, toToken, amount, slippage } = this.node.data;
      const wallet = Keypair.fromSecretKey(bs58.decode(this.walletPrivateKey));

      console.log(`🔄 Swapping ${amount} ${fromToken} → ${toToken}`);
      console.log(`👛 Wallet: ${wallet.publicKey.toString()}`);

      const quoteParams = new URLSearchParams({
        inputMint: this.getTokenAddress(fromToken as string),
        outputMint: this.getTokenAddress(toToken as string),
        amount: String(this.parseAmount(amount as string, fromToken as string)),
        slippageBps: String(Math.floor(((slippage as number) || 1) * 100)),
      });

      const quoteRes = await fetch(
        `${PROXY_BASE}/api/jupiter/quote?${quoteParams}`,
      );
      if (!quoteRes.ok)
        throw new Error(`Quote failed: ${await quoteRes.text()}`);
      const quote = await quoteRes.json();

      const swapRes = await fetch(`${PROXY_BASE}/api/jupiter/swap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteResponse: quote,
          userPublicKey: wallet.publicKey.toString(),
          wrapAndUnwrapSol: true,
        }),
      });
      if (!swapRes.ok) throw new Error(`Swap failed: ${await swapRes.text()}`);
      const swapData = await swapRes.json();

      const swapTransactionBuf = Buffer.from(
        swapData.swapTransaction,
        "base64",
      );
      const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
      transaction.sign([wallet]);

      const signature = await this.connection.sendTransaction(transaction);
      await this.connection.confirmTransaction(signature);

      const explorerUrl = this.devnet
        ? `https://explorer.solana.com/tx/${signature}?cluster=devnet`
        : `https://solscan.io/tx/${signature}`;

      console.log(`✅ Swap complete! Explorer: ${explorerUrl}`);

      return {
        success: true,
        signature,
        explorerUrl,
        fromToken,
        toToken,
        amountIn: amount,
        amountOut: quote.outAmount,
        dex: "jupiter",
        network: this.devnet ? "devnet" : "mainnet",
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("❌ Swap failed:", msg);
      return { success: false, error: msg };
    }
  }

  private getTokenAddress(symbol: string): string {
    return TOKEN_ADDRESSES[symbol.toUpperCase()] || symbol;
  }

  private parseAmount(amount: string, token: string): number {
    const decimals = token.toUpperCase() === "USDC" ? 6 : 9;
    return Math.floor(parseFloat(amount) * Math.pow(10, decimals));
  }
}
