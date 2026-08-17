import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

const DEFAULT_PROFILE = {
  id: 'owner',
  full_name: 'Naga Pavan Kumar Javisetty',
  display_name: 'Naga Pavan Kumar Javisetty',
  name: 'Naga Pavan Kumar Javisetty',
  professional_title: 'AI-Focused Full-Stack Developer & Systems Architect',
  headline: 'AI-Focused Full-Stack Developer & Systems Architect',
  title: 'AI-Focused Full-Stack Developer & Systems Architect',
  bio: 'Building autonomous agentic platforms, production-ready Next.js applications, and high-performance cloud databases with Supabase RLS policies.',
  short_bio: 'Building autonomous agentic platforms, production-ready Next.js applications, and high-performance cloud databases with Supabase RLS policies.',
  full_bio: 'AI-focused Full-Stack Developer with a B.Tech in CSE and extensive hands-on experience building production-ready, enterprise-grade web applications, real-time marketplaces, and ERP systems using React 19, Next.js, TypeScript, Supabase, PostgreSQL, and RLS security.',
  profile_photo_url: '/naga-pavan-profile.jpg',
  avatar_url: '/naga-pavan-profile.jpg',
  image_url: '/naga-pavan-profile.jpg',
  photo_url: '/naga-pavan-profile.jpg',
  resume_url: '/Naga_Pavan_Kumar_Javisetty_Resume.pdf',
  status: '🟢 Available for Architecture & AI Consulting',
};

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        const merged = {
          ...DEFAULT_PROFILE,
          ...profile,
          display_name: profile.display_name || profile.full_name || DEFAULT_PROFILE.display_name,
          headline: profile.headline || profile.professional_title || DEFAULT_PROFILE.headline,
          bio: profile.bio || DEFAULT_PROFILE.bio,
          profile_photo_url: profile.profile_photo_url || profile.avatar_url || DEFAULT_PROFILE.profile_photo_url,
          avatar_url: profile.avatar_url || profile.profile_photo_url || DEFAULT_PROFILE.avatar_url,
        };
        return NextResponse.json({ success: true, profile: merged, data: merged }, { status: 200 });
      }
    }

    return NextResponse.json({ success: true, profile: DEFAULT_PROFILE, data: DEFAULT_PROFILE }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ success: true, profile: DEFAULT_PROFILE, data: DEFAULT_PROFILE }, { status: 200 });
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

    const payload = await request.json();

    const fullName = payload.title || payload.full_name || payload.name || payload.display_name;
    const profTitle = payload.category || payload.professional_title || payload.headline || payload.title;
    const shortBio = payload.description || payload.shortDescription || payload.short_bio || payload.bio;
    const fullBio = payload.content || payload.richContent || payload.full_bio || payload.long_description || shortBio;
    const photoUrl = payload.image_url || payload.imageUrl || payload.profile_photo_url;

    const updateFields: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (fullName) {
      updateFields.display_name = fullName;
    }
    if (profTitle) {
      updateFields.headline = profTitle;
    }
    if (shortBio) {
      updateFields.bio = shortBio;
    }
    if (photoUrl) {
      updateFields.profile_photo_url = photoUrl;
      updateFields.avatar_url = photoUrl;
    }

    const { data: updatedProfile, error } = await supabase
      .from('profiles')
      .update(updateFields)
      .eq('id', user.id)
      .select('*')
      .single();

    if (error) {
      console.warn('[profile-route] Profiles table update notice:', error.message);
    }

    try {
      await supabase
        .from('site_profile')
        .upsert(
          {
            profile_key: 'owner',
            full_name: fullName,
            professional_title: profTitle,
            short_bio: shortBio,
            bio: shortBio,
            full_bio: fullBio,
            profile_photo_url: photoUrl,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'profile_key' }
        );
    } catch {
      // Ignored if site_profile table is not created in current migration
    }

    revalidatePath('/');
    revalidatePath('/profile');
    revalidatePath('/admin/profile');

    const resultData = updatedProfile || {
      display_name: fullName,
      headline: profTitle,
      bio: shortBio,
      profile_photo_url: photoUrl,
    };

    return NextResponse.json({ success: true, profile: resultData, data: resultData }, { status: 200 });
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
