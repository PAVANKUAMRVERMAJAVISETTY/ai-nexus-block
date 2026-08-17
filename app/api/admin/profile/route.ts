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
      return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 });
    }

    // Verify admin role
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userProfile?.role !== 'admin' && userProfile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    const { data: siteProfile } = await supabase
      .from('site_profile')
      .select('*')
      .eq('profile_key', 'owner')
      .maybeSingle();

    return NextResponse.json({ profile: siteProfile || {} });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error.' }, { status: 500 });
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
      return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 });
    }

    // Verify admin role
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userProfile?.role !== 'admin' && userProfile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    const body = await request.json();

    const skillsArray = typeof body.skills === 'string'
      ? body.skills.split(',').map((s: string) => s.trim()).filter(Boolean)
      : Array.isArray(body.skills) ? body.skills : [];

    const profileData = {
      profile_key: 'owner',
      full_name: body.full_name || body.name || 'Naga Pavan Kumar Javisetty',
      professional_title: body.professional_title || body.role || 'AI-Focused Full-Stack Developer & Systems Architect',
      profile_photo_url: body.profile_photo_url || body.avatar_url || null,
      short_bio: body.short_bio || '',
      full_bio: body.full_bio || body.bio || '',
      skills: skillsArray,
      github_url: body.github_url || null,
      linkedin_url: body.linkedin_url || null,
      website_url: body.website_url || null,
      resume_url: body.resume_url || null,
      is_public: body.is_public !== false,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    };

    const { data: updated, error } = await supabase
      .from('site_profile')
      .upsert(profileData, { onConflict: 'profile_key' })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message || 'Failed to update site profile.' }, { status: 400 });
    }

    // Also update public.profiles for backward compatibility
    await supabase
      .from('profiles')
      .update({
        display_name: profileData.full_name,
        avatar_url: profileData.profile_photo_url,
        bio: profileData.short_bio,
        skills: skillsArray,
        github_profile_url: profileData.github_url,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    return NextResponse.json({ success: true, profile: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error.' }, { status: 500 });
  }
}
