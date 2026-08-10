import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/conversations/[id]
 * Fetch a single conversation and its messages for the authenticated owner.
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthenticated request. Please sign in.' },
        { status: 401 }
      );
    }

    const conversationId = params.id;
    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID is required.' },
        { status: 400 }
      );
    }

    // 1. Verify ownership & fetch conversation
    const { data: conversation, error: convError } = await supabase
      .from('ai_conversations')
      .select('id, user_id, title, mode, provider, is_archived, created_at, updated_at')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (convError || !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found.' },
        { status: 404 }
      );
    }

    // 2. Fetch associated messages ordered created_at ASC
    const { data: messages, error: msgError } = await supabase
      .from('ai_messages')
      .select('id, conversation_id, role, content, tokens_used, metadata, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (msgError) {
      console.error('Fetch messages error:', msgError);
    }

    return NextResponse.json({
      conversation,
      messages: messages || [],
    });
  } catch (error: any) {
    console.error('GET /api/conversations/[id] error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error.' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/conversations/[id]
 * Rename a conversation title for the authenticated owner.
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthenticated request. Please sign in.' },
        { status: 401 }
      );
    }

    const conversationId = params.id;
    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID is required.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { title } = body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json(
        { error: 'New conversation title is required.' },
        { status: 400 }
      );
    }

    // Update conversation if owned by user
    const { data: updatedConv, error } = await supabase
      .from('ai_conversations')
      .update({
        title: title.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .select('id, user_id, title, mode, provider, is_archived, created_at, updated_at')
      .single();

    if (error || !updatedConv) {
      return NextResponse.json(
        { error: 'Conversation not found or update unauthorized.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ conversation: updatedConv });
  } catch (error: any) {
    console.error('PATCH /api/conversations/[id] error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error.' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/conversations/[id]
 * Delete a conversation and its cascaded messages for the authenticated owner.
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthenticated request. Please sign in.' },
        { status: 401 }
      );
    }

    const conversationId = params.id;
    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID is required.' },
        { status: 400 }
      );
    }

    const { error, count } = await supabase
      .from('ai_conversations')
      .delete({ count: 'exact' })
      .eq('id', conversationId)
      .eq('user_id', user.id);

    if (error) {
      console.error('DELETE conversation error:', error);
      return NextResponse.json(
        { error: 'Failed to delete conversation.' },
        { status: 500 }
      );
    }

    if (count === 0) {
      return NextResponse.json(
        { error: 'Conversation not found or delete unauthorized.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE /api/conversations/[id] error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error.' },
      { status: 500 }
    );
  }
}
