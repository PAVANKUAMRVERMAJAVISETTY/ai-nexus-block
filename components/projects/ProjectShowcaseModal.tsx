'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Download, ExternalLink, Github, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Project } from '@/types/projects';

interface ProjectShowcaseModalProps {
  project: Project | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProjectShowcaseModal({
  project,
  open,
  onOpenChange,
}: ProjectShowcaseModalProps) {
  if (!project) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{project.category || 'Project'}</Badge>
            {project.is_case_study && <Badge variant="outline">Case Study</Badge>}
          </div>
          <DialogTitle className="text-xl font-bold mt-2">{project.title}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {project.description}
          </DialogDescription>
        </DialogHeader>

        {project.image_url && (
          <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted my-3">
            <Image
              src={project.image_url}
              alt={project.title}
              fill
              className="object-cover"
            />
          </div>
        )}

        {project.long_description && (
          <div className="text-xs text-muted-foreground space-y-2 my-2">
            <h4 className="font-semibold text-foreground text-sm">Overview</h4>
            <p className="leading-relaxed">{project.long_description}</p>
          </div>
        )}

        <div className="space-y-2 my-2">
          <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider">
            Technologies & Tags
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {project.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-border/40">
          {project.live_url && (
            <Button asChild size="sm">
              <a href={project.live_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1.5 h-4 w-4" />
                Live Demo
              </a>
            </Button>
          )}

          {project.github_url && (
            <Button asChild variant="outline" size="sm">
              <a href={project.github_url} target="_blank" rel="noopener noreferrer">
                <Github className="mr-1.5 h-4 w-4" />
                GitHub Repository
              </a>
            </Button>
          )}

          {project.zip_file_url && (
            <Button asChild variant="secondary" size="sm" className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20">
              <a href={project.zip_file_url} download target="_blank" rel="noopener noreferrer">
                <Download className="mr-1.5 h-4 w-4" />
                Download Source (.zip)
              </a>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
