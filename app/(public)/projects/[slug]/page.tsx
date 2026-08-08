import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink, Github } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { getProjectBySlug, getProjects } from '@/services/projects';

export function generateStaticParams() {
  const { data: projects } = getProjects();
  return projects.map((p) => ({ slug: p.slug }));
}

export default function ProjectDetailPage({ params }: { params: { slug: string } }) {
  const project = getProjectBySlug(params.slug);
  if (!project) notFound();

  return (
    <PageContainer>
      <Button asChild variant="ghost" size="sm" className="mb-6">
        <Link href="/projects">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to projects
        </Link>
      </Button>
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{project.category}</Badge>
          {project.is_case_study && <Badge variant="outline">Case Study</Badge>}
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">{project.title}</h1>
        <p className="mt-3 text-lg text-muted-foreground">{project.description}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {project.live_url && (
            <Button asChild size="sm">
              <a href={project.live_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Live Demo
              </a>
            </Button>
          )}
          {project.github_url && (
            <Button asChild variant="outline" size="sm">
              <a href={project.github_url} target="_blank" rel="noopener noreferrer">
                <Github className="mr-2 h-4 w-4" />
                GitHub
              </a>
            </Button>
          )}
        </div>
        <Separator className="my-8" />
        {project.long_description && (
          <div className="prose prose-sm max-w-none">
            <h2 className="text-xl font-semibold">Overview</h2>
            <p className="text-muted-foreground">{project.long_description}</p>
          </div>
        )}
        <div className="mt-8">
          <h2 className="text-xl font-semibold">Technologies</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {project.tags.map((tag) => (
              <Badge key={tag} variant="outline">{tag}</Badge>
            ))}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
