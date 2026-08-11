import { NextResponse } from 'next/server';
import { ApiError, readJsonBody, toErrorResponse } from '@/lib/ide/api';
import { requireAgentDevice, touchDevice } from '@/lib/ide/agent-auth';
import {
  AGENT_PROTOCOL_VERSION,
  UnsafeCommandError,
  validateCommand,
  type AgentPollResponse,
  type AgentRunAssignment,
  type GitOperationPayload,
} from '@/lib/ide/agent-protocol';
import { runDefaults } from '@/config/ide';
import { buildGitArgv, requiresCredential, validateGitOperation } from '@/lib/ide/git-protocol';
import { decryptSecret } from '@/lib/security/crypto';

export const dynamic = 'force-dynamic';

const MAX_CLAIM_PER_POLL = 3;

/**
 * POST /api/ide/agent/poll
 *
 * Called on a short interval by the Nexus Local Development Agent.
 * Authenticated by device token only — no user session is involved.
 * Returns queued runs for the device owner and claims them atomically enough
 * that a second agent polling concurrently will not pick up the same work.
 */
export async function POST(request: Request) {
  try {
    const ctx = await requireAgentDevice(request);
    const body = await readJsonBody(request);

    await touchDevice(ctx, {
      platform: typeof body.platform === 'string' ? body.platform.slice(0, 120) : undefined,
      agentVersion:
        typeof body.agentVersion === 'string' ? body.agentVersion.slice(0, 40) : undefined,
      workspaceRoot:
        typeof body.workspaceRoot === 'string' ? body.workspaceRoot.slice(0, 400) : undefined,
    });

    const capacity = Math.max(
      0,
      Math.min(MAX_CLAIM_PER_POLL, typeof body.capacity === 'number' ? body.capacity : 1)
    );

    // Cancellations for runs this device already owns.
    const { data: cancelRows } = await ctx.admin
      .from('ide_project_runs')
      .select('id')
      .eq('user_id', ctx.userId)
      .eq('device_id', ctx.deviceId)
      .eq('cancel_requested', true)
      .in('status', ['claimed', 'running']);

    const cancellations = ((cancelRows ?? []) as { id: string }[]).map((row) => row.id);

    const assignments: AgentRunAssignment[] = [];

    if (capacity > 0) {
      const { data: queued, error } = await ctx.admin
        .from('ide_project_runs')
        .select('id, project_id, command, kind, operation')
        .eq('user_id', ctx.userId)
        .eq('status', 'queued')
        .order('created_at', { ascending: true })
        .limit(capacity);

      if (error) throw new ApiError(500, 'Could not read the run queue.');

      const projectIds = Array.from(
        new Set(((queued ?? []) as { project_id: string }[]).map((r) => r.project_id))
      );

      const projectsById = new Map<string, { name: string; workspace_hint: string | null }>();
      if (projectIds.length) {
        const { data: projects } = await ctx.admin
          .from('ide_projects')
          .select('id, name, workspace_hint')
          .eq('user_id', ctx.userId)
          .in('id', projectIds);

        for (const project of (projects ?? []) as {
          id: string;
          name: string;
          workspace_hint: string | null;
        }[]) {
          projectsById.set(project.id, {
            name: project.name,
            workspace_hint: project.workspace_hint,
          });
        }
      }

      for (const run of (queued ?? []) as {
        id: string;
        project_id: string;
        command: string;
        kind: string;
        operation: Record<string, unknown> | null;
      }[]) {
        const project = projectsById.get(run.project_id);
        // A run whose project vanished (or never belonged to this user) is dropped.
        if (!project) {
          await ctx.admin
            .from('ide_project_runs')
            .update({
              status: 'error',
              stderr: 'Project is no longer available.',
              finished_at: new Date().toISOString(),
            })
            .eq('id', run.id)
            .eq('user_id', ctx.userId);
          continue;
        }

        // A structured Git operation takes the typed path: argv is rebuilt from
        // validated fields, so commit messages containing shell metacharacters
        // are carried safely instead of being rejected by the string validator.
        let argv: string[];
        let gitOperation: GitOperationPayload | null = null;
        let gitCredential: { username: string; token: string } | null = null;

        if (run.operation) {
          try {
            const operation = validateGitOperation(run.operation);
            gitOperation = operation as unknown as GitOperationPayload;
            argv = ['git', ...buildGitArgv(operation)];

            // Attach a credential ONLY for operations that reach the remote,
            // and only for this response. It is never written to the queue row.
            if (requiresCredential(operation.op)) {
              const { data: connection } = await ctx.admin
                .from('ide_user_connections')
                .select('access_token_encrypted, status')
                .eq('user_id', ctx.userId)
                .eq('provider', 'github')
                .maybeSingle();

              if (connection?.access_token_encrypted && connection.status === 'connected') {
                try {
                  gitCredential = {
                    username: 'x-access-token',
                    token: decryptSecret(connection.access_token_encrypted as string),
                  };
                } catch {
                  // Undecryptable credential: let git fail with a clear auth
                  // error rather than handing over a broken token.
                }
              }
            }
          } catch (error) {
            await ctx.admin
              .from('ide_project_runs')
              .update({
                status: 'error',
                stderr:
                  error instanceof Error ? error.message : 'Git operation rejected.',
                finished_at: new Date().toISOString(),
              })
              .eq('id', run.id)
              .eq('user_id', ctx.userId);
            continue;
          }

          const { data: claimedGit } = await ctx.admin
            .from('ide_project_runs')
            .update({
              status: 'claimed',
              device_id: ctx.deviceId,
              claimed_at: new Date().toISOString(),
            })
            .eq('id', run.id)
            .eq('user_id', ctx.userId)
            .eq('status', 'queued')
            .select('id')
            .maybeSingle();

          if (!claimedGit) continue;

          assignments.push({
            runId: run.id,
            projectId: run.project_id,
            projectName: project.name,
            workspaceDir: project.workspace_hint || run.project_id,
            command: run.command,
            argv,
            kind: 'git',
            timeoutMs: runDefaults.timeoutMs,
            gitOperation,
            gitCredential,
            // A clone creates the workspace; other git ops run in an existing one.
            syncWorkspace: false,
          });
          continue;
        }

        // Re-validate at hand-off. The command was checked when queued, but the
        // agent must never receive work that would not pass the allowlist now.
        try {
          argv = validateCommand(run.command).argv;
        } catch (error) {
          const message =
            error instanceof UnsafeCommandError ? error.message : 'Command rejected.';
          await ctx.admin
            .from('ide_project_runs')
            .update({
              status: 'error',
              stderr: message,
              exit_code: null,
              finished_at: new Date().toISOString(),
            })
            .eq('id', run.id)
            .eq('user_id', ctx.userId);
          continue;
        }

        // Claim it. The `.eq('status','queued')` guard means a concurrent poll
        // that already claimed this row updates nothing and gets no assignment.
        const { data: claimed } = await ctx.admin
          .from('ide_project_runs')
          .update({
            status: 'claimed',
            device_id: ctx.deviceId,
            claimed_at: new Date().toISOString(),
          })
          .eq('id', run.id)
          .eq('user_id', ctx.userId)
          .eq('status', 'queued')
          .select('id')
          .maybeSingle();

        if (!claimed) continue;

        assignments.push({
          runId: run.id,
          projectId: run.project_id,
          projectName: project.name,
          workspaceDir: project.workspace_hint || run.project_id,
          command: run.command,
          argv,
          kind: run.kind as AgentRunAssignment['kind'],
          timeoutMs: runDefaults.timeoutMs,
          syncWorkspace: true,
        });
      }
    }

    const response: AgentPollResponse = {
      protocolVersion: AGENT_PROTOCOL_VERSION,
      deviceId: ctx.deviceId,
      runs: assignments,
      cancellations,
    };

    return NextResponse.json(response);
  } catch (error) {
    return toErrorResponse(error);
  }
}
