import type { SupabaseClient } from '@supabase/supabase-js';
import type { AgentSessionState } from '@/lib/ai/agent-loop';

export interface PublicAgentSessionRow {
  id: string;
  conversation_id: string;
  user_id: string;
  state: AgentSessionState;
  status: string;
  created_at: string;
  updated_at: string;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function restorePublicAgentState(
  value: unknown,
): AgentSessionState | null {
  if (!isObject(value)) return null;

  if (
    typeof value.goal !== 'string' ||
    typeof value.status !== 'string' ||
    !Array.isArray(value.transcript)
  ) {
    return null;
  }

  if (
    typeof value.iterations !== 'number' ||
    typeof value.toolCalls !== 'number' ||
    typeof value.repairAttempts !== 'number'
  ) {
    return null;
  }

  return value as unknown as AgentSessionState;
}

export async function loadPublicAgentSession(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string,
): Promise<PublicAgentSessionRow | null> {
  const { data, error } = await supabase
    .from('ai_public_agent_sessions')
    .select('*')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205') {
      throw new Error(
        'The public agent session table is missing. Apply supabase/migrations/20260814_nexus_public_agent_sessions.sql first.',
      );
    }

    throw new Error(`Failed to load public agent session: ${error.message}`);
  }

  if (!data) return null;

  const state = restorePublicAgentState(data.state);

  if (!state) {
    throw new Error('Stored public agent session state is invalid.');
  }

  return {
    ...(data as Omit<PublicAgentSessionRow, 'state'>),
    state,
  };
}

export async function savePublicAgentSession(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string,
  state: AgentSessionState,
): Promise<void> {
  const { error } = await supabase
    .from('ai_public_agent_sessions')
    .upsert(
      {
        conversation_id: conversationId,
        user_id: userId,
        state,
        status: state.status,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'conversation_id',
      },
    );

  if (error) {
    throw new Error(`Failed to save public agent session: ${error.message}`);
  }
}
