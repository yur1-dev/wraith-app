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

const D = "▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰";
const D2 = "· · · · · · · · · · ·";

function sw(w: string) {
  if (!w) return "unknown";
  return w.length > 12 ? `${w.slice(0, 6)}···${w.slice(-4)}` : w;
}

function ts() {
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
        { text: "📡 Status", callback_data: "status" },
        { text: "📋 My Flows", callback_data: "flows_info" },
      ],
      [
        { text: "🔔 Alert Settings", callback_data: "alerts" },
        { text: "💼 Wallet Info", callback_data: "wallet_info" },
      ],
      [
        { text: "❓ Help", callback_data: "help" },
        { text: "ℹ️ About Wraith", callback_data: "about" },
      ],
      [{ text: "🌐 Open Wraith App", url: APP_URL }],
      [{ text: "🔌 Disconnect", callback_data: "disconnect_ask" }],
    ],
  }),

  homeNew: () => ({
    inline_keyboard: [
      [{ text: "🚀 Get Started", url: APP_URL }],
      [
        { text: "📖 How to Connect", callback_data: "how_to" },
        { text: "ℹ️ About Wraith", callback_data: "about" },
      ],
      [{ text: "❓ Help", callback_data: "help" }],
    ],
  }),

  back: (to = "main_menu") => ({
    inline_keyboard: [[{ text: "‹ Back to Menu", callback_data: to }]],
  }),

  backHome: () => ({
    inline_keyboard: [[{ text: "‹ Back", callback_data: "main_menu" }]],
  }),

  disconnectConfirm: () => ({
    inline_keyboard: [
      [
        { text: "⚠️ Yes, Disconnect", callback_data: "disconnect_yes" },
        { text: "✕ Cancel", callback_data: "main_menu" },
      ],
    ],
  }),

  reconnect: () => ({
    inline_keyboard: [
      [{ text: "🔗 Reconnect via App", url: APP_URL }],
      [{ text: "❓ How to Connect", callback_data: "how_to" }],
    ],
  }),

  alertActions: () => ({
    inline_keyboard: [
      [
        { text: "📡 Status", callback_data: "status" },
        { text: "🏠 Menu", callback_data: "main_menu" },
      ],
    ],
  }),
};

// ─── Message Templates ────────────────────────────────────────────────────────

function msgHome(name: string, wallet: string) {
  return [
    `⬡  <b>WRAITH</b> — DeFi Automation`,
    D,
    ``,
    `👋 Welcome back, <b>${name}</b>`,
    ``,
    `<b>● Status</b>      Connected`,
    `<b>● Wallet</b>      <code>${sw(wallet)}</code>`,
    `<b>● Alerts</b>      Active ✓`,
    `<b>● Network</b>     Auto-detect`,
    ``,
    D2,
    ``,
    `Your flow executions will be delivered`,
    `here in real-time — swaps, bridges,`,
    `completions, errors, and more.`,
    ``,
    `<i>Select an option below ↓</i>`,
  ].join("\n");
}

function msgHomeNew(name: string) {
  return [
    `⬡  <b>WRAITH</b> — DeFi Automation`,
    D,
    ``,
    `👋 Hey <b>${name}</b>, welcome.`,
    ``,
    `<b>● Status</b>      Not connected`,
    `<b>● Alerts</b>      Inactive`,
    ``,
    D2,
    ``,
    `I'm your Wraith alert bot.`,
    `Connect your wallet to start receiving`,
    `real-time flow execution alerts.`,
    ``,
    `<b>Alerts include:</b>`,
    `  🔁 Swap results + tx hash`,
    `  🌉 Bridge transactions`,
    `  ✅ Flow completions`,
    `  ❌ Errors + failed nodes`,
    `  ⏰ Trigger activations`,
    ``,
    `<i>Tap Get Started to connect ↓</i>`,
  ].join("\n");
}

function msgStatus(wallet: string, chatId: string) {
  return [
    `📡  <b>Connection Status</b>`,
    D,
    ``,
    `<b>● Status</b>      🟢 Active`,
    `<b>● Alerts</b>      Enabled`,
    ``,
    `<b>Wallet Address</b>`,
    `<code>${wallet}</code>`,
    ``,
    `<b>Telegram Chat ID</b>`,
    `<code>${chatId}</code>`,
    ``,
    D2,
    `<i>Last checked: ${ts()}</i>`,
    ``,
    `<i>All flow executions linked to this`,
    `wallet will notify this chat.</i>`,
  ].join("\n");
}

function msgStatusNew() {
  return [
    `📡  <b>Connection Status</b>`,
    D,
    ``,
    `<b>● Status</b>      🔴 Disconnected`,
    `<b>● Alerts</b>      Paused`,
    ``,
    D2,
    ``,
    `No wallet is linked to this chat.`,
    ``,
    `To connect, open the Wraith app,`,
    `drop an <b>Alert</b> node, set channel`,
    `to <b>Telegram</b>, then click <b>Open bot</b>.`,
  ].join("\n");
}

function msgWalletInfo(wallet: string) {
  const isSOL =
    wallet.length >= 32 && wallet.length <= 44 && !wallet.startsWith("0x");
  const chain = isSOL ? "Solana" : "EVM";
  const explorerBase = isSOL
    ? `https://explorer.solana.com/address/${wallet}`
    : `https://etherscan.io/address/${wallet}`;

  return [
    `💼  <b>Wallet Info</b>`,
    D,
    ``,
    `<b>Address</b>`,
    `<code>${wallet}</code>`,
    ``,
    `<b>● Network</b>     ${chain}`,
    `<b>● Short</b>       <code>${sw(wallet)}</code>`,
    ``,
    D2,
    ``,
    `<a href="${explorerBase}">🔍 View on Explorer ↗</a>`,
    ``,
    `<i>This wallet receives all flow alerts`,
    `and is used for swap/bridge execution.</i>`,
  ].join("\n");
}

function msgFlowsInfo() {
  return [
    `📋  <b>Flow Execution</b>`,
    D,
    ``,
    `Wraith flows are visual automation`,
    `pipelines built in the app.`,
    ``,
    `<b>Node types:</b>`,
    ``,
    `⏰ <b>Trigger</b>`,
    `   Starts the flow — manual, scheduled,`,
    `   or on a price condition`,
    ``,
    `💼 <b>Multi-Wallet</b>`,
    `   Run the flow across multiple wallets`,
    `   simultaneously`,
    ``,
    `🔁 <b>Swap</b>`,
    `   Execute token swaps via Jupiter,`,
    `   Orca, or Raydium`,
    ``,
    `🌉 <b>Bridge</b>`,
    `   Move assets cross-chain`,
    ``,
    `🔀 <b>Condition</b>`,
    `   Branch flow based on price/balance`,
    ``,
    `🔔 <b>Alert</b>`,
    `   Send notifications — that's this bot`,
    ``,
    D2,
    ``,
    `<a href="${APP_URL}">🌐 Build a flow in the app ↗</a>`,
  ].join("\n");
}

function msgAlerts() {
  return [
    `🔔  <b>Alert Settings</b>`,
    D,
    ``,
    `<b>● Delivery</b>     This chat`,
    `<b>● Status</b>       Active`,
    `<b>● Trigger</b>      Auto on execution`,
    ``,
    D2,
    ``,
    `<b>You'll receive alerts for:</b>`,
    ``,
    `✅  <b>Flow Completed</b>`,
    `    Per-node results, total runtime,`,
    `    success/fail count`,
    ``,
    `❌  <b>Flow Failed</b>`,
    `    Which node failed, error message,`,
    `    stack context`,
    ``,
    `🔁  <b>Swap Executed</b>`,
    `    Token pair, input/output amounts,`,
    `    DEX used, tx hash with explorer link`,
    ``,
    `🌉  <b>Bridge Initiated</b>`,
    `    From/to chain, amount, status`,
    ``,
    `⚠️  <b>Node Warning</b>`,
    `    Skipped nodes, partial failures`,
    ``,
    D2,
    ``,
    `<b>Format</b>      HTML with inline links`,
    `<b>Latency</b>     &lt; 1 second after execution`,
  ].join("\n");
}

function msgHelp() {
  return [
    `❓  <b>Wraith Bot — Help</b>`,
    D,
    ``,
    `<b>Commands</b>`,
    ``,
    `<code>/start</code>       Open the main menu`,
    `<code>/status</code>      Check wallet connection`,
    `<code>/alerts</code>      View alert configuration`,
    `<code>/disconnect</code>  Unlink this chat`,
    `<code>/help</code>        Show this screen`,
    ``,
    D2,
    ``,
    `<b>How alerts work</b>`,
    ``,
    `1. Build a flow in the Wraith app`,
    `2. Add an Alert node → set to Telegram`,
    `3. Click "Open bot" to link your wallet`,
    `4. Run the flow — alerts arrive here`,
    ``,
    D2,
    ``,
    `<b>Troubleshooting</b>`,
    ``,
    `• Not getting alerts?`,
    `  → Check <code>/status</code> is Connected`,
    `  → Re-run the flow from the app`,
    ``,
    `• Wrong wallet linked?`,
    `  → Use /disconnect then reconnect`,
    ``,
    `• Bot not responding?`,
    `  → Type /start to reset`,
    ``,
    D2,
    `<a href="${APP_URL}">🌐 Open Wraith App ↗</a>`,
  ].join("\n");
}

function msgAbout() {
  return [
    `⬡  <b>About Wraith</b>`,
    D,
    ``,
    `Wraith is a no-code DeFi automation`,
    `platform — think Zapier for crypto.`,
    ``,
    `Build visual flow pipelines to automate`,
    `on-chain strategies without writing code.`,
    ``,
    D2,
    ``,
    `<b>What you can automate:</b>`,
    ``,
    `  🔁 Token swaps across DEXes`,
    `  🌉 Cross-chain bridges`,
    `  💼 Multi-wallet execution`,
    `  ⏰ Scheduled / triggered flows`,
    `  🔀 Conditional logic (price, balance)`,
    `  🔔 Real-time Telegram alerts`,
    ``,
    D2,
    ``,
    `<b>Networks</b>    Solana + EVM`,
    `<b>DEXes</b>       Jupiter · Orca · Raydium`,
    `<b>Status</b>      Beta`,
    ``,
    `<a href="${APP_URL}">🌐 wraith-app.vercel.app ↗</a>`,
  ].join("\n");
}

function msgHowTo() {
  return [
    `📖  <b>How to Connect</b>`,
    D,
    ``,
    `<b>Step 1</b>  Open the Wraith app`,
    `<a href="${APP_URL}">→ wraith-app.vercel.app</a>`,
    ``,
    `<b>Step 2</b>  Connect your wallet`,
    `→ Click the wallet button (top bar)`,
    `→ Connect Phantom, Solflare, or EVM`,
    ``,
    `<b>Step 3</b>  Add an Alert node`,
    `→ Canvas → Core tab → drag Alert`,
    `→ Set channel to <b>Telegram</b>`,
    ``,
    `<b>Step 4</b>  Link this bot`,
    `→ Click <b>Open bot</b> in the node panel`,
    `→ You'll be redirected here`,
    `→ Send /start — done ✓`,
    ``,
    D2,
    ``,
    `<i>Your wallet address is automatically`,
    `linked to this Telegram chat.</i>`,
    `<i>All future flow runs will notify you here.</i>`,
  ].join("\n");
}

function msgDisconnectAsk(wallet: string) {
  return [
    `🔌  <b>Disconnect Wallet</b>`,
    D,
    ``,
    `You're about to unlink this wallet`,
    `from Telegram alerts:`,
    ``,
    `<code>${wallet}</code>`,
    ``,
    `<b>What happens:</b>`,
    `  • This chat stops receiving alerts`,
    `  • Your flows keep running in the app`,
    `  • You can reconnect anytime`,
    ``,
    D2,
    ``,
    `<b>⚠️ Are you sure?</b>`,
  ].join("\n");
}

function msgDisconnected() {
  return [
    `🔌  <b>Wallet Disconnected</b>`,
    D,
    ``,
    `<b>● Status</b>      🔴 Inactive`,
    `<b>● Alerts</b>      Paused`,
    ``,
    `Your wallet has been unlinked.`,
    `You won't receive flow alerts`,
    `until you reconnect.`,
    ``,
    D2,
    ``,
    `To reconnect, open the Wraith app,`,
    `find your Alert node, and click`,
    `<b>Open bot</b> again.`,
    ``,
    `<i>Your flows are still active in the app.</i>`,
  ].join("\n");
}

// ─── Execution Alert (called from sendAlert.ts) ───────────────────────────────
// This is exported so lib/telegram/sendAlert.ts can import and use it directly.

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

  // Header
  if (allGood) {
    lines.push(`✅  <b>Flow Completed</b>`);
  } else {
    lines.push(`❌  <b>Flow Failed</b>`);
  }
  lines.push(D);
  lines.push(``);

  // Meta
  lines.push(`<b>Flow</b>      ${name}`);
  lines.push(`<b>Wallet</b>    <code>${sw(walletAddress)}</code>`);
  lines.push(`<b>Network</b>   ${network}`);
  lines.push(`<b>Time</b>      ${elapsed}`);
  lines.push(
    `<b>Nodes</b>     ${ok}/${total} passed${skipped > 0 ? ` · ${skipped} skipped` : ""}`,
  );
  lines.push(``);
  lines.push(D2);
  lines.push(``);

  // Per-node breakdown
  lines.push(`<b>Execution Breakdown</b>`);
  lines.push(``);

  for (const node of results) {
    const icon =
      node.status === "success" ? "✓" : node.status === "error" ? "✗" : "○";
    const label = node.label ?? node.type ?? "Node";
    const dur = node.durationMs ? ` <i>${node.durationMs}ms</i>` : "";

    lines.push(`${icon} <b>${label}</b>${dur}`);

    if (node.status === "success" && node.output) {
      const o = node.output;

      // Swap details
      if (o.fromToken && o.toToken) {
        const amtIn = o.amountIn ?? "?";
        const amtOut = o.amountOut ?? "?";
        const dex = o.dex ? ` via ${o.dex}` : "";
        lines.push(
          `   <code>${amtIn} ${o.fromToken} → ${amtOut} ${o.toToken}</code>${dex}`,
        );
      }

      // Bridge details
      if (o.chain || o.toChain) {
        const from = o.chain ?? "?";
        const to = o.toChain ?? "?";
        lines.push(`   <code>${from} → ${to}</code>`);
      }

      // Tx hash
      if (o.txHash) {
        const base =
          network === "devnet"
            ? `https://explorer.solana.com/tx/${o.txHash}?cluster=devnet`
            : `https://explorer.solana.com/tx/${o.txHash}`;
        const short = `${o.txHash.slice(0, 8)}...${o.txHash.slice(-6)}`;
        lines.push(`   <a href="${base}">🔗 ${short} ↗</a>`);
      }
    }

    if (node.status === "error" && node.output?.error) {
      const err = String(node.output.error).slice(0, 100);
      lines.push(`   ⚠️ <i>${err}</i>`);
    }

    if (node.status === "skipped") {
      lines.push(`   <i>Skipped — condition not met</i>`);
    }

    lines.push(``);
  }

  lines.push(D2);
  lines.push(`<i>${ts()}</i>`);

  const explorerUrl = walletAddress.startsWith("0x")
    ? `https://etherscan.io/address/${walletAddress}`
    : `https://explorer.solana.com/address/${walletAddress}`;

  return {
    text: lines.join("\n"),
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🔍 View Wallet", url: explorerUrl },
          { text: "🌐 Open App", url: APP_URL },
        ],
      ],
    },
  };
}

// ─── Webhook Handler ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ── Callback queries (button taps) ────────────────────────────────────────
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
          if (!wallet) {
            await edit(chatId, msgId, msgStatusNew(), {
              reply_markup: kb.backHome(),
            });
          } else {
            await edit(chatId, msgId, msgWalletInfo(wallet), {
              reply_markup: kb.backHome(),
            });
          }
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
              `❌ <b>Nothing to disconnect</b>\n\nNo wallet is linked to this chat.`,
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

    // ── Text / commands ───────────────────────────────────────────────────────
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
          [
            `⬡  <b>WRAITH</b> — Connected`,
            D,
            ``,
            `✅ <b>Wallet linked successfully!</b>`,
            ``,
            `<b>Hey ${name}</b> — you're all set.`,
            ``,
            `<b>Wallet</b>    <code>${sw(wallet ?? "")}</code>`,
            `<b>Alerts</b>    Active ✓`,
            ``,
            D2,
            ``,
            `Flow alerts will now be delivered`,
            `here every time your flows execute.`,
            ``,
            `<i>Use the menu below to explore. ↓</i>`,
          ].join("\n"),
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
          `❌ <b>Nothing to disconnect</b>\n\nNo wallet is linked to this chat.`,
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
      // Any unknown input → show home
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
