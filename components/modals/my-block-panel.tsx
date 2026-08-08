'use client';

import { Sheet, SheetContent, SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { X, Github, Linkedin, FileText, ExternalLink, Target, FolderGit2 } from 'lucide-react';
import { siteConfig } from '@/config/site';

interface MyBlockPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MyBlockPanel({ open, onOpenChange }: MyBlockPanelProps) {
  const author = siteConfig.author;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">My Block</h2>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" aria-label="Close">
              <X className="h-5 w-5" />
            </Button>
          </SheetClose>
        </div>

        <div className="mt-6 flex flex-col items-center text-center">
          <Avatar className="h-24 w-24">
            <AvatarImage src="" alt={author.name} />
            <AvatarFallback className="text-2xl font-bold">
              {author.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <h3 className="mt-4 text-xl font-bold">{author.name}</h3>
          <p className="text-sm font-medium text-primary">{author.role}</p>
          <p className="mt-3 text-sm text-muted-foreground">{author.bio}</p>
        </div>

        <Separator className="my-6" />

        <div className="space-y-4">
          <div>
            <h4 className="flex items-center gap-2 text-sm font-semibold">
              <Target className="h-4 w-4 text-primary" />
              Current Mission
            </h4>
            <p className="mt-1 text-sm text-muted-foreground">
              {author.currentProject}
            </p>
          </div>

          <div>
            <h4 className="flex items-center gap-2 text-sm font-semibold">
              <FolderGit2 className="h-4 w-4 text-primary" />
              Current Project
            </h4>
            <p className="mt-1 text-sm text-muted-foreground">
              {author.currentProject}
            </p>
          </div>
        </div>

        <Separator className="my-6" />

        <div className="space-y-2">
          <Button asChild variant="outline" className="w-full justify-start">
            <a href={siteConfig.links.github} target="_blank" rel="noopener noreferrer">
              <Github className="mr-3 h-4 w-4" />
              GitHub
              <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground" />
            </a>
          </Button>
          <Button asChild variant="outline" className="w-full justify-start">
            <a href={siteConfig.links.linkedin} target="_blank" rel="noopener noreferrer">
              <Linkedin className="mr-3 h-4 w-4" />
              LinkedIn
              <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground" />
            </a>
          </Button>
          <Button asChild variant="outline" className="w-full justify-start">
            <a href={siteConfig.links.resume} target="_blank" rel="noopener noreferrer">
              <FileText className="mr-3 h-4 w-4" />
              Resume
              <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground" />
            </a>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
