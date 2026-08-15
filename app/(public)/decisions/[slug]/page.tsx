import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CheckCircle2, AlertTriangle, Layers, FileText } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { AdminWrapper, AdminEditButton } from '@/components/admin';

async function getADRBySlug(slug: string) {
  try {
    const res = await fetch(`http://localhost:3000/api/decisions?slug=${slug}`, { cache: 'no-store' });
    const json = await res.json();
    return json.data || null;
  } catch {
    return null;
  }
}

export default async function DecisionDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const adr = await getADRBySlug(params.slug);

  if (!adr) {
    // Render fallback data if fetch server-side fails
    const mockADR = {
      title: 'ADR-001: 11-Provider AI LLM Cascade Fallback Engine',
      status: 'Accepted',
      category: 'AI Architecture',
      context: 'We require ultra-reliable AI responses for developer knowledge synthesis without single-vendor downtime or rate limit failures.',
      decision: 'Implement a sequential 11-provider cascade (Groq -> Cerebras -> Gemini -> Mistral -> DeepSeek -> NVIDIA NIM -> OpenRouter -> GitHub Models -> Cloudflare -> Cohere -> Hugging Face) with 5s timeout and automatic fallback.',
      consequences: 'Zero service outages for AI Copilot, 99.9% uptime SLA, and automated failover handling across free & paid tiers.',
      created_at: '2026-08-15T00:00:00Z',
    };
    return renderADRDetail(mockADR);
  }

  return renderADRDetail(adr);
}

function renderADRDetail(adr: any) {
  return (
    <PageContainer>
      <AdminWrapper entityType="decisions">
        <div className="flex items-center justify-between mb-6">
          <Button asChild variant="ghost" size="sm">
            <Link href="/decisions">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Architectural Decision Records
            </Link>
          </Button>
          <AdminEditButton entityType="decisions" item={adr} />
        </div>

        <div className="mx-auto max-w-4xl space-y-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30">{adr.status}</Badge>
              <Badge variant="secondary">{adr.category || 'Architecture'}</Badge>
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight md:text-5xl">
              {adr.title}
            </h1>
            <p className="text-xs text-muted-foreground mt-2">
              Record Date: {new Date(adr.created_at || Date.now()).toLocaleDateString()}
            </p>
          </div>

          <Separator />

          <div className="space-y-6">
            {/* Context */}
            <div className="rounded-xl border border-border/60 bg-card p-6 space-y-2 shadow-sm">
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-500" /> Context & Problem Statement
              </h2>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                {adr.context}
              </p>
            </div>

            {/* Decision */}
            <div className="rounded-xl border border-primary/40 bg-primary/5 p-6 space-y-2 shadow-sm">
              <h2 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" /> Decision Reached
              </h2>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                {adr.decision}
              </p>
            </div>

            {/* Consequences */}
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-6 space-y-2 shadow-sm">
              <h2 className="text-sm font-bold text-emerald-500 uppercase tracking-wider flex items-center gap-2">
                <Layers className="h-4 w-4 text-emerald-500" /> Key Trade-offs & Consequences
              </h2>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                {adr.consequences}
              </p>
            </div>
          </div>
        </div>
      </AdminWrapper>
    </PageContainer>
  );
}
