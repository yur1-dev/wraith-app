/**
 * lib/executors/swap-evm.ts
 *
 * Executes EVM swaps (Ethereum, Arbitrum, Base, Optimism, Polygon)
 * using 1inch Aggregation API v6 via the app's /api/evm-swap proxy.
 *
 * Called by runner.ts when node.data.chain !== "solana"
 */

import type { Node } from "@xyflow/react";
import { ethers } from "ethers";

const PROXY_BASE = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// RPC endpoints per chain
const CHAIN_RPC: Record<string, string> = {
  ethereum: "https://eth.llamarpc.com",
  arbitrum: "https://arb1.arbitrum.io/rpc",
  base: "https://mainnet.base.org",
  optimism: "https://mainnet.optimism.io",
  polygon: "https://polygon-rpc.com",
};

const CHAIN_IDS: Record<string, number> = {
  ethereum: 1,
  arbitrum: 42161,
  base: 8453,
  optimism: 10,
  polygon: 137,
};

const CHAIN_EXPLORERS: Record<string, string> = {
  ethereum: "https://etherscan.io/tx",
  arbitrum: "https://arbiscan.io/tx",
  base: "https://basescan.org/tx",
  optimism: "https://optimistic.etherscan.io/tx",
  polygon: "https://polygonscan.com/tx",
};

// Token addresses per chain
const TOKEN_ADDRESSES: Record<string, Record<string, string>> = {
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
  base: {
    ETH: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    WETH: "0x4200000000000000000000000000000000000006",
    cbETH: "0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22",
  },
  optimism: {
    ETH: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    USDC: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607",
    USDT: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
    WBTC: "0x68f180fcCe6836688e9084f035309E29Bf0A2095",
    OP: "0x4200000000000000000000000000000000000042",
  },
  polygon: {
    MATIC: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    USDC: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    USDT: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    WBTC: "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6",
    DAI: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
  },
};

const TOKEN_DECIMALS: Record<string, number> = {
  ETH: 18,
  WETH: 18,
  MATIC: 18,
  USDC: 6,
  USDT: 6,
  WBTC: 8,
  DAI: 18,
  ARB: 18,
  GMX: 18,
  OP: 18,
  cbETH: 18,
};

export class EvmSwapExecutor {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private chain: string;
  private chainId: number;

  constructor(
    private node: Node,
    privateKey: string,
  ) {
    this.chain = String(node.data.chain ?? "arbitrum").toLowerCase();
    const rpc = CHAIN_RPC[this.chain] ?? CHAIN_RPC.arbitrum;
    this.chainId = CHAIN_IDS[this.chain] ?? 42161;
    this.provider = new ethers.JsonRpcProvider(rpc);
    // Handle both 0x-prefixed and raw hex keys
    const pk = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
    this.wallet = new ethers.Wallet(pk, this.provider);
  }

  async execute(): Promise<Record<string, unknown>> {
    const { fromToken, toToken, amount, slippage } = this.node.data;
    const fromUpper = String(fromToken ?? "ETH").toUpperCase();
    const toUpper = String(toToken ?? "USDC").toUpperCase();
    const amtNum = parseFloat(String(amount ?? "0.01"));
    const slipBps = Math.round(parseFloat(String(slippage ?? "0.5")) * 100);

    const chainTokens = TOKEN_ADDRESSES[this.chain] ?? {};
    const srcAddr = chainTokens[fromUpper];
    const dstAddr = chainTokens[toUpper];

    if (!srcAddr || !dstAddr) {
      return {
        success: false,
        error: `Token ${!srcAddr ? fromUpper : toUpper} not supported on ${this.chain}`,
      };
    }

    const dec = TOKEN_DECIMALS[fromUpper] ?? 18;
    const rawAmount = ethers
      .parseUnits(amtNum.toFixed(dec > 8 ? 8 : dec), dec)
      .toString();

    console.log(
      `🔄 [EVM/${this.chain}] Swapping ${amtNum} ${fromUpper} → ${toUpper}`,
    );
    console.log(`👛 Wallet: ${this.wallet.address}`);

    try {
      // Step 1: Get swap tx data from our proxy (which calls 1inch)
      const swapRes = await fetch(`${PROXY_BASE}/api/evm-swap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chainId: this.chainId,
          src: srcAddr,
          dst: dstAddr,
          amount: rawAmount,
          from: this.wallet.address,
          slippage: slipBps / 100, // 1inch takes % not bps
          disableEstimate: false,
          allowPartialFill: false,
        }),
      });

      if (!swapRes.ok) {
        const err = await swapRes.text();
        throw new Error(`EVM swap API error: ${err}`);
      }

      const swapData = await swapRes.json();

      if (swapData.error) {
        throw new Error(swapData.error);
      }

      const tx = swapData.tx;

      // Step 2: Handle ERC-20 approval if needed (not ETH/MATIC)
      const isNative = srcAddr === "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
      if (!isNative && swapData.approvalAddress) {
        await this.ensureApproval(srcAddr, swapData.approvalAddress, rawAmount);
      }

      // Step 3: Send the swap transaction
      const txResponse = await this.wallet.sendTransaction({
        to: tx.to,
        data: tx.data,
        value: tx.value ? BigInt(tx.value) : 0n,
        gasLimit: tx.gas ? BigInt(Math.ceil(Number(tx.gas) * 1.2)) : undefined,
      });

      console.log(`[EVM swap] tx sent: ${txResponse.hash}`);
      const receipt = await txResponse.wait(1);

      const explorerUrl = `${CHAIN_EXPLORERS[this.chain] ?? "https://etherscan.io/tx"}/${txResponse.hash}`;
      console.log(`✅ [EVM/${this.chain}] Swap confirmed! ${explorerUrl}`);

      return {
        success: true,
        signature: txResponse.hash,
        explorerUrl,
        fromToken: fromUpper,
        toToken: toUpper,
        amountIn: amtNum,
        chain: this.chain,
        blockNumber: receipt?.blockNumber,
        dex: "1inch",
      };
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      console.error(`❌ [EVM/${this.chain}] Swap failed:`, msg);
      return { success: false, error: msg };
    }
  }

  private async ensureApproval(
    tokenAddr: string,
    spender: string,
    amount: string,
  ): Promise<void> {
    const ERC20_ABI = [
      "function allowance(address owner, address spender) view returns (uint256)",
      "function approve(address spender, uint256 amount) returns (bool)",
    ];
    const token = new ethers.Contract(tokenAddr, ERC20_ABI, this.wallet);
    const current: bigint = await token.allowance(this.wallet.address, spender);

    if (current < BigInt(amount)) {
      console.log(
        `[EVM swap] approving ${spender} to spend token ${tokenAddr}`,
      );
      const approveTx = await token.approve(spender, ethers.MaxUint256);
      await approveTx.wait(1);
      console.log(`[EVM swap] approval confirmed`);
    }
  }
}
