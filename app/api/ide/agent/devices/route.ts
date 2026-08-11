import { NextResponse } from 'next/server';
import {
  ApiError,
  describeDbError,
  isUuid,
  optionalString,
  readJsonBody,
  requireUser,
  toErrorResponse,
} from '@/lib/ide/api';
import { generateDeviceToken, hashDeviceToken } from '@/lib/ide/agent-auth';
import { AGENT_ONLINE_WINDOW_MS } from '@/lib/ide/agent-protocol';
import { isServiceRoleConfigured } from '@/lib/supabase/admin';
import type { IdeAgentDevice, IdeAgentStatus } from '@/types/ide';

export const dynamic = 'force-dynamic';

/** Columns safe to return to the browser. `token_hash` is never selected. */
const DEVICE_COLUMNS =
  'id, user_id, name, token_prefix, status, platform, agent_version, workspace_root, last_seen_at, revoked_at, created_at, updated_at';

/** GET /api/ide/agent/devices — paired devices and overall connection status. */
export async function GET() {
  try {
    const ctx = await requireUser();

    const { data, error } = await ctx.supabase
      .from('ide_agent_devices')
      .select(DEVICE_COLUMNS)
      .eq('user_id', ctx.userId)
      .neq('status', 'revoked')
      .order('last_seen_at', { ascending: false, nullsFirst: false });

    if (error) throw new ApiError(500, describeDbError(error));

    const devices = (data ?? []) as unknown as IdeAgentDevice[];

    // The freshest device decides whether the IDE shows "connected".
    let best: IdeAgentDevice | null = null;
    let bestAge: number | null = null;

    for (const device of devices) {
      if (!device.last_seen_at) continue;
      const age = Date.now() - new Date(device.last_seen_at).getTime();
      if (bestAge === null || age < bestAge) {
        best = device;
        bestAge = age;
      }
    }

    const status: IdeAgentStatus = {
      connected: bestAge !== null && bestAge <= AGENT_ONLINE_WINDOW_MS,
      device: best ?? devices[0] ?? null,
      lastSeenSecondsAgo: bestAge === null ? null : Math.round(bestAge / 1000),
      serverConfigured: isServiceRoleConfigured(),
    };

    return NextResponse.json({ devices, status });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/**
 * POST /api/ide/agent/devices — issue a new device token.
 * The plaintext token is returned exactly once and only its hash is stored.
 */
export async function POST(request: Request) {
  try {
    const ctx = await requireUser();

    if (!isServiceRoleConfigured()) {
      throw new ApiError(
        503,
        'This server cannot accept local agents yet. An administrator must set SUPABASE_SERVICE_ROLE_KEY.'
      );
    }

    const body = await readJsonBody(request);
    const name = optionalString(body, 'name', 80) ?? 'Local Agent';

    const { token, prefix } = generateDeviceToken();
    const tokenHash = await hashDeviceToken(token);

    const { data, error } = await ctx.supabase
      .from('ide_agent_devices')
      .insert({
        user_id: ctx.userId,
        name,
        token_hash: tokenHash,
        token_prefix: prefix,
        status: 'pending',
      })
      .select(DEVICE_COLUMNS)
      .single();

    if (error) throw new ApiError(400, describeDbError(error));

    return NextResponse.json(
      {
        device: data,
        // Shown once in the pairing dialog, then discarded by the client.
        token,
        warning: 'Copy this token now. It cannot be shown again.',
      },
      { status: 201 }
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** DELETE /api/ide/agent/devices?id=<uuid> — revoke a device immediately. */
export async function DELETE(request: Request) {
  try {
    const ctx = await requireUser();

    const deviceId = new URL(request.url).searchParams.get('id');
    if (!isUuid(deviceId)) throw new ApiError(400, 'A valid device id is required.');

    const { data, error } = await ctx.supabase
      .from('ide_agent_devices')
      .update({ status: 'revoked', revoked_at: new Date().toISOString() })
      .eq('id', deviceId)
      .eq('user_id', ctx.userId)
      .select('id')
      .maybeSingle();

    if (error) throw new ApiError(400, describeDbError(error));
    if (!data) throw new ApiError(404, 'Device not found.');

    return NextResponse.json({ success: true, revoked: data.id });
  } catch (error) {
    return toErrorResponse(error);
  }
}
