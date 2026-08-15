'use client';

import { useState } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Code2,
  Database,
  Cpu,
  GitBranch,
  X,
  Sparkles,
  CheckCircle2,
  Terminal,
  ExternalLink,
  Layers,
  ShieldCheck,
  Server,
  Workflow,
  Zap,
} from 'lucide-react';

interface CompetencyDetail {
  id: string;
  title: string;
  subtitle: string;
  icon: any;
  color: string;
  badgeColor: string;
  description: string;
  keyFeatures: string[];
  architectureDiagram: string;
  codeSnippet: string;
}

const competenciesData: CompetencyDetail[] = [
  {
    id: 'frontend',
    title: 'Frontend Engineering',
    subtitle: 'Next.js App Router & Glassmorphic UI',
    icon: Code2,
    color: 'from-blue-500/20 via-cyan-500/10 to-transparent',
    badgeColor: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    description:
      'Engineered with Next.js 14 App Router, React Server Components (RSC), TypeScript strict type system, Tailwind CSS, Framer Motion 3D perspective transforms, and responsive dark-mode glassmorphism.',
    keyFeatures: [
      'Next.js 14 App Router with Parallel Route Groups',
      'React Server Components & Granular Suspense Boundaries',
      'Framer Motion 3D Perspective Tilt Physics',
      'Tailwind CSS Design System with Dark/Light Tokens',
    ],
    architectureDiagram: `[User Browser] -> [RSC Server Component] -> [Client Hydration]
                             |
                   [Next.js App Router]
                             |
                  [Monaco Editor / Framer]`,
    codeSnippet: `// Next.js App Router React Server Component Pattern
export default async function Page() {
  const data = await fetchDirectFromSupabase();
  return (
    <Suspense fallback={<SkeletonLoader />}>
      <GlassmorphicView data={data} />
    </Suspense>
  );
}`,
  },
  {
    id: 'backend',
    title: 'Backend & Database',
    subtitle: 'PostgreSQL & Supabase RLS Policies',
    icon: Database,
    color: 'from-emerald-500/20 via-teal-500/10 to-transparent',
    badgeColor: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    description:
      'High-performance PostgreSQL database architecture with Supabase Auth SSR cookies, strict Row Level Security (RLS) policies for user data isolation, and serverless edge API endpoints.',
    keyFeatures: [
      'PostgreSQL Schema with Foreign Keys & Indexes',
      'Supabase Auth with SSR Cookie Middleware Sync',
      'Granular Row Level Security (RLS) Policy Guardrails',
      'Supabase Storage Buckets for Public/Private Media',
    ],
    architectureDiagram: `[API Route Handler] -> [Supabase SSR Client] -> [PostgreSQL DB]
                             |                           |
                 [User Session Cookie]           [RLS Enforcement]`,
    codeSnippet: `-- Row Level Security (RLS) Policy Example
CREATE POLICY "Super Admins Full Access" ON nexus_tools
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );`,
  },
  {
    id: 'ai',
    title: 'AI Systems & RAG',
    subtitle: '11-Provider Cascade & Agent Tool Calling',
    icon: Cpu,
    color: 'from-purple-500/20 via-indigo-500/10 to-transparent',
    badgeColor: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    description:
      'Multi-LLM cascade routing supporting Gemini, OpenAI, Claude, DeepSeek, and Groq with local-first vector RAG retrieval, page-aware prompt engineering, and autonomous site mutation tool execution.',
    keyFeatures: [
      'Sequential Latency & Health Fallback AI Routing',
      'Page-Aware Context Injection & User Personalization',
      'Autonomous Site Mutation Tool Calling (create_tool/project)',
      'Vector Search & RAG Embeddings for Instant Discovery',
    ],
    architectureDiagram: `[User Prompt] -> [Page-Aware Prompt] -> [Provider Cascade Engine]
                                               |
                          [Gemini] -> [OpenAI] -> [Claude] -> [Groq]
                                               |
                                     [Tool Calling / RAG]`,
    codeSnippet: `// 11-LLM Cascade Routing Engine
export async function executeAICascade(prompt: string) {
  const providers = ['gemini', 'openai', 'claude', 'groq'];
  for (const provider of providers) {
    try {
      return await callProvider(provider, prompt);
    } catch (err) {
      console.warn(\`\${provider} failed, cascading...\`);
    }
  }
}`,
  },
  {
    id: 'sandbox',
    title: 'Sandbox & Deployments',
    subtitle: 'Monaco Editor IDE & GitHub Vercel CI/CD',
    icon: GitBranch,
    color: 'from-amber-500/20 via-orange-500/10 to-transparent',
    badgeColor: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    description:
      'Embedded browser IDE with Monaco Editor code execution, real-time preview, automated GitHub CI/CD workflows, downloadable PDF/SQL/ZIP assets, and instant Vercel edge deployment.',
    keyFeatures: [
      'Embedded Monaco Editor IDE with Syntax Highlighting',
      'Automated GitHub Actions CI/CD Pipeline',
      'Instant Production Deployment on Vercel Edge',
      'Downloadable Code Archives (.ZIP) & SQL Schemas',
    ],
    architectureDiagram: `[Monaco Code Editor] -> [Web Container Execution]
                                 |
                      [GitHub Push / Webhook]
                                 |
                      [Vercel Production Edge]`,
    codeSnippet: `// Vercel Edge CI/CD Workflow Trigger
on:
  push:
    branches: [ main ]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm run build
      - run: npx vercel --prod`,
  },
];

function Competency3DCard({
  item,
  onClick,
}: {
  item: CompetencyDetail;
  onClick: () => void;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-80, 80], [10, -10]);
  const rotateY = useTransform(x, [-80, 80], [-10, 10]);

  const Icon = item.icon;

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
      onClick={onClick}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="group relative cursor-pointer rounded-2xl border border-border/60 bg-card p-6 shadow-lg transition-all duration-300 hover:border-primary/50 hover:shadow-2xl"
    >
      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${item.color} opacity-0 transition-opacity duration-500 group-hover:opacity-100 pointer-events-none`} />

      <div className="relative z-10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="p-3 rounded-xl bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
            <Icon className="h-6 w-6" />
          </div>
          <Badge variant="outline" className={`text-[11px] font-semibold ${item.badgeColor}`}>
            Click for Deep Dive
          </Badge>
        </div>

        <div>
          <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
            {item.title}
          </h3>
          <p className="text-xs font-semibold text-muted-foreground mt-0.5">
            {item.subtitle}
          </p>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
          {item.description}
        </p>

        <div className="pt-2 flex items-center text-xs font-semibold text-primary group-hover:translate-x-1 transition-transform">
          <span>View Architecture & Code</span>
          <Sparkles className="h-3.5 w-3.5 ml-1" />
        </div>
      </div>
    </motion.div>
  );
}

export function CoreCompetencies() {
  const [selectedCompetency, setSelectedCompetency] = useState<CompetencyDetail | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.2 }}
      className="mt-16 rounded-3xl border border-border/60 bg-card/60 p-6 sm:p-10 backdrop-blur-md shadow-2xl"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-border/40 pb-5 mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2 text-foreground">
            <Cpu className="h-6 w-6 text-primary" />
            Core Engineering Competencies
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Click any competency card to open the architectural deep-dive modal with system flows & code samples.
          </p>
        </div>
        <Badge variant="outline" className="text-xs font-bold px-3 py-1 bg-primary/10 text-primary border-primary/30">
          3D Perspective Interactive
        </Badge>
      </div>

      {/* 4 Clickable 3D Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {competenciesData.map((item) => (
          <Competency3DCard key={item.id} item={item} onClick={() => setSelectedCompetency(item)} />
        ))}
      </div>

      {/* Deep-Dive Modal */}
      {selectedCompetency && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-3xl max-h-[90vh] bg-card border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border/60 p-5 bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                  <selectedCompetency.icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-foreground">{selectedCompetency.title}</h3>
                  <p className="text-xs text-muted-foreground">{selectedCompetency.subtitle}</p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedCompetency(null)}
                className="rounded-full"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-foreground">
              {/* Description */}
              <p className="text-sm text-muted-foreground leading-relaxed">
                {selectedCompetency.description}
              </p>

              {/* Key Features */}
              <div>
                <h4 className="font-bold text-sm mb-3 flex items-center gap-1.5 text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Key Architectural Features
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedCompetency.keyFeatures.map((feat) => (
                    <div key={feat} className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/40 border border-border/40">
                      <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="font-medium text-xs">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Architecture Diagram */}
              <div>
                <h4 className="font-bold text-sm mb-2 flex items-center gap-1.5 text-foreground">
                  <Workflow className="h-4 w-4 text-cyan-500" />
                  System Flow Diagram
                </h4>
                <pre className="p-4 rounded-xl bg-muted/80 border border-border/60 text-[11px] font-mono leading-relaxed text-cyan-400 overflow-x-auto">
                  {selectedCompetency.architectureDiagram}
                </pre>
              </div>

              {/* Code Snippet */}
              <div>
                <h4 className="font-bold text-sm mb-2 flex items-center gap-1.5 text-foreground">
                  <Terminal className="h-4 w-4 text-amber-500" />
                  Implementation Pattern Code Sample
                </h4>
                <pre className="p-4 rounded-xl bg-muted/90 border border-border/80 text-[11px] font-mono leading-relaxed text-emerald-400 overflow-x-auto">
                  {selectedCompetency.codeSnippet}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-border/60 p-4 bg-muted/20 flex justify-end">
              <Button onClick={() => setSelectedCompetency(null)} className="px-6">
                Close Breakdown
              </Button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
