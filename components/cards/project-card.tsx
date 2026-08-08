import Link from 'next/link';
import Image from 'next/image';
import { Github, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Project } from '@/types/projects';

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Card className="group overflow-hidden border-border/40 transition-all hover:border-border/80 hover:shadow-lg">
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
      </div>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-semibold tracking-tight">{project.title}</h3>
          {project.is_case_study && <Badge variant="secondary">Case Study</Badge>}
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="flex flex-wrap gap-1.5">
          {project.tags.slice(0, 4).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>
      <CardFooter className="gap-2">
        <Link
          href={`/projects/${project.slug}`}
          className="text-sm font-medium text-primary hover:underline"
        >
          View details
        </Link>
        {project.live_url && (
          <Link
            href={project.live_url}
            className="ml-auto text-muted-foreground hover:text-foreground"
            aria-label={`${project.title} live demo`}
          >
            <ExternalLink className="h-4 w-4" />
          </Link>
        )}
        {project.github_url && (
          <Link
            href={project.github_url}
            className="text-muted-foreground hover:text-foreground"
            aria-label={`${project.title} GitHub`}
          >
            <Github className="h-4 w-4" />
          </Link>
        )}
      </CardFooter>
    </Card>
  );
}
