// app/api/telegram/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { telegramStore } from "@/lib/telegram-store";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://wraith-app.vercel.app";
const API = `https://api.telegram.org/bot${TOKEN}`;

// ─── Raw Telegram API ─────────────────────────────────────────────────────────

async function tg(method: string, body: Record<string, unknown>) {
  const res = await fetch(`${API}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

const send = (
  chatId: string,
  text: string,
  extra: Record<string, unknown> = {},
) =>
  tg("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...extra,
  });

const edit = (
  chatId: string,
  msgId: number,
  text: string,
  extra: Record<string, unknown> = {},
) =>
  tg("editMessageText", {
    chat_id: chatId,
    message_id: msgId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...extra,
  });

const ack = (id: string, text = "") =>
  tg("answerCallbackQuery", { callback_query_id: id, text });

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shortWallet(w: string) {
  if (!w) return "—";
  return w.length > 16 ? `${w.slice(0, 6)}...${w.slice(-4)}` : w;
}

function timestamp() {
  return (
    new Date().toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
      hour12: false,
    }) + " UTC"
  );
}

// ─── Keyboards ────────────────────────────────────────────────────────────────

const kb = {
  home: () => ({
    inline_keyboard: [
      [
        { text: "Status", callback_data: "status" },
        { text: "Wallet", callback_data: "wallet_info" },
      ],
      [
        { text: "Alert Config", callback_data: "alerts" },
        { text: "Flow Nodes", callback_data: "flows_info" },
      ],
      [
        { text: "Help", callback_data: "help" },
        { text: "About", callback_data: "about" },
      ],
      [{ text: "Open Wraith  →", url: APP_URL }],
      [{ text: "Disconnect", callback_data: "disconnect_ask" }],
    ],
  }),

  homeNew: () => ({
    inline_keyboard: [
      [{ text: "Connect Wallet  →", url: APP_URL }],
      [
        { text: "How to connect", callback_data: "how_to" },
        { text: "About", callback_data: "about" },
      ],
      [{ text: "Help", callback_data: "help" }],
    ],
  }),

  backHome: () => ({
    inline_keyboard: [[{ text: "← Back", callback_data: "main_menu" }]],
  }),

  disconnectConfirm: () => ({
    inline_keyboard: [
      [
        { text: "Disconnect", callback_data: "disconnect_yes" },
        { text: "Cancel", callback_data: "main_menu" },
      ],
    ],
  }),

  reconnect: () => ({
    inline_keyboard: [
      [{ text: "Reconnect  →", url: APP_URL }],
      [{ text: "How to connect", callback_data: "how_to" }],
    ],
  }),
};

// ─── Message Templates ────────────────────────────────────────────────────────

function msgHome(name: string, wallet: string) {
  return (
    `<b>WRAITH</b>  ·  DeFi Automation\n` +
    `─────────────────────\n\n` +
    `Hello, <b>${name}</b>\n\n` +
    `<code>STATUS   </code>  Connected\n` +
    `<code>WALLET   </code>  <code>${shortWallet(wallet)}</code>\n` +
    `<code>ALERTS   </code>  Active\n` +
    `<code>NETWORK  </code>  Auto-detect\n\n` +
    `─────────────────────\n` +
    `Flow executions will be delivered here\n` +
    `in real-time. Swaps, bridges, errors.\n\n` +
    `<i>Select an option below.</i>`
  );
}

function msgHomeNew(name: string) {
  return (
    `<b>WRAITH</b>  ·  DeFi Automation\n` +
    `─────────────────────\n\n` +
    `Hello, <b>${name}</b>\n\n` +
    `<code>STATUS   </code>  Not connected\n` +
    `<code>ALERTS   </code>  Inactive\n\n` +
    `─────────────────────\n\n` +
    `Connect your wallet to receive real-time\n` +
    `flow execution alerts in this chat.\n\n` +
    `Alerts include:\n` +
    `  · Swap results + tx hash\n` +
    `  · Bridge transactions\n` +
    `  · Flow completions\n` +
    `  · Errors and warnings\n` +
    `  · Trigger activations\n\n` +
    `<i>Tap Connect Wallet to get started.</i>`
  );
}

function msgStatus(wallet: string, chatId: string) {
  return (
    `<b>Connection Status</b>\n` +
    `─────────────────────\n\n` +
    `<code>STATUS   </code>  Active\n` +
    `<code>ALERTS   </code>  Enabled\n\n` +
    `<b>Wallet</b>\n` +
    `<code>${wallet}</code>\n\n` +
    `<b>Chat ID</b>\n` +
    `<code>${chatId}</code>\n\n` +
    `─────────────────────\n` +
    `<i>Checked: ${timestamp()}</i>\n\n` +
    `All flows linked to this wallet will\n` +
    `send alerts to this chat.`
  );
}

function msgStatusNew() {
  return (
    `<b>Connection Status</b>\n` +
    `─────────────────────\n\n` +
    `<code>STATUS   </code>  Disconnected\n` +
    `<code>ALERTS   </code>  Paused\n\n` +
    `─────────────────────\n\n` +
    `No wallet is linked to this chat.\n\n` +
    `To connect: open Wraith, add an Alert\n` +
    `node, set channel to Telegram, then\n` +
    `click <b>Open bot</b>.`
  );
}

function msgWalletInfo(wallet: string) {
  const isSOL =
    wallet.length >= 32 && wallet.length <= 44 && !wallet.startsWith("0x");
  const chain = isSOL ? "Solana" : "EVM";
  const explorer = isSOL
    ? `https://explorer.solana.com/address/${wallet}`
    : `https://etherscan.io/address/${wallet}`;

  return (
    `<b>Wallet Info</b>\n` +
    `─────────────────────\n\n` +
    `<b>Address</b>\n` +
    `<code>${wallet}</code>\n\n` +
    `<code>NETWORK  </code>  ${chain}\n` +
    `<code>SHORT    </code>  <code>${shortWallet(wallet)}</code>\n\n` +
    `─────────────────────\n` +
    `<a href="${explorer}">View on Explorer  →</a>\n\n` +
    `<i>This wallet is used for all flow\n` +
    `execution and alert delivery.</i>`
  );
}

function msgFlowsInfo() {
  return (
    `<b>Flow Nodes</b>\n` +
    `─────────────────────\n\n` +
    `Flows are visual automation pipelines\n` +
    `built in the Wraith canvas.\n\n` +
    `<b>TRIGGER</b>\n` +
    `Starts the flow. Manual, scheduled,\n` +
    `or on a price/balance condition.\n\n` +
    `<b>MULTI-WALLET</b>\n` +
    `Execute across multiple wallets\n` +
    `simultaneously.\n\n` +
    `<b>SWAP</b>\n` +
    `Token swaps via Jupiter, Orca,\n` +
    `or Raydium.\n\n` +
    `<b>BRIDGE</b>\n` +
    `Move assets across chains.\n\n` +
    `<b>CONDITION</b>\n` +
    `Branch the flow based on price\n` +
    `or balance thresholds.\n\n` +
    `<b>ALERT</b>\n` +
    `Send notifications — that's this bot.\n\n` +
    `─────────────────────\n` +
    `<a href="${APP_URL}">Build a flow  →</a>`
  );
}

function msgAlerts() {
  return (
    `<b>Alert Configuration</b>\n` +
    `─────────────────────\n\n` +
    `<code>DELIVERY </code>  This chat\n` +
    `<code>STATUS   </code>  Active\n` +
    `<code>TRIGGER  </code>  On execution\n` +
    `<code>LATENCY  </code>  &lt;1 second\n\n` +
    `─────────────────────\n\n` +
    `<b>FLOW COMPLETED</b>\n` +
    `Per-node results, total runtime,\n` +
    `success/fail breakdown.\n\n` +
    `<b>FLOW FAILED</b>\n` +
    `Which node failed, error message,\n` +
    `and context.\n\n` +
    `<b>SWAP EXECUTED</b>\n` +
    `Token pair, amounts in/out, DEX\n` +
    `used, tx hash with explorer link.\n\n` +
    `<b>BRIDGE INITIATED</b>\n` +
    `Source/destination chain, amount,\n` +
    `bridge status.\n\n` +
    `<b>NODE WARNING</b>\n` +
    `Skipped nodes, partial failures,\n` +
    `condition mismatches.\n\n` +
    `─────────────────────\n` +
    `<i>Format: HTML  ·  Inline links</i>`
  );
}

function msgHelp() {
  return (
    `<b>Help</b>\n` +
    `─────────────────────\n\n` +
    `<b>Commands</b>\n\n` +
    `<code>/start</code>        Main menu\n` +
    `<code>/status</code>       Connection status\n` +
    `<code>/alerts</code>       Alert config\n` +
    `<code>/disconnect</code>   Unlink wallet\n` +
    `<code>/help</code>         This screen\n\n` +
    `─────────────────────\n\n` +
    `<b>Setup</b>\n\n` +
    `1  Open the Wraith app\n` +
    `2  Connect your wallet\n` +
    `3  Add an Alert node to your flow\n` +
    `4  Set channel → Telegram\n` +
    `5  Click Open bot, send /start\n\n` +
    `─────────────────────\n\n` +
    `<b>Issues</b>\n\n` +
    `Not receiving alerts?\n` +
    `  Check <code>/status</code> shows Connected\n` +
    `  Re-run the flow from the app\n\n` +
    `Wrong wallet linked?\n` +
    `  Use /disconnect then reconnect\n\n` +
    `Bot not responding?\n` +
    `  Send /start to reset\n\n` +
    `─────────────────────\n` +
    `<a href="${APP_URL}">Open Wraith  →</a>`
  );
}

function msgAbout() {
  return (
    `<b>About Wraith</b>\n` +
    `─────────────────────\n\n` +
    `Wraith is a no-code DeFi automation\n` +
    `platform. Build visual flow pipelines\n` +
    `to automate on-chain strategies.\n\n` +
    `─────────────────────\n\n` +
    `<b>Automate</b>\n\n` +
    `  · Token swaps across DEXes\n` +
    `  · Cross-chain bridges\n` +
    `  · Multi-wallet execution\n` +
    `  · Scheduled / triggered flows\n` +
    `  · Conditional logic\n` +
    `  · Real-time Telegram alerts\n\n` +
    `─────────────────────\n\n` +
    `<code>NETWORKS </code>  Solana · EVM\n` +
    `<code>DEXES    </code>  Jupiter · Orca · Raydium\n` +
    `<code>STATUS   </code>  Beta\n\n` +
    `<a href="${APP_URL}">wraith-app.vercel.app  →</a>`
  );
}

function msgHowTo() {
  return (
    `<b>How to Connect</b>\n` +
    `─────────────────────\n\n` +
    `<b>1  Open the Wraith app</b>\n` +
    `<a href="${APP_URL}">wraith-app.vercel.app</a>\n\n` +
    `<b>2  Connect your wallet</b>\n` +
    `Click the wallet button in the top bar.\n` +
    `Supports Phantom, Solflare, MetaMask.\n\n` +
    `<b>3  Add an Alert node</b>\n` +
    `Canvas → Core tab → drag Alert node.\n` +
    `Set the channel to <b>Telegram</b>.\n\n` +
    `<b>4  Link this bot</b>\n` +
    `Click <b>Open bot</b> in the node panel.\n` +
    `You'll be redirected here.\n` +
    `Send /start — you're done.\n\n` +
    `─────────────────────\n\n` +
    `<i>Your wallet is automatically linked\n` +
    `to this chat. All future flow runs\n` +
    `will send alerts here.</i>`
  );
}

function msgDisconnectAsk(wallet: string) {
  return (
    `<b>Disconnect Wallet</b>\n` +
    `─────────────────────\n\n` +
    `You are about to unlink:\n\n` +
    `<code>${wallet}</code>\n\n` +
    `─────────────────────\n\n` +
    `  · This chat stops receiving alerts\n` +
    `  · Your flows keep running in the app\n` +
    `  · You can reconnect at any time\n\n` +
    `<b>Confirm disconnect?</b>`
  );
}

function msgDisconnected() {
  return (
    `<b>Wallet Disconnected</b>\n` +
    `─────────────────────\n\n` +
    `<code>STATUS   </code>  Inactive\n` +
    `<code>ALERTS   </code>  Paused\n\n` +
    `─────────────────────\n\n` +
    `Your wallet has been unlinked.\n` +
    `Flow alerts are paused until\n` +
    `you reconnect.\n\n` +
    `<i>Your flows are still active in the app.</i>`
  );
}

// ─── Execution Alert ──────────────────────────────────────────────────────────

export interface NodeResult {
  label?: string;
  type?: string;
  status: "success" | "error" | "skipped";
  durationMs?: number;
  output?: {
    txHash?: string;
    fromToken?: string;
    toToken?: string;
    amountIn?: string | number;
    amountOut?: string | number;
    chain?: string;
    toChain?: string;
    dex?: string;
    error?: string;
    [key: string]: unknown;
  };
}

export function buildExecutionAlert(params: {
  walletAddress: string;
  results: NodeResult[];
  elapsedMs?: number;
  network?: string;
  flowName?: string;
}): { text: string; reply_markup: Record<string, unknown> } {
  const {
    walletAddress,
    results,
    elapsedMs,
    network = "mainnet",
    flowName,
  } = params;

  const total = results.length;
  const ok = results.filter((r) => r.status === "success").length;
  const failed = results.filter((r) => r.status === "error").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const allGood = failed === 0;
  const elapsed = elapsedMs ? `${(elapsedMs / 1000).toFixed(2)}s` : "—";
  const name = flowName ?? "Unnamed Flow";

  const lines: string[] = [];

  lines.push(allGood ? `<b>Flow Completed</b>` : `<b>Flow Failed</b>`);
  lines.push(`─────────────────────`);
  lines.push(``);

  lines.push(`<code>FLOW     </code>  ${name}`);
  lines.push(
    `<code>WALLET   </code>  <code>${shortWallet(walletAddress)}</code>`,
  );
  lines.push(`<code>NETWORK  </code>  ${network}`);
  lines.push(`<code>RUNTIME  </code>  ${elapsed}`);
  lines.push(
    `<code>NODES    </code>  ${ok}/${total} passed${skipped > 0 ? `  ·  ${skipped} skipped` : ""}`,
  );
  lines.push(``);
  lines.push(`─────────────────────`);
  lines.push(``);
  lines.push(`<b>Breakdown</b>`);
  lines.push(``);

  for (const node of results) {
    const icon =
      node.status === "success" ? "+" : node.status === "error" ? "×" : "–";
    const label = node.label ?? node.type ?? "Node";
    const dur = node.durationMs ? `  <i>${node.durationMs}ms</i>` : "";

    lines.push(`<code>${icon}</code>  <b>${label}</b>${dur}`);

    if (node.status === "success" && node.output) {
      const o = node.output;

      if (o.fromToken && o.toToken) {
        const amtIn = o.amountIn ?? "?";
        const amtOut = o.amountOut ?? "?";
        const dex = o.dex ? `  via ${o.dex}` : "";
        lines.push(
          `   <code>${amtIn} ${o.fromToken} → ${amtOut} ${o.toToken}</code>${dex}`,
        );
      }

      if (o.chain || o.toChain) {
        lines.push(`   <code>${o.chain ?? "?"} → ${o.toChain ?? "?"}</code>`);
      }

      if (o.txHash) {
        const base =
          network === "devnet"
            ? `https://explorer.solana.com/tx/${o.txHash}?cluster=devnet`
            : `https://explorer.solana.com/tx/${o.txHash}`;
        const short = `${o.txHash.slice(0, 8)}...${o.txHash.slice(-6)}`;
        lines.push(`   <a href="${base}">${short}  →</a>`);
      }
    }

    if (node.status === "error" && node.output?.error) {
      lines.push(`   <i>${String(node.output.error).slice(0, 120)}</i>`);
    }

    if (node.status === "skipped") {
      lines.push(`   <i>Skipped — condition not met</i>`);
    }

    lines.push(``);
  }

  lines.push(`─────────────────────`);
  lines.push(`<i>${timestamp()}</i>`);

  const explorerUrl = walletAddress.startsWith("0x")
    ? `https://etherscan.io/address/${walletAddress}`
    : `https://explorer.solana.com/address/${walletAddress}`;

  return {
    text: lines.join("\n"),
    reply_markup: {
      inline_keyboard: [
        [
          { text: "View Wallet  →", url: explorerUrl },
          { text: "Open App  →", url: APP_URL },
        ],
      ],
    },
  };
}

// ─── Webhook Handler ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body?.callback_query) {
      const cb = body.callback_query;
      const chatId = String(cb.message?.chat?.id);
      const msgId = cb.message?.message_id as number;
      const data = cb.data ?? "";
      const name = cb.from?.first_name ?? "there";

      await ack(cb.id);

      const wallet = await telegramStore.getWalletByChatId(chatId);

      switch (data) {
        case "main_menu":
          await edit(
            chatId,
            msgId,
            wallet ? msgHome(name, wallet) : msgHomeNew(name),
            { reply_markup: wallet ? kb.home() : kb.homeNew() },
          );
          break;

        case "status":
          await edit(
            chatId,
            msgId,
            wallet ? msgStatus(wallet, chatId) : msgStatusNew(),
            { reply_markup: kb.backHome() },
          );
          break;

        case "wallet_info":
          await edit(
            chatId,
            msgId,
            wallet ? msgWalletInfo(wallet) : msgStatusNew(),
            { reply_markup: kb.backHome() },
          );
          break;

        case "flows_info":
          await edit(chatId, msgId, msgFlowsInfo(), {
            reply_markup: kb.backHome(),
          });
          break;

        case "alerts":
          await edit(chatId, msgId, msgAlerts(), {
            reply_markup: kb.backHome(),
          });
          break;

        case "help":
          await edit(chatId, msgId, msgHelp(), { reply_markup: kb.backHome() });
          break;

        case "about":
          await edit(chatId, msgId, msgAbout(), {
            reply_markup: kb.backHome(),
          });
          break;

        case "how_to":
          await edit(chatId, msgId, msgHowTo(), {
            reply_markup: kb.backHome(),
          });
          break;

        case "disconnect_ask":
          if (!wallet) {
            await edit(
              chatId,
              msgId,
              `<b>Nothing to disconnect</b>\n\nNo wallet is linked to this chat.`,
              { reply_markup: kb.backHome() },
            );
          } else {
            await edit(chatId, msgId, msgDisconnectAsk(wallet), {
              reply_markup: kb.disconnectConfirm(),
            });
          }
          break;

        case "disconnect_yes":
          await telegramStore.disconnectByChatId(chatId);
          await edit(chatId, msgId, msgDisconnected(), {
            reply_markup: kb.reconnect(),
          });
          break;
      }

      return NextResponse.json({ ok: true });
    }

    const message = body?.message;
    if (!message) return NextResponse.json({ ok: true });

    const chatId = String(message.chat?.id);
    const text = (message.text ?? "").trim();
    const name = message.from?.first_name ?? "there";

    if (text.startsWith("/start")) {
      const token = text.split(" ")[1];
      const linked = token
        ? await telegramStore.linkToken(token, chatId)
        : false;

      if (linked) {
        const wallet = await telegramStore.getWalletByChatId(chatId);
        await send(
          chatId,
          `<b>WRAITH</b>  ·  DeFi Automation\n` +
            `─────────────────────\n\n` +
            `Wallet linked successfully.\n\n` +
            `<b>Hello, ${name}.</b> You are all set.\n\n` +
            `<code>WALLET   </code>  <code>${shortWallet(wallet ?? "")}</code>\n` +
            `<code>ALERTS   </code>  Active\n\n` +
            `─────────────────────\n\n` +
            `Flow alerts will be delivered here\n` +
            `every time your flows execute.\n\n` +
            `<i>Select an option below.</i>`,
          { reply_markup: kb.home() },
        );
      } else {
        await send(chatId, msgHomeNew(name), { reply_markup: kb.homeNew() });
      }
    } else if (text === "/status") {
      const wallet = await telegramStore.getWalletByChatId(chatId);
      await send(chatId, wallet ? msgStatus(wallet, chatId) : msgStatusNew(), {
        reply_markup: kb.backHome(),
      });
    } else if (text === "/disconnect") {
      const wallet = await telegramStore.getWalletByChatId(chatId);
      if (!wallet) {
        await send(
          chatId,
          `<b>Nothing to disconnect</b>\n\nNo wallet is linked to this chat.`,
        );
      } else {
        await send(chatId, msgDisconnectAsk(wallet), {
          reply_markup: kb.disconnectConfirm(),
        });
      }
    } else if (text === "/alerts") {
      await send(chatId, msgAlerts(), { reply_markup: kb.backHome() });
    } else if (text === "/help") {
      await send(chatId, msgHelp(), { reply_markup: kb.backHome() });
    } else if (text === "/about") {
      await send(chatId, msgAbout(), { reply_markup: kb.backHome() });
    } else {
      const wallet = await telegramStore.getWalletByChatId(chatId);
      await send(chatId, wallet ? msgHome(name, wallet) : msgHomeNew(name), {
        reply_markup: wallet ? kb.home() : kb.homeNew(),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[webhook]", err);
    return NextResponse.json({ ok: true });
  }
}
