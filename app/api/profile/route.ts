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
