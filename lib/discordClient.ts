/**
 * discordClient.ts
 * Real Discord task execution via Discord REST API using a user account token.
 * No SDK. Direct HTTP calls to Discord's v10 API.
 *
 * NOTE: Selfbotting (automating a user account) violates Discord's ToS.
 * Use a dedicated farming account — never your main account.
 */

const DISCORD_API = "https://discord.com/api/v10";

export interface DiscordTaskParams {
  token: string; // User account token (from data.discordToken)
  taskType: "join" | "message" | "react" | "role";
  serverId?: string; // Invite code OR server ID (e.g. "discord.gg/abc" or "123456789")
  channelId?: string; // Channel snowflake ID
  message?: string; // Message text to send
  messageId?: string; // Message snowflake ID to react to
  emoji?: string; // Emoji to react with (e.g. "👍" or "customname:123456")
  roleId?: string; // Role ID for get-role tasks
}

export interface DiscordTaskResult {
  success: true;
  detail: string; // Human-readable result
}

// ── Auth headers ──────────────────────────────────────────────────────────────
function headers(token: string): HeadersInit {
  return {
    Authorization: token,
    "Content-Type": "application/json",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "X-Super-Properties": btoa(
      JSON.stringify({
        os: "Windows",
        browser: "Chrome",
        device: "",
        browser_version: "120.0.0.0",
        client_build_number: 244905,
      }),
    ),
  };
}

// ── Generic Discord API call ───────────────────────────────────────────────────
async function discordFetch(
  token: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<unknown> {
  const res = await fetch(`${DISCORD_API}${path}`, {
    method,
    headers: headers(token),
    body: body ? JSON.stringify(body) : undefined,
  });

  // 204 No Content = success with no body (reactions, etc.)
  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const code = (data as any)?.code;
    const discordMsg = (data as any)?.message ?? "Unknown error";

    // Map Discord error codes to human-readable messages
    if (res.status === 401)
      throw new Error("Invalid token — check your Discord token");
    if (res.status === 403)
      throw new Error(`Missing permissions: ${discordMsg}`);
    if (res.status === 404)
      throw new Error(`Not found — check IDs are correct`);
    if (res.status === 429) {
      const retryAfter = (data as any)?.retry_after ?? 1;
      throw new Error(`Rate limited — retry after ${retryAfter}s`);
    }
    if (code === 40007) throw new Error("You are banned from this server");
    if (code === 50013) throw new Error("Missing permissions in this channel");
    if (code === 10003) throw new Error("Unknown channel — check channel ID");
    if (code === 10004) throw new Error("Unknown guild — check server ID");
    if (code === 10014) throw new Error("Unknown emoji");
    throw new Error(`Discord error ${res.status}: ${discordMsg}`);
  }

  return data;
}

// ── Resolve invite code to guild ID ──────────────────────────────────────────
async function resolveInvite(inviteCode: string): Promise<string> {
  // Strip common prefixes
  const code = inviteCode
    .replace("https://discord.gg/", "")
    .replace("https://discord.com/invite/", "")
    .replace("discord.gg/", "")
    .trim();

  const data = (await discordFetch(
    "",
    "GET",
    `/invites/${code}?with_counts=true`,
  )) as any;
  if (!data?.guild?.id) throw new Error(`Invalid invite code: ${code}`);
  return data.guild.id;
}

// ── Validate token returns current user ──────────────────────────────────────
async function validateToken(token: string): Promise<string> {
  const user = (await discordFetch(token, "GET", "/users/@me")) as any;
  if (!user?.id) throw new Error("Token validation failed");
  return `${user.username}#${user.discriminator ?? "0"}`;
}

// ── Task: Join Server ─────────────────────────────────────────────────────────
async function joinServer(
  token: string,
  inviteOrId: string,
): Promise<DiscordTaskResult> {
  const code = inviteOrId
    .replace("https://discord.gg/", "")
    .replace("https://discord.com/invite/", "")
    .replace("discord.gg/", "")
    .trim();

  await discordFetch(token, "POST", `/invites/${code}`, {});

  return {
    success: true,
    detail: `Joined server via invite: ${code}`,
  };
}

// ── Task: Send Message ────────────────────────────────────────────────────────
async function sendMessage(
  token: string,
  channelId: string,
  message: string,
): Promise<DiscordTaskResult> {
  if (!channelId.trim()) throw new Error("Channel ID is required");
  if (!message.trim()) throw new Error("Message cannot be empty");

  const res = (await discordFetch(
    token,
    "POST",
    `/channels/${channelId}/messages`,
    {
      content: message,
      // Suppress embeds to look more natural
      flags: 4,
    },
  )) as any;

  return {
    success: true,
    detail: `Message sent to #${channelId} (msg ID: ${res?.id})`,
  };
}

// ── Task: React to Message ────────────────────────────────────────────────────
async function reactToMessage(
  token: string,
  channelId: string,
  messageId: string,
  emoji: string,
): Promise<DiscordTaskResult> {
  if (!channelId.trim()) throw new Error("Channel ID is required");
  if (!messageId.trim()) throw new Error("Message ID is required");
  if (!emoji.trim()) throw new Error("Emoji is required");

  // Encode emoji for URL — unicode emoji needs encoding, custom emoji needs "name:id" format
  const encodedEmoji = encodeURIComponent(emoji);

  await discordFetch(
    token,
    "PUT",
    `/channels/${channelId}/messages/${messageId}/reactions/${encodedEmoji}/@me`,
  );

  return {
    success: true,
    detail: `Reacted with ${emoji} to message ${messageId}`,
  };
}

// ── Task: Get Role (via reaction role or direct assign check) ─────────────────
// Discord doesn't allow users to self-assign roles via API directly.
// This triggers the reaction that reaction-role bots watch, which then assigns the role.
async function getRole(
  token: string,
  channelId: string,
  messageId: string,
  emoji: string,
): Promise<DiscordTaskResult> {
  if (!channelId.trim())
    throw new Error("Channel ID required for role reaction");
  if (!messageId.trim())
    throw new Error("Message ID required (reaction role message)");

  // React to the reaction-role message — the bot watching it will assign the role
  const encodedEmoji = encodeURIComponent(emoji || "✅");

  await discordFetch(
    token,
    "PUT",
    `/channels/${channelId}/messages/${messageId}/reactions/${encodedEmoji}/@me`,
  );

  return {
    success: true,
    detail: `Reacted to role message — bot should assign role`,
  };
}

// ── Main entry point ──────────────────────────────────────────────────────────
export async function executeDiscordTask(
  params: DiscordTaskParams,
): Promise<DiscordTaskResult> {
  const {
    token,
    taskType,
    serverId,
    channelId,
    message,
    messageId,
    emoji,
    roleId,
  } = params;

  if (!token?.trim()) {
    throw new Error("No Discord token — add it in the panel");
  }

  // Validate token first (confirms it works before doing anything)
  await validateToken(token);

  switch (taskType) {
    case "join": {
      if (!serverId?.trim()) throw new Error("Server invite/ID required");
      return joinServer(token, serverId);
    }

    case "message": {
      if (!channelId?.trim()) throw new Error("Channel ID required");
      if (!message?.trim()) throw new Error("Message text required");
      return sendMessage(token, channelId, message);
    }

    case "react": {
      if (!channelId?.trim()) throw new Error("Channel ID required");
      if (!messageId?.trim()) throw new Error("Message ID required");
      return reactToMessage(token, channelId, messageId ?? "", emoji ?? "👍");
    }

    case "role": {
      // Role assignment via reaction role bot
      if (!channelId?.trim())
        throw new Error("Channel ID required (reaction role channel)");
      if (!messageId?.trim())
        throw new Error("Message ID required (reaction role message)");
      return getRole(token, channelId, messageId ?? "", emoji ?? "✅");
    }

    default:
      throw new Error(`Unknown task type: ${taskType}`);
  }
}
