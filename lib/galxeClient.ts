/**
 * galxeClient.ts — Real Galxe GraphQL automation
 * API: https://graphigo.prd.galaxy.eco/query
 *
 * Drop this in /lib/ alongside jupiterSwap.ts and discordClient.ts
 */

const GALXE_API = "https://graphigo.prd.galaxy.eco/query";

// ── Types ──────────────────────────────────────────────────────────────────

export interface GalxeTaskResult {
  success: boolean;
  campaignId?: string;
  campaignName?: string;
  txHash?: string;
  eligible?: boolean;
  message: string;
}

interface GalxeGraphQLError {
  message: string;
  extensions?: { code?: string };
}

// ── Core request helper ────────────────────────────────────────────────────

async function galxeQuery<T = unknown>(
  query: string,
  variables: Record<string, unknown>,
  accessToken: string,
): Promise<T> {
  const res = await fetch(GALXE_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { "access-token": accessToken } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(`Galxe API HTTP ${res.status}: ${res.statusText}`);
  }

  const json = (await res.json()) as {
    data?: T;
    errors?: GalxeGraphQLError[];
  };

  if (json.errors?.length) {
    const msg = json.errors[0].message;
    const code = json.errors[0].extensions?.code;

    if (
      msg.toLowerCase().includes("unauthorized") ||
      msg.toLowerCase().includes("unauthenticated") ||
      code === "UNAUTHENTICATED"
    ) {
      throw new Error("Invalid or expired Galxe access token");
    }
    if (msg.toLowerCase().includes("not found")) {
      throw new Error("Campaign not found — check the URL or credential ID");
    }
    if (msg.toLowerCase().includes("already claimed")) {
      throw new Error("OAT already claimed for this wallet");
    }
    if (msg.toLowerCase().includes("not eligible")) {
      throw new Error("Wallet is not eligible for this campaign");
    }
    throw new Error(`Galxe error: ${msg}`);
  }

  if (!json.data) {
    throw new Error("Empty response from Galxe API");
  }

  return json.data;
}

// ── Extract campaign alias from URL ───────────────────────────────────────

function parseCampaignAlias(url: string): string {
  // galxe.com/ProjectSlug/campaign/CampaignAlias
  // OR galxe.com/campaign/CampaignAlias
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    const parts = u.pathname.split("/").filter(Boolean);
    // Last non-empty segment is the campaign alias
    const alias = parts[parts.length - 1];
    if (!alias || alias.length < 3) {
      throw new Error("Cannot parse campaign alias from URL");
    }
    return alias;
  } catch {
    throw new Error(
      "Invalid Galxe campaign URL. Expected format: galxe.com/Project/campaign/AliasXYZ",
    );
  }
}

// ── Validate token ─────────────────────────────────────────────────────────

export async function validateGalxeToken(
  accessToken: string,
): Promise<{ valid: boolean; address?: string }> {
  if (!accessToken || accessToken.trim().length < 10) {
    return { valid: false };
  }
  try {
    const data = await galxeQuery<{
      addressInfo?: { address: string; galxeScore?: number };
    }>(
      `query {
        addressInfo {
          address
          galxeScore
        }
      }`,
      {},
      accessToken,
    );
    return { valid: true, address: data.addressInfo?.address };
  } catch {
    return { valid: false };
  }
}

// ── Get campaign info ──────────────────────────────────────────────────────

async function getCampaignInfo(
  alias: string,
  accessToken: string,
): Promise<{ id: string; name: string; status: string }> {
  const data = await galxeQuery<{
    campaign?: { id: string; name: string; status: string };
  }>(
    `query CampaignInfo($alias: String!) {
      campaign(alias: $alias) {
        id
        name
        status
      }
    }`,
    { alias },
    accessToken,
  );

  if (!data.campaign) {
    throw new Error("Campaign not found");
  }
  if (data.campaign.status === "Expired") {
    throw new Error(`Campaign "${data.campaign.name}" has expired`);
  }
  return data.campaign;
}

// ── Check eligibility ─────────────────────────────────────────────────────

export async function checkEligibility(
  campaignUrl: string,
  accessToken: string,
  walletAddress: string,
): Promise<GalxeTaskResult> {
  if (!walletAddress)
    throw new Error("Wallet address required to check eligibility");

  const alias = parseCampaignAlias(campaignUrl);
  const campaign = await getCampaignInfo(alias, accessToken);

  const data = await galxeQuery<{
    campaign?: {
      whitelistInfo?: {
        address: string;
        maxCount: number;
        usedCount: number;
        hasClaimed: boolean;
      };
    };
  }>(
    `query CheckEligibility($alias: String!, $address: String!) {
      campaign(alias: $alias) {
        whitelistInfo(address: $address) {
          address
          maxCount
          usedCount
          hasClaimed
        }
      }
    }`,
    { alias, address: walletAddress },
    accessToken,
  );

  const info = data.campaign?.whitelistInfo;
  if (!info) {
    return {
      success: true,
      campaignId: campaign.id,
      campaignName: campaign.name,
      eligible: false,
      message: `Not eligible: wallet not on whitelist for "${campaign.name}"`,
    };
  }

  const eligible = info.maxCount > info.usedCount && !info.hasClaimed;
  return {
    success: true,
    campaignId: campaign.id,
    campaignName: campaign.name,
    eligible,
    message: eligible
      ? `Eligible ✓ — ${info.maxCount - info.usedCount} claim(s) remaining for "${campaign.name}"`
      : info.hasClaimed
        ? `Already claimed OAT for "${campaign.name}"`
        : `Not eligible for "${campaign.name}"`,
  };
}

// ── Claim OAT ─────────────────────────────────────────────────────────────

export async function claimOAT(
  campaignUrl: string,
  accessToken: string,
  walletAddress: string,
): Promise<GalxeTaskResult> {
  if (!walletAddress) throw new Error("Wallet address required to claim OAT");

  const alias = parseCampaignAlias(campaignUrl);
  const campaign = await getCampaignInfo(alias, accessToken);

  // Claim via the prepareParticipate mutation
  const data = await galxeQuery<{
    prepareParticipate?: {
      allow: boolean;
      disallowReason: string;
      signature: string;
      mintFuncInfo?: {
        funcName: string;
        nftCoreAddress: string;
      };
    };
  }>(
    `mutation ClaimOAT($input: PrepareParticipateInput!) {
      prepareParticipate(input: $input) {
        allow
        disallowReason
        signature
        mintFuncInfo {
          funcName
          nftCoreAddress
        }
      }
    }`,
    {
      input: {
        campaignID: campaign.id,
        address: walletAddress,
        signature: "",
        signingMessage: "",
        chain: "ETHEREUM",
        captcha: null,
      },
    },
    accessToken,
  );

  const result = data.prepareParticipate;
  if (!result) throw new Error("No response from Galxe claim endpoint");

  if (!result.allow) {
    throw new Error(result.disallowReason || "Claim not allowed");
  }

  return {
    success: true,
    campaignId: campaign.id,
    campaignName: campaign.name,
    message: `OAT claimed successfully for "${campaign.name}"`,
  };
}

// ── Complete campaign tasks ────────────────────────────────────────────────

export async function completeCampaignTasks(
  campaignUrl: string,
  accessToken: string,
  walletAddress: string,
): Promise<GalxeTaskResult> {
  if (!walletAddress) throw new Error("Wallet address required");

  const alias = parseCampaignAlias(campaignUrl);
  const campaign = await getCampaignInfo(alias, accessToken);

  // Get campaign tasks
  const tasksData = await galxeQuery<{
    campaign?: {
      id: string;
      name: string;
      credentialGroups?: Array<{
        credentials: Array<{
          id: string;
          name: string;
          credType: string;
        }>;
      }>;
    };
  }>(
    `query CampaignTasks($alias: String!) {
      campaign(alias: $alias) {
        id
        name
        credentialGroups {
          credentials {
            id
            name
            credType
          }
        }
      }
    }`,
    { alias },
    accessToken,
  );

  const groups = tasksData.campaign?.credentialGroups ?? [];
  const credentials = groups.flatMap((g) => g.credentials);

  if (credentials.length === 0) {
    return {
      success: true,
      campaignId: campaign.id,
      campaignName: campaign.name,
      message: `No tasks found for "${campaign.name}" — may require manual completion on Galxe`,
    };
  }

  // Sync each verifiable credential
  let synced = 0;
  const errors: string[] = [];

  for (const cred of credentials) {
    // Only attempt to sync verifiable on-chain or visit-type credentials
    if (
      cred.credType === "VISIT_LINK" ||
      cred.credType === "ON_CHAIN" ||
      cred.credType === "TWITTER" ||
      cred.credType === "DISCORD"
    ) {
      try {
        await galxeQuery(
          `mutation SyncCredential($input: SyncCredentialValueInput!) {
            syncCredentialValue(input: $input) {
              result
            }
          }`,
          {
            input: {
              syncOptions: {
                credId: cred.id,
                address: walletAddress,
                syncType: "STANDARD",
              },
            },
          },
          accessToken,
        );
        synced++;
      } catch (e) {
        errors.push(
          `${cred.name}: ${e instanceof Error ? e.message : "failed"}`,
        );
      }
    }
  }

  const totalTasks = credentials.length;
  const msg =
    errors.length === 0
      ? `Synced ${synced}/${totalTasks} tasks for "${campaign.name}"`
      : `Synced ${synced}/${totalTasks} tasks. Issues: ${errors.slice(0, 2).join("; ")}`;

  return {
    success: errors.length < totalTasks,
    campaignId: campaign.id,
    campaignName: campaign.name,
    message: msg,
  };
}

// ── Main entry point ───────────────────────────────────────────────────────

export async function executeGalxeTask(params: {
  campaignUrl: string;
  action: "complete" | "claim" | "check";
  galxeToken: string;
  walletAddress: string;
}): Promise<GalxeTaskResult> {
  const { campaignUrl, action, galxeToken, walletAddress } = params;

  // Validate inputs
  if (!campaignUrl.trim()) throw new Error("Campaign URL is required");
  if (!galxeToken.trim()) throw new Error("Galxe access token is required");

  // Validate token first
  const tokenCheck = await validateGalxeToken(galxeToken);
  if (!tokenCheck.valid) {
    throw new Error(
      "Invalid Galxe access token — get yours at app.galxe.com/settings",
    );
  }

  switch (action) {
    case "complete":
      return completeCampaignTasks(campaignUrl, galxeToken, walletAddress);
    case "claim":
      return claimOAT(campaignUrl, galxeToken, walletAddress);
    case "check":
      return checkEligibility(campaignUrl, galxeToken, walletAddress);
    default:
      throw new Error(`Unknown action: ${action}`);
  }
}
