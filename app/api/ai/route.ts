import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { generate, NoProviderConfiguredError } from '@/lib/ai/nexus-assistant';
import { getSystemPrompt } from '@/lib/ai/prompts';
import { RATE_LIMITS, hit, rateLimitHeaders } from '@/lib/security/rate-limit';
import type { AIProviderId, AIMode } from '@/types/common';
import { needsWebSearch } from '@/services/web-search/intent';
import { webSearch } from '@/services/web-search';
import { formatWebSearchContext } from '@/services/web-search/context';

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
    const { message, mode = 'recommend_stack', provider = 'gemini', conversation_id } = body;

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
      .select('display_name, education_level, degree, specialization, experience_level, skills, target_roles, learning_goals')
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
      });
    }

    // 5. Generate the response as the Nexus AI Assistant.
    //    The backend is chosen from whichever providers are actually
    //    configured, so a missing key degrades to another vendor instead of
    //    surfacing a provider-branded error to the user.
    let webSearchContext = '';

    if (needsWebSearch(message.trim(), mode as AIMode)) {
      try {
        const searchResponse = await webSearch({
          query: message.trim(),
          maxResults: 5,
        });

        webSearchContext = formatWebSearchContext(searchResponse.results);
      } catch (searchError) {
        console.error('[ai-route] Web search failed:', searchError);
      }
    }
    let aiResult;
    try {
      aiResult = await generate({
        message: [
          profileContext,
          webSearchContext
            ? `[WEB SEARCH CONTEXT]
${webSearchContext}
[/WEB SEARCH CONTEXT]`
            : '',
          `User Prompt: ${message.trim()}`,
        ]
          .filter(Boolean)
          .join("\n\n"),
        mode: mode as AIMode,
        system: getSystemPrompt(mode),
        conversationId: activeConversationId,
        preferredProvider: provider as AIProviderId,
      });
    } catch (error) {
      if (error instanceof NoProviderConfiguredError) {
        return NextResponse.json({ error: error.message }, { status: 503 });
      }
      throw error;
    }

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
