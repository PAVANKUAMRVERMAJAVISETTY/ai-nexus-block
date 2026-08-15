import { NextResponse } from "next/server";
import {
  buildNexusRuntimeContext,
  serializeNexusRuntimeContext,
} from "@/lib/ai/nexus-runtime-context";
import { buildPageAwareAgentPrompt } from "@/lib/ai/page-aware-prompt";
import { loadPublicAgentSession, savePublicAgentSession } from "@/lib/ai/public-agent-session-store";
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { generate, NoProviderConfiguredError } from '@/lib/ai/nexus-assistant';
import { getSystemPrompt } from '@/lib/ai/prompts';
import { RATE_LIMITS, hit, rateLimitHeaders } from '@/lib/security/rate-limit';
import type { AIProviderId, AIMode } from '@/types/common';
import type { AIAttachment } from '@/types/ai';
import { advanceSession, createSessionState, continueSession, resumeAfterInput, type AgentPorts, type ToolResult } from '@/lib/ai/agent-loop';
import { executeInternalWebsiteSearchTool } from '@/lib/ai/internal-search-tool';
import { searchInternalWebsite } from '@/services/internal-search';
import { webSearch } from '@/services/web-search';
import { handleAIToolMutation } from '@/services/ai/agentTools';

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    // 1. Enforce strict server-side authentication
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthenticated request. Please sign in to access the AI assistant.' },
        { status: 401 }
      );
    }

    // Model calls cost money. Limit per user before any work is done, so one
    // account cannot exhaust the shared AI budget.
    const limit = hit(`ai:${user.id}`, RATE_LIMITS.ai);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: `Too many requests. Try again in ${limit.retryAfterSeconds}s.` },
        { status: 429, headers: rateLimitHeaders(limit) }
      );
    }

    const body = await request.json();
    const pathname =
      typeof body?.pathname === "string"
        ? body.pathname
        : request.headers.get("x-nexus-pathname") ?? undefined;

    const runtimeContext = await buildNexusRuntimeContext(
      pathname,
      typeof body?.message === "string" ? body.message : undefined,
    );

    const pageAwarePrompt = buildPageAwareAgentPrompt(runtimeContext);

    const {
      message,
      mode = 'recommend_stack',
      provider = 'gemini',
      conversation_id,
      attachments = [],
    } = body;

    const normalizedAttachments: AIAttachment[] = Array.isArray(attachments)
      ? attachments
          .slice(0, 5)
          .filter((item: unknown): item is AIAttachment => {
            if (!item || typeof item !== 'object') return false;

            const candidate = item as AIAttachment;

            return (
              typeof candidate.id === 'string' &&
              typeof candidate.type === 'string' &&
              typeof candidate.file_path === 'string' &&
              typeof candidate.bucket === 'string' &&
              typeof candidate.name === 'string' &&
              typeof candidate.mime_type === 'string' &&
              candidate.bucket === 'nexus-user-attachments' &&
              candidate.file_path.startsWith(`${user.id}/`)
            );
          })
      : [];

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json(
        { error: 'Prompt message is required.' },
        { status: 400 }
      );
    }

    let activeConversationId = conversation_id;

    // 2. Ensure conversation row exists in ai_conversations table
    if (!activeConversationId) {
      const cleanMessage = message.trim();
      const lower = cleanMessage.toLowerCase();
      let title = cleanMessage.length > 45 ? cleanMessage.slice(0, 45) + '...' : cleanMessage;

      if (['hi', 'hello', 'hey', 'test', 'help', 'start'].includes(lower)) {
        title = 'New conversation';
      } else {
        title = title.charAt(0).toUpperCase() + title.slice(1);
      }

      const { data: newConv, error: convError } = await supabase
        .from('ai_conversations')
        .insert({
          user_id: user.id,
          title,
          mode: mode as AIMode,
          provider: provider as AIProviderId,
        })
        .select('id')
        .single();

      if (convError) {
        console.error('[ai-route] Failed to create conversation in Supabase:', convError.message);
      } else if (newConv) {
        activeConversationId = newConv.id;
      }
    }

    // 3. Fetch optional user profile context for AI personalization
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('display_name, education_level, degree, specialization, experience_level, skills, target_roles, learning_goals, role')
      .eq('id', user.id)
      .single();

    let profileContext = '';
    if (userProfile) {
      const parts = [];
      if (userProfile.display_name) parts.push(`User Name: ${userProfile.display_name}`);
      if (userProfile.education_level || userProfile.degree) {
        parts.push(`Education: ${userProfile.degree || userProfile.education_level}`);
      }
      if (userProfile.experience_level) parts.push(`Experience: ${userProfile.experience_level}`);
      if (Array.isArray(userProfile.skills) && userProfile.skills.length > 0) {
        parts.push(`Skills: ${userProfile.skills.join(', ')}`);
      }
      if (Array.isArray(userProfile.target_roles) && userProfile.target_roles.length > 0) {
        parts.push(`Target Roles: ${userProfile.target_roles.join(', ')}`);
      }
      if (userProfile.learning_goals) parts.push(`Learning Goals: ${userProfile.learning_goals}`);

      if (parts.length > 0) {
        profileContext = `[AI NEXUS ASSISTANT - USER PROFILE CONTEXT]\n${parts.join(' | ')}\n\n`;
      }
    }

    // 4. Persist User Message to database if conversation exists
    if (activeConversationId) {
      await supabase.from('ai_messages').insert({
        conversation_id: activeConversationId,
        role: 'user',
        content: message.trim(),
        metadata: normalizedAttachments.length
          ? { attachments: normalizedAttachments }
          : null,
      });
    }

    // 5. Run the public assistant through the Nexus agent loop.
    //
    // Phase 8 public tools:
    //   - search_internal_website
    //   - web_search
    //
    // The agent decides which tool to use, receives the result, and only
    // then produces the final response.

    // ------------------------------------------------------------
    // ------------------------------------------------------------
    // Phase 9 public agent orchestration.
    //
    // The route no longer pre-fetches data before the agent loop.
    // The model chooses a public tool, receives the observation,
    // and continues from the persisted state when another request
    // arrives for the same conversation.
    // ------------------------------------------------------------

    const normalizedMessage = message.trim();

/*
 * PHASE 9:
 * Restore the structured public agent state for this conversation.
 * If no state exists yet, create a new one.
 */
const existingSession = activeConversationId
  ? await loadPublicAgentSession(
      supabase,
      user.id,
      activeConversationId,
    )
  : null;

let state =
  existingSession?.state ??
  createSessionState(normalizedMessage);

/*
 * Continue the same agent session instead of creating
 * an unrelated state for every HTTP request.
 */
if (existingSession) {
  if (state.status === 'awaiting_input') {
    state = resumeAfterInput(state, normalizedMessage);
  } else {
    state = continueSession(state, normalizedMessage);
  }
}

/*
 * These are prompt hints only.
 * They DO NOT execute searches.
 * Tool execution happens exclusively inside publicPorts.
 */
const websiteQuestion =
  /\b(my website|my nexus|nexus website|ai nexus block|listed on|currently listed|from my website|on my website|my projects|my tools|my knowledge|my roadmaps)\b/i.test(
    normalizedMessage,
  );

const currentExternalQuestion =
  /\b(latest|current|today|now|recent|release|news|this week|this month|2026)\b/i.test(
    normalizedMessage,
  );

/*
 * Public assistant has exactly two tools.
 * No IDE tools and no website mutation tools are exposed here.
 */
const systemPrompt = [
  pageAwarePrompt,
  profileContext,
  `MODE: ${String(mode)}`,
  `You are the public AI Nexus Assistant.`,
  ``,
  `PUBLIC AGENT POLICY:`,
  `- You have tools: search_internal_website, web_search, create_tool, and create_project.`,
  `- When instructed to add or create a tool/project, use create_tool or create_project.`,
  `- Never mention or request IDE tools.`,
  `- Never invent Nexus website content.`,
  `- For Nexus website questions, ALWAYS use search_internal_website before answering.`,
  `- For external/current questions, use web_search when current external information is required.`,
  `- Internal Nexus data is the source of truth for Nexus website questions.`,
  `- Do not claim a tool ran unless its observation exists in the agent transcript.`,
  `- Do not answer Nexus website questions from memory.`,
  `- Continue through the agent loop after every tool observation.`,
  `- Use another tool when the first result is insufficient.`,
  `- Only provide the final answer when enough evidence has been gathered.`,
  websiteQuestion
    ? `THIS REQUEST IS ABOUT AI NEXUS BLOCK. Use search_internal_website first.`
    : '',
  currentExternalQuestion
    ? `THIS REQUEST MAY REQUIRE CURRENT INFORMATION. Use web_search when appropriate.`
    : '',
  ``,
  `TOOL OUTPUT FORMAT:`,
  `Emit exactly one fenced nexus-tool block for each tool request.`,
  '```nexus-tool',
  '{"tool":"search_internal_website","args":{"query":"..."}}',
  '```',
]
  .filter(Boolean)
  .join('\n\n');

const publicPorts: AgentPorts = {
  buildSystemPrompt: () => systemPrompt,

  callModel: async ({ system, messages }) => {
    const result = await generate({
      message: messages,
      system,
      mode: mode as AIMode,
      conversationId: activeConversationId,
      preferredProvider: provider as AIProviderId,
      attachments: normalizedAttachments,
      maxTokens: 8192,
    });

    return result.content;
  },

  executeTool: async (call): Promise<ToolResult> => {
    switch (call.tool) {
      case 'search_internal_website': {
        return executeInternalWebsiteSearchTool(
          String(call.args.query),
          (call.args.entity ?? 'all') as
            | 'tools'
            | 'projects'
            | 'knowledge'
            | 'roadmaps'
            | 'all',
        );
      }

      case 'web_search': {
        try {
          const result = await webSearch({
            query: String(call.args.query),
            maxResults: Number(call.args.maxResults ?? 5),
          });

          return {
            ok: true,
            content: JSON.stringify(result, null, 2),
          };
        } catch (error) {
          return {
            ok: false,
            content:
              error instanceof Error
                ? error.message
                : 'Web search failed.',
          };
        }
      }

      case 'create_tool': {
        const role = userProfile?.role || 'user';
        const res = await handleAIToolMutation('create_tool', call.args, role);
        return {
          ok: res.success,
          content: res.success ? (res.message || 'Tool created successfully.') : (res.error || 'Failed to create tool.'),
        };
      }

      case 'create_project': {
        const role = userProfile?.role || 'user';
        const res = await handleAIToolMutation('create_project', call.args, role);
        return {
          ok: res.success,
          content: res.success ? (res.message || 'Project created successfully.') : (res.error || 'Failed to create project.'),
        };
      }

      default: {
        return {
          ok: false,
          content:
            `Tool "${call.tool}" is not available in the public assistant.`,
        };
      }
    }
  },

  pollRun: async () => null,
};

const agentState = await advanceSession(
  state,
  publicPorts,
  {
    maxStepsThisCall: 8,
  },
);

/*
 * Persist the REAL structured agent state.
 * This allows the next HTTP request using the same
 * conversation_id to continue the same task.
 */
if (activeConversationId) {
  await savePublicAgentSession(
    supabase,
    user.id,
    activeConversationId,
    agentState,
  );
}
    const finalContent =
      agentState.transcript.reduce(
        (lastAssistantMessage, entry) =>
          entry.type === 'assistant' ? entry.content : lastAssistantMessage,
        '',
      ) || 'I could not complete that request.';

    const aiResult = {
      content: finalContent,
      conversationId: activeConversationId,
      tokensUsed: 0,
    };
    // 6. Persist Assistant Response to database if conversation exists
    if (activeConversationId) {
      await supabase.from('ai_messages').insert({
        conversation_id: activeConversationId,
        role: 'assistant',
        content: aiResult.content,
        tokens_used: aiResult.tokensUsed || 0,
      });

      // Update updated_at timestamp on active conversation
      await supabase
        .from('ai_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', activeConversationId);
    }

    // The backend that answered is deliberately NOT returned here — the
    // assistant is presented as "Nexus AI Assistant" everywhere in the product.
    // Provider attribution is available on admin surfaces only.
    return NextResponse.json({
      content: aiResult.content,
      conversation_id: activeConversationId || aiResult.conversationId,
      tokens_used: aiResult.tokensUsed,
    });
  } catch (error: any) {
    console.error('AI API Route Error:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred processing your AI request.' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversation_id');

    if (conversationId) {
      const { data: messages } = await supabase
        .from('ai_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      return NextResponse.json({ messages: messages || [] });
    }

    const { data: conversations } = await supabase
      .from('ai_conversations')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    return NextResponse.json({ conversations: conversations || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}











