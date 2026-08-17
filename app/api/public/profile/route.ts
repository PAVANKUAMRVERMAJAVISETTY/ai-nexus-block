import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export interface PublicProfileResponse {
  full_name: string;
  professional_title: string;
  profile_photo_url: string | null;
  short_bio: string;
  full_bio: string | null;
  skills: string[];
  github_url: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  resume_url: string | null;
}

const DEFAULT_PUBLIC_PROFILE: PublicProfileResponse = {
  full_name: 'Naga Pavan Kumar Javisetty',
  professional_title: 'AI-Focused Full-Stack Developer & Systems Architect',
  profile_photo_url: '/naga-pavan-profile.jpg',
  short_bio: 'Building autonomous agentic platforms, production-ready Next.js applications, and high-performance cloud databases with Supabase RLS policies.',
  full_bio: 'AI-focused Full-Stack Developer with a B.Tech in CSE and extensive hands-on experience building production-ready, enterprise-grade web applications, real-time marketplaces, and ERP systems using React 19, Next.js, TypeScript, Supabase, PostgreSQL, and RLS security.',
  skills: ['React 19', 'Next.js', 'TypeScript', 'Supabase', 'PostgreSQL', 'RLS Security', 'TanStack Router/Start', 'Tailwind CSS', 'Razorpay API', 'PKZip Archiver', 'Haversine Algorithm', 'AI Workflows (Cline, Roo Code, Cursor, OpenRouter)'],
  github_url: 'https://github.com/PAVANKUAMRVERMAJAVISETTY',
  linkedin_url: 'https://linkedin.com',
  website_url: 'https://ai-nexus-block.vercel.app/',
  resume_url: '/Naga_Pavan_Kumar_Javisetty_Resume.pdf',
};

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    // 1. Try querying public.site_profile where profile_key = 'owner'
    const { data: siteProfile } = await supabase
      .from('site_profile')
      .select('full_name, professional_title, profile_photo_url, short_bio, full_bio, skills, github_url, linkedin_url, website_url, resume_url, is_public')
      .eq('profile_key', 'owner')
      .maybeSingle();

    if (siteProfile && siteProfile.is_public !== false) {
      const skillsArray = Array.isArray(siteProfile.skills)
        ? siteProfile.skills.map((s: any) => (typeof s === 'string' ? s : s.name || String(s)))
        : DEFAULT_PUBLIC_PROFILE.skills;

      return NextResponse.json({
        profile: {
          full_name: siteProfile.full_name || DEFAULT_PUBLIC_PROFILE.full_name,
          professional_title: siteProfile.professional_title || DEFAULT_PUBLIC_PROFILE.professional_title,
          profile_photo_url: siteProfile.profile_photo_url || null,
          short_bio: siteProfile.short_bio || DEFAULT_PUBLIC_PROFILE.short_bio,
          full_bio: siteProfile.full_bio || DEFAULT_PUBLIC_PROFILE.full_bio,
          skills: skillsArray,
          github_url: siteProfile.github_url || DEFAULT_PUBLIC_PROFILE.github_url,
          linkedin_url: siteProfile.linkedin_url || DEFAULT_PUBLIC_PROFILE.linkedin_url,
          website_url: siteProfile.website_url || DEFAULT_PUBLIC_PROFILE.website_url,
          resume_url: siteProfile.resume_url || null,
        },
      });
    }

    // 2. Fallback to admin row in public.profiles table
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('display_name, avatar_url, bio, skills, github_profile_url')
      .or('role.eq.admin,role.eq.super_admin')
      .limit(1)
      .maybeSingle();

    if (adminProfile) {
      return NextResponse.json({
        profile: {
          full_name: adminProfile.display_name || DEFAULT_PUBLIC_PROFILE.full_name,
          professional_title: DEFAULT_PUBLIC_PROFILE.professional_title,
          profile_photo_url: adminProfile.avatar_url || null,
          short_bio: adminProfile.bio || DEFAULT_PUBLIC_PROFILE.short_bio,
          full_bio: adminProfile.bio || DEFAULT_PUBLIC_PROFILE.full_bio,
          skills: Array.isArray(adminProfile.skills) ? adminProfile.skills : DEFAULT_PUBLIC_PROFILE.skills,
          github_url: adminProfile.github_profile_url || DEFAULT_PUBLIC_PROFILE.github_url,
          linkedin_url: DEFAULT_PUBLIC_PROFILE.linkedin_url,
          website_url: DEFAULT_PUBLIC_PROFILE.website_url,
          resume_url: null,
        },
      });
    }

    return NextResponse.json({ profile: DEFAULT_PUBLIC_PROFILE });
  } catch (error) {
    return NextResponse.json({ profile: DEFAULT_PUBLIC_PROFILE });
  }
}
