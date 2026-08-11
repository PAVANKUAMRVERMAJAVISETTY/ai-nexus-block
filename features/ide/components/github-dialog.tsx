'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Check,
  Github,
  Loader2,
  Lock,
  RefreshCw,
  Search,
  Star,
  Unlink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ideClient, IdeApiError } from '../services/ide-client';
import type { GitHubRepository } from '@/types/git';

interface GitHubDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful import so the caller can navigate. */
  onImported?: (projectId: string) => void;
  onConnectionChanged?: () => void;
}

export function GitHubDialog({
  open,
  onOpenChange,
  onImported,
  onConnectionChanged,
}: GitHubDialogProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [connected, setConnected] = useState(false);
  const [connection, setConnection] = useState<{
    login: string;
    avatarUrl: string | null;
    scopes: string[];
  } | null>(null);

  const [repos, setRepos] = useState<GitHubRepository[]>([]);
  const [reposLoading, setReposLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<GitHubRepository | null>(null);
  const [projectName, setProjectName] = useState('');
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const status = await ideClient.getGitHubStatus();
      setConfigured(status.configured);
      setConnected(status.connected);
      setConnection(status.connection);
      if (status.connected) void loadRepos('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read GitHub status.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadRepos = useCallback(async (search: string) => {
    setReposLoading(true);
    try {
      const result = await ideClient.listGitHubRepos(search);
      setRepos(result.repositories);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load repositories.');
    } finally {
      setReposLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) loadStatus();
  }, [open, loadStatus]);

  // Debounce the search so typing does not fire a request per keystroke.
  useEffect(() => {
    if (!connected) return;
    const timer = setTimeout(() => loadRepos(query), 250);
    return () => clearTimeout(timer);
  }, [query, connected, loadRepos]);

  const disconnect = async () => {
    if (!window.confirm('Disconnect GitHub? Existing projects stay, but Git operations that reach GitHub will stop working.')) {
      return;
    }
    try {
      const result = await ideClient.disconnectGitHub();
      toast.success(result.message);
      setConnected(false);
      setConnection(null);
      setRepos([]);
      onConnectionChanged?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not disconnect.');
    }
  };

  const importRepo = async () => {
    if (!selected) return;
    setImporting(true);
    setError(null);

    try {
      const result = await ideClient.importRepository({
        fullName: selected.fullName,
        branch: selected.defaultBranch,
        projectName: projectName.trim() || selected.name,
      });

      toast.success(result.message);
      onOpenChange(false);
      onImported?.(result.project.id);
      router.push(`/ide/${result.project.id}`);
    } catch (err) {
      setError(
        err instanceof IdeApiError ? err.message : 'The repository could not be imported.'
      );
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Github className="h-4 w-4" />
            GitHub
          </DialogTitle>
          <DialogDescription className="text-xs">
            Connect your GitHub account to import repositories and use source control. Your access
            token is stored encrypted on the server and never reaches the browser.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking connection…
          </div>
        ) : !configured ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <AlertTriangle className="h-7 w-7 text-amber-400" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                GitHub is not configured on this server
              </p>
              <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
                An administrator needs to create a GitHub OAuth App and set{' '}
                <code className="font-mono text-foreground">GITHUB_CLIENT_ID</code>,{' '}
                <code className="font-mono text-foreground">GITHUB_CLIENT_SECRET</code> and{' '}
                <code className="font-mono text-foreground">NEXUS_ENCRYPTION_KEY</code>. See{' '}
                <code className="font-mono text-foreground">docs/github-integration.md</code>.
              </p>
            </div>
          </div>
        ) : !connected ? (
          <div className="flex flex-col items-center gap-4 py-10 text-center">
            <Github className="h-10 w-10 text-muted-foreground/50" />
            <div>
              <p className="text-sm font-semibold text-foreground">GitHub is not connected</p>
              <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
                You will be sent to GitHub to authorize access. Nexus requests only what it needs to
                read your repositories and push the commits you choose to make.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                // A full navigation, not fetch: OAuth requires a browser redirect.
                window.location.href = `/api/ide/github/connect?redirectTo=${encodeURIComponent(
                  window.location.pathname
                )}`;
              }}
            >
              <Github className="mr-2 h-4 w-4" />
              Connect GitHub
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Connected identity */}
            <div className="flex items-center gap-3 rounded-md border border-border/40 bg-muted/30 p-2.5">
              {connection?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={connection.avatarUrl}
                  alt=""
                  className="h-8 w-8 rounded-full"
                  width={32}
                  height={32}
                />
              ) : (
                <Github className="h-8 w-8 text-muted-foreground" />
              )}
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Check className="h-3 w-3 text-emerald-400" />
                  Connected as {connection?.login}
                </p>
                <p className="truncate text-[10px] text-muted-foreground">
                  Scopes: {connection?.scopes.join(', ') || 'none reported'}
                </p>
              </div>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={disconnect}>
                <Unlink className="mr-1.5 h-3 w-3" />
                Disconnect
              </Button>
            </div>

            {/* Repository search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search your repositories"
                className="h-8 pl-8 text-xs"
              />
              {reposLoading && (
                <Loader2 className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
            </div>

            {/* Repository list */}
            <div className="max-h-[280px] space-y-1 overflow-y-auto pr-1">
              {repos.length === 0 && !reposLoading ? (
                <p className="py-8 text-center text-xs text-muted-foreground">
                  {query ? `No repositories match “${query}”.` : 'No repositories found.'}
                </p>
              ) : (
                repos.map((repo) => (
                  <button
                    key={repo.id}
                    type="button"
                    onClick={() => {
                      setSelected(repo);
                      setProjectName(repo.name);
                    }}
                    className={cn(
                      'w-full rounded-md border p-2.5 text-left transition-colors',
                      selected?.id === repo.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border/40 hover:bg-accent/50'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="truncate text-xs font-semibold text-foreground">
                        {repo.fullName}
                      </span>
                      {repo.private && (
                        <Lock className="h-3 w-3 shrink-0 text-amber-400" aria-label="Private" />
                      )}
                      {!repo.canPush && (
                        <Badge variant="outline" className="h-4 shrink-0 px-1 text-[9px]">
                          read-only
                        </Badge>
                      )}
                      <span className="ml-auto flex shrink-0 items-center gap-2 text-[10px] text-muted-foreground">
                        {repo.language && <span>{repo.language}</span>}
                        {repo.stars > 0 && (
                          <span className="flex items-center gap-0.5">
                            <Star className="h-3 w-3" />
                            {repo.stars}
                          </span>
                        )}
                      </span>
                    </div>
                    {repo.description && (
                      <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">
                        {repo.description}
                      </p>
                    )}
                    <p className="mt-1 text-[10px] text-muted-foreground/70">
                      {repo.defaultBranch}
                      {repo.updatedAt
                        ? ` · updated ${new Date(repo.updatedAt).toLocaleDateString()}`
                        : ''}
                    </p>
                  </button>
                ))
              )}
            </div>

            {error && (
              <div className="flex items-start gap-1.5 rounded-md border border-red-500/30 bg-red-500/10 px-2.5 py-2 text-[11px] text-red-300">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                {error}
              </div>
            )}

            {/* Import */}
            {selected && (
              <div className="space-y-2 rounded-md border border-border/40 bg-muted/20 p-2.5">
                <div className="flex items-center gap-2">
                  <label className="shrink-0 text-[11px] text-muted-foreground">Project name</label>
                  <Input
                    value={projectName}
                    onChange={(event) => setProjectName(event.target.value)}
                    className="h-7 text-xs"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Imports <span className="font-mono text-foreground">{selected.fullName}</span> on
                  branch <span className="font-mono text-foreground">{selected.defaultBranch}</span>
                  . The clone runs on your machine through your local agent — the server never
                  downloads your code.
                </p>
                <Button
                  size="sm"
                  className="h-7 w-full text-xs"
                  disabled={importing}
                  onClick={importRepo}
                >
                  {importing ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Import repository
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
