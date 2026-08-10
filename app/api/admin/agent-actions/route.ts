import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden: Super Admin access required.' }, { status: 403 });
    }

    const { data: actions, error } = await supabase
      .from('agent_change_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ actions: actions || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
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
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden: Super Admin access required.' }, { status: 403 });
    }

    const body = await request.json();
    const { action_type, target_type = 'website', target_id, title = 'Proposed Website Update', proposed_change } = body;

    if (!action_type || !proposed_change) {
      return NextResponse.json({ error: 'action_type and proposed_change are required.' }, { status: 400 });
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
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ action: newAction });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
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
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden: Super Admin access required.' }, { status: 403 });
    }

    const body = await request.json();
    const { id, status, result, error_message } = body;

    if (!id || !['pending', 'approved', 'rejected', 'applied', 'failed'].includes(status)) {
      return NextResponse.json({ error: 'Invalid ID or status.' }, { status: 400 });
    }

    const updatePayload: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'approved' || status === 'applied') {
      updatePayload.approved_at = new Date().toISOString();
      updatePayload.approved_by = user.id;
    }
    if (result) updatePayload.result = result;
    if (error_message) updatePayload.error_message = error_message;

    const { data: updatedAction, error } = await supabase
      .from('agent_change_requests')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ action: updatedAction });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
