'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { PublicShell } from '@/components/layout/public-shell';
import { AuthModal } from '@/components/modals/auth-modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/features/auth/hooks/use-auth';
import {
  Bot,
  Sparkles,
  Wrench,
  FolderGit2,
  BookOpen,
  Map,
  Compass,
  ArrowRight,
  ShieldCheck,
  Code2,
  Terminal,
  Layers,
  Cpu,
  Database,
  GitBranch,
  ExternalLink,
} from 'lucide-react';

function TiltCard({
  children,
  className = '',
  href,
}: {
  children: React.ReactNode;
  className?: string;
  href: string;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-100, 100], [8, -8]);
  const rotateY = useTransform(x, [-100, 100], [-8, 8]);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - rect.width / 2;
    const mouseY = e.clientY - rect.top - rect.height / 2;
    x.set(mouseX);
    y.set(mouseY);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div
      style={{ perspective: 1000, rotateX, rotateY }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      transition={{ type: 'spring', stiffness: 250, damping: 20 }}
      className={`h-full cursor-pointer transition-shadow hover:shadow-2xl ${className}`}
    >
      <Link href={href} className="block h-full">
        {children}
      </Link>
    </motion.div>
  );
}

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

  const gatewayCards = [
    {
      title: 'AI Tools Catalog',
      description: '50+ curated developer AI tools with pricing models, comparisons, and reviews.',
      href: '/tools',
      icon: Wrench,
      count: '50+ Tools',
      badgeColor: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      gradient: 'from-amber-500/10 via-transparent to-transparent',
    },
    {
      title: 'Projects Showcase',
      description: 'Production-ready full-stack applications, architectural designs, and case studies.',
      href: '/projects',
      icon: FolderGit2,
      count: '15+ Projects',
      badgeColor: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      gradient: 'from-emerald-500/10 via-transparent to-transparent',
    },
    {
      title: 'Knowledge Base',
      description: 'Technical articles, architecture patterns, RLS policies, and cheatsheets.',
      href: '/knowledge',
      icon: BookOpen,
      count: '25+ Guides',
      badgeColor: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      gradient: 'from-blue-500/10 via-transparent to-transparent',
    },
    {
      title: 'Engineering Roadmaps',
      description: 'Structured learning paths for AI engineering, systems design, and full-stack mastery.',
      href: '/roadmaps',
      icon: Map,
      count: '10+ Roadmaps',
      badgeColor: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      gradient: 'from-purple-500/10 via-transparent to-transparent',
    },
  ];

  return (
    <PublicShell>
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

        {/* Hero Section */}
        <section className="mx-auto max-w-7xl px-4 pt-12 pb-16 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary mb-6 shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Agentic Knowledge OS & Systems Architecture Platform</span>
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl text-foreground max-w-4xl mx-auto leading-tight">
              Javisetty Naga Pavan Kumar
            </h1>

            <p className="text-xl sm:text-2xl font-bold mt-2 bg-gradient-to-r from-primary via-blue-500 to-cyan-400 bg-clip-text text-transparent">
              AI Full Stack Developer & Systems Architect
            </p>

            <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Building autonomous agentic platforms, production-ready Next.js applications, and high-performance cloud databases with Supabase RLS.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Button size="lg" className="gap-2 text-base px-6 shadow-lg shadow-primary/25 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90" onClick={handleStartChatting}>
                <Bot className="h-5 w-5" />
                Launch AI Copilot
                <ArrowRight className="h-4 w-4" />
              </Button>

              <Button asChild variant="outline" size="lg" className="text-base px-6 border-border/80 hover:bg-muted">
                <Link href="/projects">Explore Projects Showcase</Link>
              </Button>
            </div>
          </motion.div>

          {/* Framer Motion Dual-Layout Competency Section */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mt-14 rounded-2xl border border-border/60 bg-card/60 p-6 sm:p-8 backdrop-blur-md shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-border/40 pb-4 mb-6">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Cpu className="h-5 w-5 text-primary" />
                Core Engineering Competencies
              </h2>
              <Badge variant="outline" className="text-xs">Systems Architecture</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Frontend */}
              <div className="rounded-xl border border-border/40 bg-card p-5 space-y-3 hover:border-primary/40 transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                    <Code2 className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-base">Frontend Engineering</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Next.js App Router, React Server Components, TypeScript, Tailwind CSS, Framer Motion, and responsive glassmorphism UI.
                </p>
                <div className="flex flex-wrap gap-1 pt-1">
                  <Badge variant="secondary" className="text-[10px]">Next.js 14</Badge>
                  <Badge variant="secondary" className="text-[10px]">TypeScript</Badge>
                  <Badge variant="secondary" className="text-[10px]">Tailwind</Badge>
                </div>
              </div>

              {/* Backend & DB */}
              <div className="rounded-xl border border-border/40 bg-card p-5 space-y-3 hover:border-emerald-500/40 transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                    <Database className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-base">Backend & Database</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  PostgreSQL, Supabase Auth & SSR, Row Level Security (RLS) policies, storage buckets, and serverless API endpoints.
                </p>
                <div className="flex flex-wrap gap-1 pt-1">
                  <Badge variant="secondary" className="text-[10px]">PostgreSQL</Badge>
                  <Badge variant="secondary" className="text-[10px]">Supabase RLS</Badge>
                  <Badge variant="secondary" className="text-[10px]">REST/GraphQL</Badge>
                </div>
              </div>

              {/* AI Systems */}
              <div className="rounded-xl border border-border/40 bg-card p-5 space-y-3 hover:border-purple-500/40 transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
                    <Cpu className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-base">AI Systems & RAG</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  11-provider AI cascade, vector retrieval (RAG), local-first prompt engineering, and autonomous agent loops.
                </p>
                <div className="flex flex-wrap gap-1 pt-1">
                  <Badge variant="secondary" className="text-[10px]">Multi-LLM</Badge>
                  <Badge variant="secondary" className="text-[10px]">Local RAG</Badge>
                  <Badge variant="secondary" className="text-[10px]">Groq / Gemini</Badge>
                </div>
              </div>

              {/* Sandbox & Deployments */}
              <div className="rounded-xl border border-border/40 bg-card p-5 space-y-3 hover:border-amber-500/40 transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                    <GitBranch className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-base">Sandbox & Deployments</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Web-based Monaco code editor IDE, automated CI/CD, GitHub integrations, and downloadable source packages.
                </p>
                <div className="flex flex-wrap gap-1 pt-1">
                  <Badge variant="secondary" className="text-[10px]">Monaco IDE</Badge>
                  <Badge variant="secondary" className="text-[10px]">GitHub CI/CD</Badge>
                  <Badge variant="secondary" className="text-[10px]">Vercel</Badge>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* 3D Tilt Gateway Navigation Section */}
        <section className="border-t border-border/40 bg-muted/20 py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <h2 className="text-3xl font-bold tracking-tight text-foreground">
                Platform Gateways
              </h2>
              <p className="text-muted-foreground mt-2 text-sm">
                Explore curated developer toolsets, engineering roadmaps, and full-stack project showcases.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {gatewayCards.map((card) => {
                const Icon = card.icon;
                return (
                  <TiltCard key={card.href} href={card.href}>
                    <div className={`relative h-full rounded-2xl border border-border/60 bg-gradient-to-b ${card.gradient} bg-card p-6 flex flex-col justify-between space-y-4 hover:border-primary/50 transition-all`}>
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                            <Icon className="h-6 w-6" />
                          </div>
                          <Badge variant="outline" className={`text-xs font-semibold ${card.badgeColor}`}>
                            {card.count}
                          </Badge>
                        </div>
                        <h3 className="text-lg font-bold text-foreground">{card.title}</h3>
                        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                          {card.description}
                        </p>
                      </div>

                      <div className="flex items-center text-xs font-semibold text-primary pt-2">
                        <span>Explore section</span>
                        <ArrowRight className="h-3.5 w-3.5 ml-1 transition-transform group-hover:translate-x-1" />
                      </div>
                    </div>
                  </TiltCard>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      {/* Auth Modal */}
      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} defaultTab="login" />
    </PublicShell>
  );
}
