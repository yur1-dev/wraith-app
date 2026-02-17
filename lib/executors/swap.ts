import axios from "axios";
import { Node } from "@xyflow/react";
import { Connection, Keypair, VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";

export class SwapExecutor {
  private connection: Connection;

  constructor(
    private node: Node,
    private walletPrivateKey: string,
  ) {
    this.connection = new Connection("https://api.mainnet-beta.solana.com");
  }

  async execute(context: Record<string, any> = {}): Promise<any> {
    const { dex } = this.node.data;

    if (dex === "jupiter") {
      return await this.executeJupiterSwap();
    } else {
      throw new Error(`Unsupported DEX: ${dex}`);
    }
  }

  private async executeJupiterSwap(): Promise<any> {
    try {
      const { fromToken, toToken, amount, slippage } = this.node.data;

      // Get quote
      const quoteResponse = await axios.get(
        "https://quote-api.jup.ag/v6/quote",
        {
          params: {
            inputMint: this.getTokenAddress(fromToken as string),
            outputMint: this.getTokenAddress(toToken as string),
            amount: this.parseAmount(amount as string, fromToken as string),
            slippageBps: Math.floor(((slippage as number) || 1) * 100),
          },
        },
      );

      const quote = quoteResponse.data;

      // Get swap transaction
      const wallet = Keypair.fromSecretKey(bs58.decode(this.walletPrivateKey));

      const swapResponse = await axios.post(
        "https://quote-api.jup.ag/v6/swap",
        {
          quoteResponse: quote,
          userPublicKey: wallet.publicKey.toString(),
          wrapAndUnwrapSol: true,
        },
      );

      // Execute transaction
      const swapTransactionBuf = Buffer.from(
        swapResponse.data.swapTransaction,
        "base64",
      );
      const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

      transaction.sign([wallet]);

      const signature = await this.connection.sendTransaction(transaction);
      await this.connection.confirmTransaction(signature);

      return {
        success: true,
        signature,
        fromToken,
        toToken,
        amountIn: amount,
        amountOut: quote.outAmount,
        dex: "jupiter",
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private getTokenAddress(symbol: string): string {
    const tokenMap: Record<string, string> = {
      SOL: "So11111111111111111111111111111111111111112",
      USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    };
    return tokenMap[symbol.toUpperCase()] || symbol;
  }

  private parseAmount(amount: string, token: string): number {
    const decimals = token.toUpperCase() === "USDC" ? 6 : 9;
    return Math.floor(parseFloat(amount) * Math.pow(10, decimals));
  }
}

// import axios from 'axios';
// import type { Node } from '@xyflow/react';

// export class SwapExecutor {
//   constructor(
//     private node: Node,
//     private walletPrivateKey: string
//   ) {}

//   async execute(context: Record<string, any> = {}): Promise<any> {
//     const { dex } = this.node.data;

//     if (dex === 'jupiter') {
//       return await this.executeJupiterSwap();
//     } else {
//       throw new Error(`Unsupported DEX: ${dex}`);
//     }
//   }

//   private async executeJupiterSwap(): Promise<any> {
//     try {
//       const { fromToken, toToken, amount, slippage } = this.node.data;

//       console.log('🔄 Executing Jupiter Swap:', {
//         from: fromToken,
//         to: toToken,
//         amount,
//         slippage
//       });

//       // For now, return mock success (implement real swap later)
//       return {
//         success: true,
//         signature: 'MOCK_SIGNATURE_' + Date.now(),
//         fromToken,
//         toToken,
//         amountIn: amount,
//         amountOut: '0.5',
//         dex: 'jupiter',
//         message: 'Mock swap executed (real implementation coming soon)'
//       };

//       // REAL IMPLEMENTATION (uncomment when ready to test with real wallet):
//       /*
//       const quoteResponse = await axios.get('https://quote-api.jup.ag/v6/quote', {
//         params: {
//           inputMint: this.getTokenAddress(fromToken as string),
//           outputMint: this.getTokenAddress(toToken as string),
//           amount: this.parseAmount(amount as string, fromToken as string),
//           slippageBps: Math.floor((slippage as number || 1) * 100)
//         }
//       });

//       const quote = quoteResponse.data;

//       // TODO: Sign and send transaction with Solana wallet

//       return {
//         success: true,
//         signature: 'REAL_SIGNATURE',
//         fromToken,
//         toToken,
//         amountIn: amount,
//         amountOut: quote.outAmount,
//         dex: 'jupiter'
//       };
//       */

//     } catch (error: any) {
//       return {
//         success: false,
//         error: error.message
//       };
//     }
//   }

//   private getTokenAddress(symbol: string): string {
//     const tokenMap: Record<string, string> = {
//       'SOL': 'So11111111111111111111111111111111111111112',
//       'USDC': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
//       'USDT': 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
//     };
//     return tokenMap[symbol.toUpperCase()] || symbol;
//   }

//   private parseAmount(amount: string, token: string): number {
//     const decimals = token.toUpperCase() === 'USDC' ? 6 : 9;
//     return Math.floor(parseFloat(amount) * Math.pow(10, decimals));
//   }
// }
