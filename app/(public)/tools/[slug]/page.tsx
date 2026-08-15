import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  ExternalLink,
  Github,
  FileText,
  Database,
  Download,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { PageContainer } from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { AdminWrapper, AdminEditButton } from '@/components/admin';
import { getToolBySlug, getTools } from '@/services/tools';

export async function generateStaticParams() {
  const { data: tools } = await getTools();
  return tools.map((t) => ({ slug: t.slug }));
}

export default async function ToolDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const tool = await getToolBySlug(params.slug);

  if (!tool) notFound();

  const metadata = (tool as any).metadata || {};
  const galleryImages = metadata.gallery_images || (tool.image_url ? [tool.image_url] : []);
  const customButtons = metadata.custom_buttons || [];

  return (
    <PageContainer>
      <AdminWrapper entityType="tools">
        <div className="flex items-center justify-between mb-6">
          <Button asChild variant="ghost" size="sm">
            <Link href="/tools">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to tools catalog
            </Link>
          </Button>
          <AdminEditButton entityType="tools" item={tool} />
        </div>

        <div className="mx-auto max-w-4xl space-y-8">
          {/* Header */}
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary text-2xl font-bold shadow-md">
              {tool.name.charAt(0)}
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
                {tool.name}
              </h1>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="px-3 py-1 font-semibold">{tool.category}</Badge>
                <Badge variant="outline" className="capitalize border-primary/40 text-primary font-bold">
                  {typeof tool.pricing === 'string' ? tool.pricing : (tool.pricing as any)?.value || 'free'}
                </Badge>
                {tool.is_open_source && (
                  <Badge variant="outline">Open Source</Badge>
                )}
              </div>
            </div>
          </div>

          <p className="text-lg text-muted-foreground leading-relaxed">
            {tool.description}
          </p>

          {/* Action Links & Download Badges */}
          <div className="flex flex-wrap gap-3">
            {tool.website_url && (
              <Button asChild size="default" className="bg-gradient-to-r from-primary to-blue-600 shadow-md">
                <a href={tool.website_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" /> Official Website
                </a>
              </Button>
            )}

            {tool.github_url && (
              <Button asChild variant="outline" size="default">
                <a href={tool.github_url} target="_blank" rel="noopener noreferrer">
                  <Github className="mr-2 h-4 w-4" /> GitHub Repository
                </a>
              </Button>
            )}

            {tool.documentation_url && (
              <Button asChild variant="outline" size="default">
                <a href={tool.documentation_url} target="_blank" rel="noopener noreferrer">
                  <FileText className="mr-2 h-4 w-4" /> Documentation
                </a>
              </Button>
            )}

            {/* High-Contrast Action Download Badges */}
            {tool.pdf_url && (
              <Button asChild variant="secondary" size="default" className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 font-semibold shadow-sm">
                <a href={tool.pdf_url} download target="_blank" rel="noopener noreferrer">
                  <FileText className="mr-2 h-4 w-4" /> 📄 Download PDF Cheatsheet
                </a>
              </Button>
            )}

            {tool.sql_url && (
              <Button asChild variant="secondary" size="default" className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/20 font-semibold shadow-sm">
                <a href={tool.sql_url} download target="_blank" rel="noopener noreferrer">
                  <Database className="mr-2 h-4 w-4" /> 💾 Download SQL Script
                </a>
              </Button>
            )}

            {tool.zip_file_url && (
              <Button asChild variant="secondary" size="default" className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20 font-semibold shadow-sm">
                <a href={tool.zip_file_url} download target="_blank" rel="noopener noreferrer">
                  <Download className="mr-2 h-4 w-4" /> 📦 Download Source (.zip)
                </a>
              </Button>
            )}

            {/* Custom Buttons */}
            {customButtons.map((btn: any, idx: number) => (
              <Button key={idx} asChild variant="outline" size="default">
                <a href={btn.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" /> {btn.label}
                </a>
              </Button>
            ))}
          </div>

          <Separator />

          {/* Educational Breakdown Grid: Author's Review, Features, Pros vs Cons */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Educational Breakdown & Technical Review
            </h2>

            {/* Author's Review */}
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-6 space-y-2">
              <h3 className="text-sm font-bold text-primary uppercase tracking-wider">
                Author&apos;s Review &amp; Assessment
              </h3>
              <p className="text-sm text-foreground leading-relaxed">
                {tool.description} Built for modern full-stack workflows with rapid execution speed and high scalability.
              </p>
            </div>

            {/* Pros vs Cons Box */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 space-y-3">
                <h3 className="text-sm font-bold text-emerald-500 flex items-center gap-1.5">
                  <ThumbsUp className="h-4 w-4" /> Key Pros &amp; Advantages
                </h3>
                <ul className="text-xs text-muted-foreground space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Seamless integration with Next.js App Router and TypeScript.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>High efficiency and developer productivity boost.</span>
                  </li>
                </ul>
              </div>

              <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-5 space-y-3">
                <h3 className="text-sm font-bold text-rose-500 flex items-center gap-1.5">
                  <ThumbsDown className="h-4 w-4" /> Considerations &amp; Cons
                </h3>
                <ul className="text-xs text-muted-foreground space-y-2">
                  <li className="flex items-start gap-2">
                    <HelpCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                    <span>Requires initial API key setup for multi-provider fallback.</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Step-by-Step How To Use Guide */}
            <div className="rounded-xl border border-border/60 bg-card p-6 space-y-4">
              <h3 className="text-base font-bold">Step-by-Step &quot;How to Use&quot; Guide</h3>
              <ol className="text-xs text-muted-foreground space-y-3 list-decimal list-inside leading-relaxed">
                <li>Explore the official documentation or GitHub repository linked above.</li>
                <li>Configure environment variables in your local `.env.local` file.</li>
                <li>Invoke via standard API routes or UI components in your workspace.</li>
              </ol>
            </div>
          </div>

          {/* Screenshot Gallery */}
          {galleryImages.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Tool Screenshots & Media
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {galleryImages.map((img: string, idx: number) => (
                  <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-border/60 shadow-lg bg-muted">
                    <img src={img} alt={`${tool.name} screenshot ${idx + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </AdminWrapper>
    </PageContainer>
  );
}
