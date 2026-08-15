import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

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
        { success: false, error: 'Unauthenticated request.' },
        { status: 401 }
      );
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Profile not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, profile, data: profile }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error.' },
      { status: 500 }
    );
  }
}

async function handleProfileUpdate(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthenticated request.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { role, id, created_at, email, ...updateFields } = body;

    const { data: updatedProfile, error } = await supabase
      .from('profiles')
      .update({
        ...updateFields,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to update profile.' },
        { status: 400 }
      );
    }

    revalidatePath('/');
    revalidatePath('/admin/profile');

    return NextResponse.json({ success: true, profile: updatedProfile, data: updatedProfile }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  return handleProfileUpdate(request);
}

export async function PUT(request: Request) {
  return handleProfileUpdate(request);
}

export async function POST(request: Request) {
  return handleProfileUpdate(request);
}
