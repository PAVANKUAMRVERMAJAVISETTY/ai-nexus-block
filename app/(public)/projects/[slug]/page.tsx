import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink, Github, Download, FileText, Database, CheckCircle2, Cpu, Layers, Code2 } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { AdminWrapper, AdminEditButton } from '@/components/admin';
import { getProjectBySlug, getProjects } from '@/services/projects';

export async function generateStaticParams() {
  const { data: projects } = await getProjects();
  return projects.map((p) => ({ slug: p.slug }));
}

export default async function ProjectDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const project = await getProjectBySlug(params.slug);

  if (!project) notFound();

  const metadata = (project as any).metadata || {};
  const galleryImages = metadata.gallery_images || (project.image_url ? [project.image_url] : []);
  const customButtons = metadata.custom_buttons || [];

  return (
    <PageContainer>
      <AdminWrapper entityType="projects">
        <div className="flex items-center justify-between mb-6">
          <Button asChild variant="ghost" size="sm">
            <Link href="/projects">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to projects
            </Link>
          </Button>
          <AdminEditButton entityType="projects" item={project} />
        </div>

        <div className="mx-auto max-w-4xl space-y-8">
          {/* Header */}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="px-3 py-1 font-semibold">{project.category}</Badge>
              {project.is_case_study && (
                <Badge variant="outline" className="border-primary/40 text-primary">Case Study</Badge>
              )}
            </div>

            <h1 className="mt-4 text-3xl font-extrabold tracking-tight md:text-5xl">
              {project.title}
            </h1>

            <p className="mt-3 text-lg text-muted-foreground leading-relaxed">
              {project.description}
            </p>

            {/* Prominent Action & Download Buttons */}
            <div className="mt-6 flex flex-wrap gap-3">
              {project.live_url && (
                <Button asChild size="default" className="bg-gradient-to-r from-primary to-blue-600 shadow-md">
                  <a href={project.live_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" /> Live Demo
                  </a>
                </Button>
              )}

              {project.github_url && (
                <Button asChild variant="outline" size="default">
                  <a href={project.github_url} target="_blank" rel="noopener noreferrer">
                    <Github className="mr-2 h-4 w-4" /> GitHub Repository
                  </a>
                </Button>
              )}

              {/* 1-Click Action Download Badges */}
              {project.pdf_url && (
                <Button asChild variant="secondary" size="default" className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 font-semibold shadow-sm">
                  <a href={project.pdf_url} download target="_blank" rel="noopener noreferrer">
                    <FileText className="mr-2 h-4 w-4" /> [📄 Download Project Report (PDF)]
                  </a>
                </Button>
              )}

              {project.zip_file_url && (
                <Button asChild variant="secondary" size="default" className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20 font-semibold shadow-sm">
                  <a href={project.zip_file_url} download target="_blank" rel="noopener noreferrer">
                    <Download className="mr-2 h-4 w-4" /> [📦 Download Source Code (.zip)]
                  </a>
                </Button>
              )}

              {/* Custom Action Buttons */}
              {customButtons.map((btn: any, idx: number) => (
                <Button key={idx} asChild variant="outline" size="default">
                  <a href={btn.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" /> {btn.label}
                  </a>
                </Button>
              ))}
            </div>
          </div>

          {/* Multi-Image Gallery */}
          {galleryImages.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Project Gallery & Screenshots
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {galleryImages.map((img: string, idx: number) => (
                  <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-border/60 shadow-lg bg-muted">
                    <img src={img} alt={`${project.title} screenshot ${idx + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Technical Matrix: Languages, Tools & Supabase Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-xl border border-border/60 bg-card p-5 space-y-2">
              <h3 className="text-sm font-bold flex items-center gap-1.5 text-primary">
                <Code2 className="h-4 w-4" /> Languages & Tools
              </h3>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {project.tags?.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-card p-5 space-y-2">
              <h3 className="text-sm font-bold flex items-center gap-1.5 text-emerald-500">
                <Database className="h-4 w-4" /> Supabase Features
              </h3>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> PostgreSQL & RLS Policies</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Supabase SSR Auth</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Storage Buckets</li>
              </ul>
            </div>

            <div className="rounded-xl border border-border/60 bg-card p-5 space-y-2">
              <h3 className="text-sm font-bold flex items-center gap-1.5 text-blue-500">
                <Layers className="h-4 w-4" /> Architecture
              </h3>
              <p className="text-xs text-muted-foreground">
                Next.js App Router, Server Actions, Responsive Glassmorphism & Autonomous Agents integration.
              </p>
            </div>
          </div>

          {/* Overview & Problem Solved */}
          {project.long_description && (
            <div className="prose prose-sm max-w-none space-y-4">
              <h2 className="text-xl font-bold">Technical Overview & Problem Solved</h2>
              <div className="rounded-xl border border-border/40 bg-muted/20 p-6 text-foreground leading-relaxed whitespace-pre-line">
                {project.long_description}
              </div>
            </div>
          )}
        </div>
      </AdminWrapper>
    </PageContainer>
  );
}
