import Link from 'next/link';
import Image from 'next/image';
import { Github, ExternalLink, Download, FileText, Database } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AdminEditButton } from '@/components/admin';
import type { Project } from '@/types/projects';

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Card className="group flex flex-col justify-between overflow-hidden border-border/40 transition-all hover:border-border/80 hover:shadow-lg">
      <div>
        <div className="relative aspect-video w-full overflow-hidden bg-muted">
          {project.image_url ? (
            <Image
              src={project.image_url}
              alt={project.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <span className="text-sm">No image</span>
            </div>
          )}
          {/* Admin Edit Button overlay */}
          <div className="absolute top-2 right-2">
            <AdminEditButton entityType="projects" item={project} />
          </div>
        </div>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-lg font-semibold tracking-tight">{project.title}</h3>
            {project.is_case_study && <Badge variant="secondary">Case Study</Badge>}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
        </CardHeader>
        <CardContent className="pb-3 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {project.tags.slice(0, 4).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>

          {/* High-contrast Action Download Badges */}
          <div className="flex flex-wrap gap-2 pt-1">
            {project.pdf_url && (
              <a
                href={project.pdf_url}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-colors shadow-sm"
              >
                <FileText className="h-3 w-3" />
                📄 Download PDF Cheatsheet
              </a>
            )}
            {project.sql_url && (
              <a
                href={project.sql_url}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20 transition-colors shadow-sm"
              >
                <Database className="h-3 w-3" />
                💾 Download SQL Script
              </a>
            )}
            {project.zip_file_url && (
              <a
                href={project.zip_file_url}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors shadow-sm"
              >
                <Download className="h-3 w-3" />
                📦 Download Source (.zip)
              </a>
            )}
          </div>
        </CardContent>
      </div>

      <CardFooter className="gap-2 pt-2 border-t border-border/20">
        <Link
          href={`/projects/${project.slug}`}
          className="text-sm font-medium text-primary hover:underline"
        >
          View details →
        </Link>
        <div className="ml-auto flex items-center gap-2">
          {project.live_url && (
            <Link
              href={project.live_url}
              className="text-muted-foreground hover:text-foreground"
              aria-label={`${project.title} live demo`}
              target="_blank"
            >
              <ExternalLink className="h-4 w-4" />
            </Link>
          )}
          {project.github_url && (
            <Link
              href={project.github_url}
              className="text-muted-foreground hover:text-foreground"
              aria-label={`${project.title} GitHub`}
              target="_blank"
            >
              <Github className="h-4 w-4" />
            </Link>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
