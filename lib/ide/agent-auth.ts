/**
 * Device-token authentication for the Nexus Local Development Agent.
 *
 * The agent has no Supabase user session, so its requests cannot be evaluated
 * by Row Level Security. Instead:
 *
 *   1. the raw token is hashed and looked up in `ide_agent_devices`
 *   2. the matching row yields the owning `user_id`
 *   3. every subsequent query is explicitly filtered by that `user_id`
 *
 * The service-role client is used only after step 1 succeeds, and every helper
 * in this file scopes by the resolved user. A token that does not resolve gets
 * a 401 before any data is touched.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  createSupabaseAdminClient,
  isServiceRoleConfigured,
} from '@/lib/supabase/admin';
import { ApiError, sha256Hex, type AuthedContext } from './api';
import {
  AGENT_ONLINE_WINDOW_MS,
  AGENT_TOKEN_PREFIX,
  parseBearerToken,
} from './agent-protocol';

export interface AgentContext {
  admin: SupabaseClient;
  deviceId: string;
  userId: string;
  deviceName: string;
}

/** Generate a new device token. Returned to the user exactly once. */
export function generateDeviceToken(): { token: string; prefix: string } {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const body = Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  const token = `${AGENT_TOKEN_PREFIX}${body}`;
  return { token, prefix: token.slice(0, AGENT_TOKEN_PREFIX.length + 6) };
}

export async function hashDeviceToken(token: string): Promise<string> {
  return sha256Hex(token);
}

/**
 * Resolve the device behind an agent request, or throw.
 * Revoked devices are rejected exactly like unknown ones.
 */
export async function requireAgentDevice(request: Request): Promise<AgentContext> {
  if (!isServiceRoleConfigured()) {
    throw new ApiError(
      503,
      'This server is not configured for local agents. Set SUPABASE_SERVICE_ROLE_KEY and restart.'
    );
  }

  const token = parseBearerToken(request.headers.get('authorization'));
  if (!token || !token.startsWith(AGENT_TOKEN_PREFIX)) {
    throw new ApiError(401, 'A valid agent device token is required.');
  }

  const admin = createSupabaseAdminClient();
  const tokenHash = await hashDeviceToken(token);

  const { data, error } = await admin
    .from('ide_agent_devices')
    .select('id, user_id, name, status')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (error) {
    throw new ApiError(500, 'Could not verify the agent device token.');
  }
  if (!data || data.status === 'revoked') {
    throw new ApiError(401, 'This agent device token is not valid or has been revoked.');
  }

  return {
    admin,
    deviceId: data.id as string,
    userId: data.user_id as string,
    deviceName: data.name as string,
  };
}

/** Mark the device as seen, activating it on its first successful poll. */
export async function touchDevice(
  ctx: AgentContext,
  details: { platform?: string; agentVersion?: string; workspaceRoot?: string }
): Promise<void> {
  await ctx.admin
    .from('ide_agent_devices')
    .update({
      status: 'active',
      last_seen_at: new Date().toISOString(),
      platform: details.platform ?? null,
      agent_version: details.agentVersion ?? null,
      workspace_root: details.workspaceRoot ?? null,
    })
    .eq('id', ctx.deviceId)
    .eq('user_id', ctx.userId);
}

/**
 * Confirm a project belongs to the device owner before the agent may act on it.
 * Without this, a valid token for user A could reference user B's project id.
 */
export async function requireAgentProject(
  ctx: AgentContext,
  projectId: string
): Promise<{ id: string; name: string; workspace_hint: string | null }> {
  const { data, error } = await ctx.admin
    .from('ide_projects')
    .select('id, name, workspace_hint')
    .eq('id', projectId)
    .eq('user_id', ctx.userId)
    .maybeSingle();

  if (error) throw new ApiError(500, 'Could not load the project.');
  if (!data) throw new ApiError(404, 'Project not found for this device.');

  return data as { id: string; name: string; workspace_hint: string | null };
}

/* ------------------------------------------------------------------ */
/* Liveness                                                            */
/* ------------------------------------------------------------------ */

/**
 * Is one of this user's local agents currently polling?
 *
 * A device is considered online if it checked in within
 * AGENT_ONLINE_WINDOW_MS. The agent polls far more often than that, so a
 * missed window means the process is genuinely gone rather than merely busy.
 *
 * Single definition on purpose: the answer decides what the AI agent is told
 * it can do, whether a queued run is described as starting now or later, and
 * whether a command is refused outright. Three copies of this rule drifting
 * apart is how an interface ends up claiming a test ran when nothing did.
 */
export async function isAgentOnline(ctx: AuthedContext): Promise<boolean> {
  const { data } = await ctx.supabase
    .from('ide_agent_devices')
    .select('last_seen_at')
    .eq('user_id', ctx.userId)
    .eq('status', 'active')
    .order('last_seen_at', { ascending: false, nullsFirst: false })
    .limit(1);

  const lastSeen = (data ?? [])[0]?.last_seen_at as string | undefined;
  return isFreshHeartbeat(lastSeen);
}

/** Pure form of the freshness rule, so it can be tested without a database. */
export function isFreshHeartbeat(
  lastSeenAt: string | null | undefined,
  now: number = Date.now()
): boolean {
  if (!lastSeenAt) return false;

  const seen = new Date(lastSeenAt).getTime();
  if (Number.isNaN(seen)) return false;

  // A clock-skewed future timestamp is still a heartbeat that just arrived.
  if (seen > now) return true;

  return now - seen <= AGENT_ONLINE_WINDOW_MS;
}
