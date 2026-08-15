'use client';

import { useState, useEffect } from 'react';
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
  Workflow,
  ShieldCheck,
  Copy,
  Check,
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
  guardrails: string[];
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
    guardrails: [
      'Zero unescaped JSX entities allowed during production builds.',
      'Strict Server Components for initial payload reduction.',
      'Client component isolation at leaf nodes to optimize hydration.',
      'Accessibility (a11y) ARIA attributes on all interactive triggers.',
    ],
    architectureDiagram: `[User Browser] ---> [Next.js 14 App Router] ---> [React Server Component]
                             |                            |
                 [Glassmorphism Hydration]       [Supabase SSR Session]
                             |                            |
                  [Framer Motion 3D Lab]        [Edge Asset Downloader]`,
    codeSnippet: `// Next.js App Router React Server Component Pattern
import { Suspense } from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function CompetencyLabPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from('nexus_tools').select('*');

  return (
    <Suspense fallback={<div className="animate-pulse h-64 bg-card rounded-2xl" />}>
      <GlassmorphicGrid items={data ?? []} />
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
    guardrails: [
      'Every Supabase table MUST have Row Level Security enabled.',
      'Service role client restricted exclusively to server-side mutations.',
      'Cascade foreign key deletes on relational dependencies.',
      'Automatic revalidatePath() cache invalidation on database mutations.',
    ],
    architectureDiagram: `[Serverless API Route] ---> [Supabase Auth SSR Cookie]
                             |
                   [PostgreSQL Engine]
                             |
             [Row Level Security (RLS) Policy]
                             |
                 [Authenticated Payload Data]`,
    codeSnippet: `-- Supabase Row Level Security (RLS) Policy Definition
ALTER TABLE nexus_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON nexus_projects
  FOR SELECT USING (true);

CREATE POLICY "Super Admins Full Mutation Access" ON nexus_projects
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
    guardrails: [
      'Rate-limiting enforced per user ID prior to provider invocation.',
      'Strict fallback routing sequence when primary AI provider hits 429/500.',
      'Autonomous site mutations gated strictly to verified super_admin role.',
      'JSON schema validation on all tool execution arguments.',
    ],
    architectureDiagram: `[User Prompt] ---> [Page-Aware Context] ---> [AI Provider Cascade]
                                                    |
                          [Gemini 1.5 Pro] -> [OpenAI GPT-4o] -> [Claude 3.5]
                                                    |
                                      [Autonomous Agent Tool Loop]`,
    codeSnippet: `// 11-LLM Cascade Fallback Execution Loop
export async function runAICascade(prompt: string, context: string) {
  const cascade = ['gemini', 'openai', 'claude', 'deepseek', 'groq'];
  for (const provider of cascade) {
    try {
      const response = await callAIProvider(provider, prompt, context);
      if (response.ok) return response.data;
    } catch (err) {
      console.warn(\`Provider \${provider} degraded, cascading to next...\`);
    }
  }
  throw new Error('All AI providers exhausted.');
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
    guardrails: [
      'Monaco web workers loaded securely from local public route.',
      'Zero build warning tolerance enforced during Vercel builds.',
      'Main & feature branch sync validation prior to release.',
      'Automated smoke test verification on edge API routes.',
    ],
    architectureDiagram: `[Monaco Code Sandbox] ---> [Browser Execution Engine]
                                   |
                       [GitHub Push / Pull Request]
                                   |
                       [Vercel Production Edge Deployment]`,
    codeSnippet: `# GitHub Actions Automated CI/CD & Typecheck Pipeline
name: Deploy AI Nexus Platform
on:
  push:
    branches: [ main ]
jobs:
  verify-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install Dependencies
        run: npm ci
      - name: Run Typecheck
        run: npm run typecheck
      - name: Production Build
        run: npm run build`,
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
  const rotateX = useTransform(y, [-100, 100], [12, -12]);
  const rotateY = useTransform(x, [-100, 100], [-12, 12]);

  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const Icon = item.icon;

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - rect.width / 2;
    const mouseY = e.clientY - rect.top - rect.height / 2;
    x.set(mouseX);
    y.set(mouseY);
    setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

  function handleMouseEnter() {
    setIsHovered(true);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
    setIsHovered(false);
  }

  return (
    <motion.div
      style={{ perspective: 1000, rotateX, rotateY }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      transition={{ type: 'spring', stiffness: 280, damping: 18 }}
      className="group relative cursor-pointer rounded-2xl border border-border/60 bg-card p-6 shadow-lg transition-all duration-300 hover:border-primary/60 hover:shadow-2xl overflow-hidden"
    >
      {/* Dynamic Cursor-Following Radial Glow */}
      {isHovered && (
        <div
          className="pointer-events-none absolute -inset-px rounded-2xl opacity-100 transition-opacity duration-300"
          style={{
            background: `radial-gradient(320px circle at ${cursorPos.x}px ${cursorPos.y}px, rgba(59, 130, 246, 0.18), transparent 80%)`,
          }}
        />
      )}

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
  const [activeTab, setActiveTab] = useState<'flow' | 'guardrails' | 'code'>('flow');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedCompetency(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
            Click any competency card to open the tabbed architectural deep-dive modal with flows, guardrails & code snippets.
          </p>
        </div>
        <Badge variant="outline" className="text-xs font-bold px-3 py-1 bg-primary/10 text-primary border-primary/30">
          Modi-Style 3D Tilt & Glow
        </Badge>
      </div>

      {/* 4 Clickable 3D Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {competenciesData.map((item) => (
          <Competency3DCard key={item.id} item={item} onClick={() => { setSelectedCompetency(item); setActiveTab('flow'); }} />
        ))}
      </div>

      {/* Interactive Tabbed Deep-Dive Modal */}
      {selectedCompetency && (
        <div
          onClick={() => setSelectedCompetency(null)}
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-4xl max-h-[90vh] bg-card border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col"
          >
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

            {/* Interactive Tabs Header */}
            <div className="flex items-center gap-2 px-6 pt-4 border-b border-border/40 bg-muted/10">
              <button
                type="button"
                onClick={() => setActiveTab('flow')}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-t-xl border-t border-x transition-all ${
                  activeTab === 'flow'
                    ? 'bg-card text-primary border-border border-b-transparent shadow-sm'
                    : 'text-muted-foreground hover:text-foreground border-transparent'
                }`}
              >
                <Workflow className="h-3.5 w-3.5 text-cyan-500" />
                System Flow Diagram
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('guardrails')}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-t-xl border-t border-x transition-all ${
                  activeTab === 'guardrails'
                    ? 'bg-card text-primary border-border border-b-transparent shadow-sm'
                    : 'text-muted-foreground hover:text-foreground border-transparent'
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                Architectural Guardrails
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('code')}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-t-xl border-t border-x transition-all ${
                  activeTab === 'code'
                    ? 'bg-card text-primary border-border border-b-transparent shadow-sm'
                    : 'text-muted-foreground hover:text-foreground border-transparent'
                }`}
              >
                <Terminal className="h-3.5 w-3.5 text-amber-500" />
                Code Snippets
              </button>
            </div>

            {/* Modal Body Content Based on Active Tab */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-foreground">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {selectedCompetency.description}
              </p>

              {activeTab === 'flow' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <h4 className="font-bold text-sm flex items-center gap-1.5 text-foreground">
                    <Workflow className="h-4 w-4 text-cyan-500" />
                    Interactive Architectural Flow Diagram
                  </h4>
                  <pre className="p-5 rounded-2xl bg-muted/90 border border-border/80 text-[11px] font-mono leading-relaxed text-cyan-400 overflow-x-auto shadow-inner">
                    {selectedCompetency.architectureDiagram}
                  </pre>
                </div>
              )}

              {activeTab === 'guardrails' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <h4 className="font-bold text-sm flex items-center gap-1.5 text-foreground">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    Enforced System Guardrails & Key Features
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedCompetency.keyFeatures.map((feat) => (
                      <div key={feat} className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20">
                        <Sparkles className="h-4 w-4 text-primary shrink-0" />
                        <span className="font-bold text-xs">{feat}</span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2 pt-2">
                    <h5 className="font-bold text-xs text-muted-foreground uppercase tracking-wider">Production Strict Policies:</h5>
                    <div className="space-y-2">
                      {selectedCompetency.guardrails.map((rule) => (
                        <div key={rule} className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/40 border border-border/40">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span className="text-xs text-foreground leading-relaxed">{rule}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'code' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm flex items-center gap-1.5 text-foreground">
                      <Terminal className="h-4 w-4 text-amber-500" />
                      Production Implementation Pattern Snippet
                    </h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyCode(selectedCompetency.codeSnippet)}
                      className="gap-1.5 text-xs font-semibold"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? 'Copied!' : 'Copy Code'}
                    </Button>
                  </div>

                  <pre className="p-5 rounded-2xl bg-muted/95 border border-border/80 text-[11px] font-mono leading-relaxed text-emerald-400 overflow-x-auto shadow-inner">
                    {selectedCompetency.codeSnippet}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-border/60 p-4 bg-muted/20 flex justify-end gap-3">
              <Button onClick={() => setSelectedCompetency(null)} className="px-6 font-semibold">
                Close Breakdown
              </Button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
