'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { PublicShell } from '@/components/layout/public-shell';
import { AuthModal } from '@/components/modals/auth-modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { AdminWrapper, AdminEditButton } from '@/components/admin';
import { CoreCompetencies } from '@/components/home/CoreCompetencies';
import { PlatformGateways } from '@/components/home/PlatformGateways';
import { Bot, Sparkles, ArrowRight, FileText } from 'lucide-react';

export default function Home() {
  const { user, isSuperAdmin } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const [profileData, setProfileData] = useState({
    name: 'Naga Pavan Kumar Javisetty',
    title: 'AI-Focused Full-Stack Developer & Systems Architect',
    bio: 'Building autonomous agentic platforms, production-ready Next.js applications, and high-performance cloud databases with Supabase RLS policies.',
    photo_url: '/naga-pavan-profile.jpg',
    status: '🟢 Available for Architecture & AI Consulting',
  });

  const fetchProfile = () => {
    fetch('/api/profile')
      .then((res) => res.json())
      .then((json) => {
        const p = json.profile || json.data;
        if (p) {
          setProfileData((prev) => ({
            ...prev,
            name: p.display_name || p.full_name || p.name || prev.name,
            title: p.headline || p.title || prev.title,
            bio: p.bio || p.summary || prev.bio,
            photo_url: p.profile_photo_url || p.avatar_url || p.image_url || prev.photo_url,
          }));
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleStartChatting = () => {
    if (user) {
      const copilotBtn = document.querySelector('button[aria-label="Open AI Copilot"]') as HTMLButtonElement | null;
      if (copilotBtn) copilotBtn.click();
    } else {
      setAuthModalOpen(true);
    }
  };

  return (
    <PublicShell>
      <AdminWrapper entityType="profile">
        <div className="relative overflow-hidden bg-background">
          {/* Ambient background glow */}
          <div className="absolute left-1/2 top-0 -z-10 -translate-x-1/2 blur-3xl opacity-30 pointer-events-none">
            <div
              className="aspect-[1155/678] w-[75rem] bg-gradient-to-tr from-primary via-indigo-500 to-cyan-500"
              style={{
                clipPath:
                  'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
              }}
            />
          </div>

          {/* Dual-Column Executive Portal Hero */}
          <section className="mx-auto max-w-7xl px-4 pt-12 pb-16 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Left Column: Developer Portrait Graphic with Floating Motion */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                className="lg:col-span-5 flex flex-col items-center justify-center relative"
              >
                <div className="relative w-64 h-64 sm:w-80 sm:h-80 rounded-3xl p-2 bg-gradient-to-tr from-primary via-blue-500 to-cyan-400 shadow-2xl">
                  <div className="relative w-full h-full rounded-2xl overflow-hidden bg-card border border-border">
                    <img
                      src={profileData.photo_url}
                      alt={profileData.name}
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                    />
                  </div>

                  {/* Ambient status pill floating badge */}
                  <motion.div
                    animate={{ y: [0, -6, 0] }}
                    transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
                    className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-emerald-500/40 bg-card/90 px-4 py-1.5 text-xs font-bold text-emerald-500 shadow-xl backdrop-blur-md"
                  >
                    {profileData.status}
                  </motion.div>
                </div>
              </motion.div>

              {/* Right Column: Name, Title, Bio, & CTAs */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                className="lg:col-span-7 text-center lg:text-left space-y-6"
              >
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary shadow-sm">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Agentic Knowledge OS & Systems Architecture Platform</span>
                </div>

                <div className="space-y-2">
                  <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-tight sm:whitespace-nowrap">
                    {profileData.name}
                  </h1>

                  <p className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-primary via-blue-500 to-cyan-400 bg-clip-text text-transparent sm:whitespace-nowrap">
                    {profileData.title}
                  </p>
                </div>

                <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl">
                  {profileData.bio}
                </p>

                {/* Primary CTAs */}
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
                  <Button
                    size="lg"
                    className="gap-2 text-base px-6 shadow-lg shadow-primary/25 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90"
                    onClick={handleStartChatting}
                  >
                    <Bot className="h-5 w-5" />
                    Launch AI Copilot
                    <ArrowRight className="h-4 w-4" />
                  </Button>

                  <Button asChild variant="outline" size="lg" className="text-base px-6 border-border/80 hover:bg-muted">
                    <Link href="/projects">Explore Projects Showcase</Link>
                  </Button>

                  <Button asChild variant="secondary" size="lg" className="gap-2 text-base px-6 border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 shadow-sm">
                    <a href="/Naga_Pavan_Kumar_Javisetty_Resume.pdf" download target="_blank" rel="noopener noreferrer">
                      <FileText className="h-5 w-5" />
                      Download Resume (PDF)
                    </a>
                  </Button>

                  {/* Super Admin Edit Hero Button */}
                  <AdminEditButton
                    entityType="profile"
                    item={{
                      title: profileData.name,
                      display_name: profileData.name,
                      headline: profileData.title,
                      bio: profileData.bio,
                      profile_photo_url: profileData.photo_url,
                      image_url: profileData.photo_url,
                    }}
                    onSuccess={fetchProfile}
                  />
                </div>
              </motion.div>
            </div>

            {/* Modular 3D Core Competencies with Interactive Deep-Dive Modals */}
            <CoreCompetencies />
          </section>

          {/* Modular 3D Platform Infographic Gateways */}
          <PlatformGateways />
        </div>

        {/* Auth Modal */}
        <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} defaultTab="login" />
      </AdminWrapper>
    </PublicShell>
  );
}
