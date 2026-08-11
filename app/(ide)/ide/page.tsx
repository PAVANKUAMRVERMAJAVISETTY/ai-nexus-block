'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowRight,
  Blocks,
  Clock,
  Code2,
  Database,
  FileCode2,
  Loader2,
  Plus,
  Github,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { workspaceNav } from '@/config/navigation';
import { ideClient, type TemplateSummary } from '@/features/ide/services/ide-client';
import { GitHubDialog } from '@/features/ide/components/github-dialog';
import type { IdeProject } from '@/types/ide';

const CATEGORY_STYLES: Record<string, string> = {
  fullstack: 'text-violet-400 border-violet-500/30',
  frontend: 'text-sky-400 border-sky-500/30',
  backend: 'text-emerald-400 border-emerald-500/30',
  data: 'text-amber-400 border-amber-500/30',
  ai: 'text-pink-400 border-pink-500/30',
  tool: 'text-muted-foreground border-border/40',
};

export default function IdeLauncherPage() {
  const router = useRouter();

  const [projects, setProjects] = useState<IdeProject[]>([]);
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [githubOpen, setGithubOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [templateId, setTemplateId] = useState('nextjs_fullstack');
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ideClient.listProjects();
      setProjects(data.projects);
      setTemplates(data.templates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your projects.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createProject = async () => {
    if (!name.trim()) {
      toast.error('Give the project a name.');
      return;
    }

    setCreating(true);
    try {
      const result = await ideClient.createProject({
        name: name.trim(),
        description: description.trim() || undefined,
        template: templateId,
      });
      toast.success(`Created ${result.project.name} with ${result.fileCount} files.`);
      router.push(`/ide/${result.project.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create the project.');
      setCreating(false);
    }
  };

  const deleteProject = async (project: IdeProject) => {
    const typed = window.prompt(
      `This permanently deletes "${project.name}" and every file in it.\n\nType the project name to confirm:`
    );
    if (typed !== project.name) {
      if (typed !== null) toast.error('Name did not match. Nothing was deleted.');
      return;
    }

    try {
      await ideClient.deleteProject(project.id, project.name);
      toast.success(`Deleted ${project.name}.`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete the project.');
    }
  };

  const selectedTemplate = templates.find((t) => t.id === templateId);

  return (
    <div className="h-screen overflow-y-auto">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border/40 bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-6">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <Blocks className="h-5 w-5 text-primary" />
            <span className="text-sm font-semibold">Nexus IDE</span>
          </Link>

          <nav className="ml-6 hidden items-center gap-1 md:flex">
            {workspaceNav
              .filter((item) => item.href !== '/ide')
              .slice(0, 5)
              .map((item) => (
                <Button key={item.href} asChild variant="ghost" size="sm" className="h-7 text-xs">
                  <Link href={item.href}>{item.label}</Link>
                </Button>
              ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => setGithubOpen(true)}
            >
              <Github className="mr-1.5 h-3.5 w-3.5" />
              Import from GitHub
            </Button>
            <Button size="sm" className="h-8 text-xs" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              New project
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Your projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A browser workspace with a real editor, your own local terminal agent, and an assistant
            that has read your code.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading projects…
          </div>
        ) : error ? (
          <Card className="flex flex-col items-center gap-3 border-destructive/30 p-10 text-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <div>
              <p className="text-sm font-semibold text-foreground">Could not load your projects</p>
              <p className="mt-1 max-w-lg text-xs text-muted-foreground">{error}</p>
            </div>
            <Button size="sm" variant="outline" onClick={load}>
              Try again
            </Button>
          </Card>
        ) : projects.length === 0 ? (
          <Card className="flex flex-col items-center gap-3 border-dashed p-14 text-center">
            <Code2 className="h-10 w-10 text-muted-foreground/40" />
            <div>
              <p className="text-base font-semibold text-foreground">No projects yet</p>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                Start from a template — each one comes with a working structure, real files, and
                notes on what it teaches.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Create your first project
              </Button>
              <Button size="sm" variant="outline" onClick={() => setGithubOpen(true)}>
                <Github className="mr-1.5 h-3.5 w-3.5" />
                Import from GitHub
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="group relative flex flex-col border-border/40 p-4 transition-colors hover:border-primary/40"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <FileCode2 className="h-5 w-5 shrink-0 text-primary" />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                    onClick={() => deleteProject(project)}
                    aria-label={`Delete ${project.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <Link href={`/ide/${project.id}`} className="flex flex-1 flex-col">
                  <h2 className="truncate text-sm font-semibold text-foreground">{project.name}</h2>
                  <p className="mt-1 line-clamp-2 flex-1 text-xs text-muted-foreground">
                    {project.description || 'No description.'}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {project.github_repo_full_name && (
                      <Badge
                        variant="outline"
                        className="h-5 gap-1 border-primary/40 px-1.5 text-[10px] text-primary"
                        title={project.github_repo_full_name}
                      >
                        <Github className="h-2.5 w-2.5" />
                        GitHub
                      </Badge>
                    )}
                    <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                      {project.framework}
                    </Badge>
                    <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                      {project.primary_language}
                    </Badge>
                  </div>

                  <div className="mt-3 flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {project.last_opened_at
                      ? `Opened ${new Date(project.last_opened_at).toLocaleDateString()}`
                      : `Created ${new Date(project.created_at).toLocaleDateString()}`}
                    <ArrowRight className="ml-auto h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                </Link>
              </Card>
            ))}
          </div>
        )}

        {/* Setup note — honest about the migration prerequisite */}
        {error?.includes('migration') && (
          <Card className="mt-6 border-amber-500/30 bg-amber-500/5 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-amber-300">
              <Database className="h-4 w-4" />
              Database setup required
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Run{' '}
              <code className="font-mono text-foreground">
                database/migrations/20260811000000_nexus_ide_v2.sql
              </code>{' '}
              in the Supabase SQL editor, then reload this page.
            </p>
          </Card>
        )}
      </main>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              New project
            </DialogTitle>
            <DialogDescription className="text-xs">
              Pick a starting point. Every template creates real, runnable files you can edit
              immediately.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-foreground">
                  Project name
                </label>
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="My Portfolio API"
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-foreground">
                  Description <span className="text-muted-foreground">(optional)</span>
                </label>
                <Textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="What are you building?"
                  rows={3}
                  className="resize-none text-xs"
                />
              </div>

              {selectedTemplate && (
                <div className="rounded-md border border-border/40 bg-muted/30 p-3">
                  <p className="text-[11px] font-semibold text-foreground">What you will learn</p>
                  <ul className="mt-1.5 space-y-1">
                    {selectedTemplate.learn.map((item) => (
                      <li key={item} className="text-[11px] text-muted-foreground">
                        · {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="max-h-[340px] space-y-1.5 overflow-y-auto pr-1">
              {templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => setTemplateId(template.id)}
                  className={cn(
                    'w-full rounded-md border p-2.5 text-left transition-colors',
                    templateId === template.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border/40 hover:bg-accent/50'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">{template.label}</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        'ml-auto h-4 shrink-0 px-1.5 text-[9px] capitalize',
                        CATEGORY_STYLES[template.category]
                      )}
                    >
                      {template.category}
                    </Badge>
                  </div>
                  <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                    {template.description}
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground/70">
                    {template.fileCount} files · {template.primaryLanguage}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={createProject} disabled={creating || !name.trim()}>
              {creating ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="mr-2 h-3.5 w-3.5" />
              )}
              Create project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <GitHubDialog open={githubOpen} onOpenChange={setGithubOpen} onImported={() => load()} />
    </div>
  );
}
