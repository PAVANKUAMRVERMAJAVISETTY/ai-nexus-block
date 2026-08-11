import { NextResponse } from 'next/server';
import {
  ApiError,
  describeDbError,
  isUuid,
  readJsonBody,
  requireProject,
  enforceRateLimit,
  requireString,
  requireUser,
  toErrorResponse,
  type AuthedContext,
} from '@/lib/ide/api';
import { generate, NoProviderConfiguredError } from '@/lib/ai/nexus-assistant';
import { buildIdeSystemPrompt } from '@/lib/ai/ide-prompts';
import { parseProposal, ProposalParseError } from '@/lib/ide/actions';
import {
  buildProjectIndex,
  renderIndexForPrompt,
  selectRelevantFiles,
} from '@/lib/ide/indexer';
import { loadIndexableFiles } from '@/lib/ide/index-service';
import { normalizeProjectPath } from '@/lib/ide/paths';
import {
  defaultAssistantMode,
  defaultExplanationLevel,
  ideAssistantModes,
  proposingModes,
} from '@/config/ide';
import type {
  IdeAssistantMode,
  IdeExplanationLevel,
  IdeFile,
  IdeProject,
} from '@/types/ide';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Assemble the user's learning-journey context from the existing profile
 * tables, so the IDE assistant is aware of what they are actually learning.
 */
async function loadLearnerContext(ctx: AuthedContext): Promise<string | null> {
  const { data: profile } = await ctx.supabase
    .from('profiles')
    .select('display_name, experience_level, skills, target_roles, learning_goals, specialization')
    .eq('id', ctx.userId)
    .maybeSingle();

  if (!profile) return null;

  const parts: string[] = [];
  if (profile.experience_level) parts.push(`Experience level: ${profile.experience_level}`);
  if (profile.specialization) parts.push(`Specialization: ${profile.specialization}`);
  if (Array.isArray(profile.skills) && profile.skills.length) {
    parts.push(`Known technologies: ${profile.skills.join(', ')}`);
  }
  if (Array.isArray(profile.target_roles) && profile.target_roles.length) {
    parts.push(`Working toward: ${profile.target_roles.join(', ')}`);
  }
  if (profile.learning_goals) parts.push(`Current learning goals: ${profile.learning_goals}`);

  return parts.length ? parts.join('\n') : null;
}

/** Render selected files into the prompt, respecting the context budget. */
function renderFileContext(files: IdeFile[]): string {
  if (!files.length) return '';
  return files
    .map(
      (file) =>
        `--- ${file.file_path} (${file.language}, ${file.size} bytes) ---\n${file.content ?? ''}`
    )
    .join('\n\n');
}

/** Load the failing run the user asked the assistant to explain. */
async function loadErrorContext(
  ctx: AuthedContext,
  projectId: string,
  runId: string
): Promise<string | null> {
  const { data: run } = await ctx.supabase
    .from('ide_project_runs')
    .select('command, status, exit_code, stdout, stderr, duration_ms')
    .eq('id', runId)
    .eq('project_id', projectId)
    .eq('user_id', ctx.userId)
    .maybeSingle();

  if (!run) return null;

  return [
    `Command: ${run.command}`,
    `Status: ${run.status}`,
    `Exit code: ${run.exit_code ?? 'n/a'}`,
    `Duration: ${run.duration_ms ?? 'n/a'}ms`,
    '',
    'STDOUT:',
    (run.stdout as string)?.slice(-6000) || '(empty)',
    '',
    'STDERR:',
    (run.stderr as string)?.slice(-6000) || '(empty)',
  ].join('\n');
}

/**
 * POST /api/ide/assistant
 *
 * The IDE's assistant endpoint. Assembles project-aware context, calls the
 * Nexus AI Assistant, and — for modes that permit it — stores any change
 * proposal as a PENDING action. Nothing is written to the project here.
 */
export async function POST(request: Request) {
  try {
    const ctx = await requireUser();
    // Model calls cost money — limit before any work is done.
    enforceRateLimit(ctx.userId, 'ai');

    const body = await readJsonBody(request);

    const projectId = body.projectId;
    if (!isUuid(projectId)) throw new ApiError(400, 'A valid projectId is required.');

    const project = (await requireProject(ctx, projectId)) as IdeProject;
    const message = requireString(body, 'message', 8000);

    const mode: IdeAssistantMode = ideAssistantModes.some((m) => m.id === body.mode)
      ? (body.mode as IdeAssistantMode)
      : defaultAssistantMode;

    const level: IdeExplanationLevel = ['beginner', 'intermediate', 'advanced'].includes(
      body.level as string
    )
      ? (body.level as IdeExplanationLevel)
      : defaultExplanationLevel;

    const scope = (body.scope ?? {}) as Record<string, unknown>;
    const allowProposals = proposingModes.has(mode) && body.allowProposals !== false;

    // --- context assembly ------------------------------------------------
    const files = await loadIndexableFiles(ctx, project.id);
    const bundle = buildProjectIndex(project, files);

    let activeFilePath: string | null = null;
    if (typeof scope.activeFilePath === 'string' && scope.activeFilePath) {
      try {
        activeFilePath = normalizeProjectPath(scope.activeFilePath);
      } catch {
        activeFilePath = null;
      }
    }

    const relevantFiles = selectRelevantFiles(files, message, activeFilePath);

    let errorContext: string | null = null;
    if (typeof scope.runId === 'string' && isUuid(scope.runId)) {
      errorContext = await loadErrorContext(ctx, project.id, scope.runId);
    }

    const system = buildIdeSystemPrompt({
      mode,
      level,
      projectContext: renderIndexForPrompt(bundle),
      fileContext: renderFileContext(relevantFiles),
      selection: typeof scope.selection === 'string' ? scope.selection.slice(0, 12000) : null,
      selectionPath: activeFilePath,
      errorContext,
      learnerContext: await loadLearnerContext(ctx),
      allowProposals,
    });

    // --- conversation ----------------------------------------------------
    let conversationId: string | null = isUuid(body.conversationId)
      ? (body.conversationId as string)
      : null;

    if (!conversationId) {
      const title = `IDE · ${project.name} · ${message.slice(0, 40)}`;
      const { data: conversation } = await ctx.supabase
        .from('ai_conversations')
        .insert({
          user_id: ctx.userId,
          title: title.slice(0, 80),
          mode: 'debug_problem',
          provider: 'gemini',
        })
        .select('id')
        .single();

      conversationId = conversation?.id ?? null;
    }

    if (conversationId) {
      await ctx.supabase.from('ai_messages').insert({
        conversation_id: conversationId,
        role: 'user',
        content: message,
        metadata: { source: 'nexus-ide', project_id: project.id, mode, level },
      });
    }

    // --- generation ------------------------------------------------------
    let result;
    try {
      result = await generate({
        message,
        system,
        mode: 'debug_problem',
        conversationId: conversationId ?? undefined,
        maxTokens: allowProposals ? 8192 : 4096,
      });
    } catch (error) {
      if (error instanceof NoProviderConfiguredError) {
        throw new ApiError(503, error.message);
      }
      throw error;
    }

    // --- proposal --------------------------------------------------------
    let action = null;
    let displayContent = result.content;
    const warnings: string[] = [];

    if (allowProposals) {
      try {
        const proposal = parseProposal(result.content);

        if (proposal) {
          displayContent = proposal.displayContent;
          warnings.push(...proposal.warnings);

          // Capture the current content of every touched file so the review
          // UI can render a real diff and the audit trail records the before state.
          const beforeState: Record<string, string | null> = {};
          for (const operation of proposal.change.operations) {
            const existing = files.find((f) => f.file_path === operation.path);
            if (existing) {
              beforeState[operation.path] = existing.content ?? '';
              operation.previousContent = existing.content ?? '';
            } else {
              const { data: fetched } = await ctx.supabase
                .from('ide_project_files')
                .select('content')
                .eq('project_id', project.id)
                .eq('file_path', operation.path)
                .maybeSingle();

              beforeState[operation.path] = (fetched?.content as string) ?? null;
              operation.previousContent = (fetched?.content as string) ?? null;
            }
          }

          const { data: created, error: actionError } = await ctx.supabase
            .from('ide_agent_actions')
            .insert({
              project_id: project.id,
              requested_by: ctx.userId,
              conversation_id: conversationId,
              action_type: mode,
              title: proposal.title,
              summary: proposal.summary,
              risk: proposal.risk,
              proposed_change: proposal.change,
              files_affected: proposal.change.operations.map((op) => op.path),
              before_state: beforeState,
              status: 'pending',
              provider_used: result.debugProvider,
            })
            .select('*')
            .single();

          if (actionError) {
            warnings.push(`The change proposal could not be saved: ${describeDbError(actionError)}`);
          } else {
            action = created;
          }
        }
      } catch (error) {
        if (error instanceof ProposalParseError) {
          // The prose answer is still useful even when the machine-readable
          // part was malformed — surface both rather than failing the request.
          warnings.push(error.message);
        } else {
          throw error;
        }
      }
    }

    if (conversationId) {
      await ctx.supabase.from('ai_messages').insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: displayContent,
        tokens_used: result.tokensUsed,
        metadata: {
          source: 'nexus-ide',
          project_id: project.id,
          mode,
          action_id: action?.id ?? null,
        },
      });

      await ctx.supabase
        .from('ai_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);
    }

    // Provider attribution is returned but must only be rendered for admins.
    const { data: profile } = await ctx.supabase
      .from('profiles')
      .select('role')
      .eq('id', ctx.userId)
      .maybeSingle();

    const isAdmin = profile?.role === 'super_admin';

    return NextResponse.json({
      content: displayContent,
      conversationId,
      action,
      warnings,
      contextFilesUsed: relevantFiles.map((f) => f.file_path),
      ...(isAdmin ? { debugProvider: result.debugProvider, debugModel: result.debugModel } : {}),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
