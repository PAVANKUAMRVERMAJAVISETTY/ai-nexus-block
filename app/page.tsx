'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { PublicShell } from '@/components/layout/public-shell';
import { AuthModal } from '@/components/modals/auth-modal';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { siteConfig } from '@/config/site';
import { Bot, Sparkles, Wrench, FolderGit2, BookOpen, Map, ArrowRight, ShieldCheck } from 'lucide-react';

export default function Home() {
  const { user } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const handleStartChatting = () => {
    if (user) {
      window.location.href = '/assistant';
    } else {
      setAuthModalOpen(true);
    }
  };

  return (
    <PublicShell>
      <div className="relative overflow-hidden bg-background">
        {/* Background glow gradient */}
        <div className="absolute left-1/2 top-0 -z-10 -translate-x-1/2 blur-3xl opacity-30 pointer-events-none">
          <div
            className="aspect-[1155/678] w-[72rem] bg-gradient-to-tr from-primary to-blue-600"
            style={{
              clipPath:
                'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
            }}
          />
        </div>

        {/* Hero Section */}
        <section className="mx-auto max-w-7xl px-4 pt-16 pb-20 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Agentic Knowledge OS & Developer Sandbox</span>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl text-foreground max-w-4xl mx-auto leading-tight">
            Discover AI Tools, Document Projects & Chat with Intelligence
          </h1>

          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {siteConfig.description}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button size="lg" className="gap-2 text-base px-6 shadow-lg shadow-primary/20" onClick={handleStartChatting}>
              <Bot className="h-5 w-5" />
              Start Chatting
              <ArrowRight className="h-4 w-4" />
            </Button>

            <Button asChild variant="outline" size="lg" className="text-base px-6">
              <Link href="/tools">Explore AI Tools</Link>
            </Button>
          </div>

          {/* Quick stats / Features bar */}
          <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-4 max-w-4xl mx-auto">
            <div className="rounded-xl border border-border/40 bg-card/50 p-4 text-center backdrop-blur-sm">
              <Wrench className="h-6 w-6 text-primary mx-auto mb-2" />
              <h3 className="font-bold text-lg text-foreground">50+ AI Tools</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Curated developer toolset</p>
            </div>
            <div className="rounded-xl border border-border/40 bg-card/50 p-4 text-center backdrop-blur-sm">
              <FolderGit2 className="h-6 w-6 text-primary mx-auto mb-2" />
              <h3 className="font-bold text-lg text-foreground">Projects</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Showcase & architecture</p>
            </div>
            <div className="rounded-xl border border-border/40 bg-card/50 p-4 text-center backdrop-blur-sm">
              <BookOpen className="h-6 w-6 text-primary mx-auto mb-2" />
              <h3 className="font-bold text-lg text-foreground">Knowledge</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Articles & deep dives</p>
            </div>
            <div className="rounded-xl border border-border/40 bg-card/50 p-4 text-center backdrop-blur-sm">
              <Map className="h-6 w-6 text-primary mx-auto mb-2" />
              <h3 className="font-bold text-lg text-foreground">Roadmaps</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Learning paths</p>
            </div>
          </div>
        </section>

        {/* Feature Highlights Section */}
        <section className="border-t border-border/40 bg-muted/20 py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-3xl font-bold tracking-tight text-foreground">
                Intelligent Workspace & Admin Control
              </h2>
              <p className="text-muted-foreground mt-2">
                Built with strict role-based authorization, Supabase SSR authentication, and real-time AI assistant integrations.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="rounded-xl border border-border/40 bg-card p-6 shadow-sm">
                <Bot className="h-8 w-8 text-primary mb-4" />
                <h3 className="text-lg font-semibold text-foreground">AI Assistant</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Get personalized recommendations, debug complex code, compare developer tools, and plan software projects effortlessly.
                </p>
              </div>

              <div className="rounded-xl border border-border/40 bg-card p-6 shadow-sm">
                <ShieldCheck className="h-8 w-8 text-primary mb-4" />
                <h3 className="text-lg font-semibold text-foreground">Role-Based Security</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Server-side authorization enforced with Supabase RLS and middleware. Normal user vs Super Admin access control.
                </p>
              </div>

              <div className="rounded-xl border border-border/40 bg-card p-6 shadow-sm">
                <Sparkles className="h-8 w-8 text-primary mb-4" />
                <h3 className="text-lg font-semibold text-foreground">Developer Sandbox</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Track architectural decisions, save tools, organize notes, and maintain a living developer portfolio.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Auth Modal for unauthenticated visitors */}
      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} defaultTab="login" />
    </PublicShell>
  );
}
