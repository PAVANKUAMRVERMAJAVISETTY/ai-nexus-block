'use client';

import { useState } from 'react';
import { PageContainer, PageHeader } from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Code2,
  Database,
  Cpu,
  ShieldCheck,
  Zap,
  Globe,
  CheckCircle2,
  ArrowRight,
  Server,
  Terminal,
  Activity,
} from 'lucide-react';

export default function ArchitecturePage() {
  const [selectedNode, setSelectedNode] = useState<'client' | 'supabase' | 'ai' | 'rag'>('client');
  const [isSimulating, setIsSimulating] = useState(false);
  const [activeStep, setActiveStep] = useState<number | null>(null);

  const runFlowSimulation = () => {
    setIsSimulating(true);
    setActiveStep(1);

    setTimeout(() => setActiveStep(2), 1000);
    setTimeout(() => setActiveStep(3), 2000);
    setTimeout(() => setActiveStep(4), 3000);
    setTimeout(() => {
      setActiveStep(null);
      setIsSimulating(false);
    }, 4200);
  };

  const nodeDetails = {
    client: {
      title: '1. Client Layer (Next.js App Router)',
      tech: ['Next.js 14', 'React Server Components', 'Tailwind CSS', 'Framer Motion', 'Monaco IDE'],
      summary: 'Client browser sends requests using React Server Components or fetch calls to API routes. Protected routes are checked via SSR Auth cookies.',
    },
    supabase: {
      title: '2. Backend & Security (Supabase PostgreSQL + RLS)',
      tech: ['PostgreSQL 15', 'Supabase Auth', 'Security Definer Functions', 'RLS Policies', 'Storage Buckets'],
      summary: 'PostgreSQL evaluates Row Level Security (RLS) policies directly using public.is_super_admin() security definer functions before returning rows.',
    },
    ai: {
      title: '3. Multi-Provider AI Cascade Engine',
      tech: ['11 AI Backends', '5s Timeout per LLM', 'Sequential Fallback', 'Groq / Gemini / Cerebras'],
      summary: 'Sequentially attempts LLM inference starting with Groq -> Cerebras -> Gemini. If any provider returns rate limits, automatically fails over within milliseconds.',
    },
    rag: {
      title: '4. Knowledge RAG & Local Search',
      tech: ['nexus_tools', 'nexus_projects', 'nexus_knowledge', 'Vector Semantic Search'],
      summary: 'Internal search engine queries local database tables first (Tier 1 RAG) to supply grounded context to the AI assistant prompt.',
    },
  };

  return (
    <PageContainer>
      <PageHeader
        title="System Architecture & Flow Diagram"
        description="Interactive visual representation of the client request lifecycle, Supabase RLS security, and multi-provider AI cascade fallback."
      />

      {/* Simulation Controls */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
            Interactive Lab
          </Badge>
          <span className="text-xs text-muted-foreground">Click nodes below or run live request simulation</span>
        </div>

        <Button
          onClick={runFlowSimulation}
          disabled={isSimulating}
          className="gap-2 bg-gradient-to-r from-primary to-blue-600 text-white shadow-md"
        >
          <Activity className={`h-4 w-4 ${isSimulating ? 'animate-spin' : ''}`} />
          {isSimulating ? `Simulating Step ${activeStep}/4...` : '⚡ Run Live Flow Simulation'}
        </Button>
      </div>

      {/* Visual Flow Pipeline Diagram */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Node 1: Client */}
        <div
          onClick={() => setSelectedNode('client')}
          className={`cursor-pointer rounded-2xl border p-5 transition-all ${
            selectedNode === 'client' || activeStep === 1
              ? 'border-primary bg-primary/10 shadow-lg scale-[1.02]'
              : 'border-border/60 bg-card hover:border-primary/40'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
              <Code2 className="h-6 w-6" />
            </div>
            {activeStep === 1 && <span className="flex h-3 w-3 rounded-full bg-blue-500 animate-ping" />}
          </div>
          <h3 className="font-bold text-sm">1. Client Application</h3>
          <p className="text-xs text-muted-foreground mt-1">Next.js App Router UI & Monaco Editor</p>
        </div>

        {/* Node 2: Supabase */}
        <div
          onClick={() => setSelectedNode('supabase')}
          className={`cursor-pointer rounded-2xl border p-5 transition-all ${
            selectedNode === 'supabase' || activeStep === 2
              ? 'border-emerald-500 bg-emerald-500/10 shadow-lg scale-[1.02]'
              : 'border-border/60 bg-card hover:border-emerald-500/40'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
              <Database className="h-6 w-6" />
            </div>
            {activeStep === 2 && <span className="flex h-3 w-3 rounded-full bg-emerald-500 animate-ping" />}
          </div>
          <h3 className="font-bold text-sm">2. Supabase & RLS</h3>
          <p className="text-xs text-muted-foreground mt-1">PostgreSQL Security Definer Policies</p>
        </div>

        {/* Node 3: AI Cascade */}
        <div
          onClick={() => setSelectedNode('ai')}
          className={`cursor-pointer rounded-2xl border p-5 transition-all ${
            selectedNode === 'ai' || activeStep === 3
              ? 'border-purple-500 bg-purple-500/10 shadow-lg scale-[1.02]'
              : 'border-border/60 bg-card hover:border-purple-500/40'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500">
              <Cpu className="h-6 w-6" />
            </div>
            {activeStep === 3 && <span className="flex h-3 w-3 rounded-full bg-purple-500 animate-ping" />}
          </div>
          <h3 className="font-bold text-sm">3. 11-Provider AI Cascade</h3>
          <p className="text-xs text-muted-foreground mt-1">Sequential LLM Fallback Engine</p>
        </div>

        {/* Node 4: RAG Knowledge */}
        <div
          onClick={() => setSelectedNode('rag')}
          className={`cursor-pointer rounded-2xl border p-5 transition-all ${
            selectedNode === 'rag' || activeStep === 4
              ? 'border-amber-500 bg-amber-500/10 shadow-lg scale-[1.02]'
              : 'border-border/60 bg-card hover:border-amber-500/40'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
              <ShieldCheck className="h-6 w-6" />
            </div>
            {activeStep === 4 && <span className="flex h-3 w-3 rounded-full bg-amber-500 animate-ping" />}
          </div>
          <h3 className="font-bold text-sm">4. Knowledge RAG</h3>
          <p className="text-xs text-muted-foreground mt-1">Internal Search & Context Retrieval</p>
        </div>
      </div>

      {/* Selected Node Technical Breakdown */}
      <div className="mt-8 rounded-2xl border border-border/80 bg-card p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" />
            {nodeDetails[selectedNode].title}
          </h2>
          <Badge variant="outline">Selected System Module</Badge>
        </div>

        <p className="text-sm text-foreground leading-relaxed">
          {nodeDetails[selectedNode].summary}
        </p>

        <div className="space-y-2 pt-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Technologies & Frameworks Involved:
          </h3>
          <div className="flex flex-wrap gap-2">
            {nodeDetails[selectedNode].tech.map((t) => (
              <Badge key={t} variant="secondary" className="px-3 py-1 font-semibold text-xs">
                {t}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
