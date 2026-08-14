import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  approveWebsiteChangeRequest,
  rejectWebsiteChangeRequest,
} from '@/lib/ai/website-write-approval';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthenticated' },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden: Super Admin access required.' },
        { status: 403 }
      );
    }

    const { data: actions, error } = await supabase
      .from('agent_change_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ actions: actions || [] });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Server error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthenticated' },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden: Super Admin access required.' },
        { status: 403 }
      );
    }

    const body = await request.json();

    const {
      action_type,
      target_type = 'website',
      target_id,
      title = 'Proposed Website Update',
      proposed_change,
    } = body;

    if (!action_type || !proposed_change) {
      return NextResponse.json(
        {
          error:
            'action_type and proposed_change are required.',
        },
        { status: 400 }
      );
    }

    const { data: newAction, error } = await supabase
      .from('agent_change_requests')
      .insert({
        requested_by: user.id,
        action_type,
        target_type,
        target_id,
        title,
        proposed_change,
        status: 'pending',
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      action: newAction,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Server error',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthenticated' },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden: Super Admin access required.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, status } = body;

    if (!id || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        {
          error:
            'For website changes, status must be "approved" or "rejected".',
        },
        { status: 400 }
      );
    }

    if (status === 'approved') {
      const action = await approveWebsiteChangeRequest(id);

      return NextResponse.json({
        action,
        applied: action.status === 'applied',
      });
    }

    const action = await rejectWebsiteChangeRequest(id);

    return NextResponse.json({
      action,
      applied: false,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Server error',
      },
      { status: 500 }
    );
  }
}
