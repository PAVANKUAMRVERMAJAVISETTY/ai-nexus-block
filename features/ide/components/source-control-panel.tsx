'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
  CloudOff,
  GitBranch,
  GitCommitHorizontal,
  Github,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  RotateCcw,
  Trash2,
  Undo2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ideClient, IdeApiError } from '../services/ide-client';
import { basename, dirname } from '@/lib/ide/paths';
import type { GitBranchInfo, GitFileChange, GitStatusSummary } from '@/types/git';

/** Single-letter badge, matching the letters Git itself uses. */
function statusLetter(change: GitFileChange): { letter: string; className: string; title: string } {
  if (change.conflicted) return { letter: '!', className: 'text-red-400', title: 'Conflicted' };
  if (change.untracked) return { letter: 'U', className: 'text-emerald-400', title: 'Untracked' };

  const status = change.staged ? change.indexStatus : change.worktreeStatus;
  switch (status) {
    case 'added':
      return { letter: 'A', className: 'text-emerald-400', title: 'Added' };
    case 'deleted':
      return { letter: 'D', className: 'text-red-400', title: 'Deleted' };
    case 'renamed':
      return { letter: 'R', className: 'text-sky-400', title: 'Renamed' };
    case 'copied':
      return { letter: 'C', className: 'text-sky-400', title: 'Copied' };
    default:
      return { letter: 'M', className: 'text-amber-400', title: 'Modified' };
  }
}

interface PendingConfirm {
  title: string;
  description: string;
  actionLabel: string;
  destructive: boolean;
  run: () => Promise<void>;
}

interface SourceControlPanelProps {
  projectId: string;
  /** Null until the project is known to be a git repository. */
  isGitRepo: boolean;
  agentOnline: boolean;
  onOpenFile: (path: string) => void;
  onConnectGitHub: () => void;
  onExplainConflict: (path: string) => void;
  githubConnected: boolean;
}

export function SourceControlPanel({
  projectId,
  isGitRepo,
  agentOnline,
  onOpenFile,
  onConnectGitHub,
  onExplainConflict,
  githubConnected,
}: SourceControlPanelProps) {
  const [status, setStatus] = useState<GitStatusSummary | null>(null);
  const [branches, setBranches] = useState<GitBranchInfo[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<PendingConfirm | null>(null);
  const [showStaged, setShowStaged] = useState(true);
  const [showChanges, setShowChanges] = useState(true);

  /**
   * Queue an operation and wait for the agent to finish it.
   * Everything here is asynchronous by design: the server only enqueues, so the
   * UI polls the run rather than pretending the work happened inline.
   */
  const runOperation = useCallback(
    async (
      operation: Record<string, unknown>,
      options: { confirmElevated?: boolean; label: string }
    ) => {
      setBusy(options.label);
      setError(null);

      try {
        const queued = await ideClient.runGitOperation({
          projectId,
          operation,
          confirmElevated: options.confirmElevated,
        });

        if (!queued.agentOnline) {
          setError(
            queued.message ?? 'No local agent is connected, so this is queued and has not run yet.'
          );
          return null;
        }

        // Poll until the run reaches a terminal state.
        const deadline = Date.now() + 120_000;
        while (Date.now() < deadline) {
          await new Promise((resolve) => setTimeout(resolve, 900));
          const detail = await ideClient.getGitRun(queued.run.id);

          if (!['queued', 'claimed', 'running'].includes(detail.run.status)) {
            if (detail.run.status !== 'success') {
              const explanation =
                detail.run.result?.errorExplanation ??
                detail.run.stderr?.split('\n').filter(Boolean).slice(-3).join('\n') ??
                'The Git command failed.';
              setError(explanation);
            }
            return detail.run;
          }
        }

        setError('The operation is taking longer than expected. Check the Terminal panel.');
        return null;
      } catch (err) {
        const detail =
          err instanceof IdeApiError ? err.message : 'The operation could not be queued.';
        // 428 means a confirmation is required — surfaced by the caller instead.
        if (!(err instanceof IdeApiError && err.status === 428)) setError(detail);
        throw err;
      } finally {
        setBusy(null);
      }
    },
    [projectId]
  );

  const refresh = useCallback(async () => {
    if (!isGitRepo || !agentOnline) return;

    try {
      const statusRun = await runOperation({ op: 'status' }, { label: 'refresh' });
      if (statusRun?.result?.status) setStatus(statusRun.result.status);

      const branchRun = await runOperation({ op: 'branch_list' }, { label: 'refresh' });
      if (branchRun?.result?.branches) setBranches(branchRun.result.branches);
    } catch {
      // runOperation already surfaced the message.
    }
  }, [isGitRepo, agentOnline, runOperation]);

  useEffect(() => {
    refresh();
    // Intentionally only on mount / when the repo becomes available.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGitRepo, agentOnline]);

  const staged = useMemo(() => status?.files.filter((f) => f.staged) ?? [], [status]);
  const unstaged = useMemo(
    () => status?.files.filter((f) => !f.staged && !f.conflicted) ?? [],
    [status]
  );
  const conflicted = useMemo(() => status?.files.filter((f) => f.conflicted) ?? [], [status]);

  const act = async (operation: Record<string, unknown>, label: string) => {
    try {
      await runOperation(operation, { label });
      await refresh();
    } catch {
      // handled
    }
  };

  /** Elevated operations retry once with explicit confirmation. */
  const actElevated = (
    operation: Record<string, unknown>,
    label: string,
    confirmCopy: Omit<PendingConfirm, 'run'>
  ) => {
    setConfirm({
      ...confirmCopy,
      run: async () => {
        try {
          await runOperation(operation, { label, confirmElevated: true });
          await refresh();
        } catch {
          // handled
        }
      },
    });
  };

  const commit = async () => {
    if (!message.trim()) {
      setError('Enter a commit message before committing.');
      return;
    }
    if (staged.length === 0) {
      setError('Stage at least one file before committing.');
      return;
    }

    try {
      const run = await runOperation({ op: 'commit', message }, { label: 'commit' });
      if (run?.status === 'success') {
        toast.success('Committed.');
        setMessage('');
      }
      await refresh();
    } catch {
      // handled
    }
  };

  /* ------------------------------------------------------------------ */
  /* Empty / blocked states                                              */
  /* ------------------------------------------------------------------ */

  if (!isGitRepo) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <GitBranch className="h-8 w-8 text-muted-foreground/40" />
        <div>
          <p className="text-sm font-semibold text-foreground">Not a Git repository</p>
          <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
            Import a repository from GitHub to use source control in this project.
          </p>
        </div>
        {githubConnected ? (
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onConnectGitHub}>
            <Github className="mr-1.5 h-3.5 w-3.5" />
            Import a repository
          </Button>
        ) : (
          <Button size="sm" className="h-7 text-xs" onClick={onConnectGitHub}>
            <Github className="mr-1.5 h-3.5 w-3.5" />
            Connect GitHub
          </Button>
        )}
      </div>
    );
  }

  if (!agentOnline) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <CloudOff className="h-8 w-8 text-muted-foreground/40" />
        <div>
          <p className="text-sm font-semibold text-foreground">Local agent offline</p>
          <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
            Git runs on your machine through the Nexus Local Development Agent. Start it to see
            repository status.
          </p>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------ */

  const renderFileRow = (change: GitFileChange, actions: React.ReactNode) => {
    const badge = statusLetter(change);
    return (
      <div
        key={`${change.path}-${change.staged}`}
        className="group flex items-center gap-1.5 px-2 py-[3px] text-[13px] hover:bg-accent/50"
      >
        <button
          type="button"
          onClick={() => onOpenFile(change.path)}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
          title={change.path}
        >
          <span className="truncate text-foreground">{basename(change.path)}</span>
          <span className="truncate text-[10px] text-muted-foreground">
            {dirname(change.path)}
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          {actions}
        </div>

        <span
          className={cn('w-3 shrink-0 text-center text-[11px] font-bold', badge.className)}
          title={badge.title}
        >
          {badge.letter}
        </span>
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col bg-card/40">
      {/* Branch bar */}
      <div className="flex items-center gap-1.5 border-b border-border/40 px-2 py-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 min-w-0 gap-1.5 px-1.5 text-xs">
              <GitBranch className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="truncate">{status?.branch ?? '—'}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-72 w-60 overflow-y-auto">
            <DropdownMenuLabel className="text-xs">Switch branch</DropdownMenuLabel>
            {branches.filter((b) => !b.isRemote).map((branch) => (
              <DropdownMenuItem
                key={branch.name}
                className="text-xs"
                disabled={branch.isCurrent}
                onClick={() => act({ op: 'branch_switch', branch: branch.name }, 'switch')}
              >
                {branch.isCurrent && <Check className="mr-2 h-3 w-3 text-primary" />}
                <span className={cn('truncate', !branch.isCurrent && 'ml-5')}>{branch.name}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-xs"
              onClick={() => {
                const name = window.prompt('New branch name:');
                if (name?.trim()) act({ op: 'branch_create', branch: name.trim() }, 'branch');
              }}
            >
              <Plus className="mr-2 h-3 w-3" />
              Create branch…
            </DropdownMenuItem>
            {status?.branch && (
              <DropdownMenuItem
                className="text-xs text-destructive focus:text-destructive"
                onClick={() => {
                  const name = window.prompt('Delete which branch?');
                  if (!name?.trim()) return;
                  // Deleting the checked-out branch is impossible in git and
                  // would only produce a confusing error, so refuse up front.
                  if (name.trim() === status.branch) {
                    setError('You cannot delete the branch you are currently on.');
                    return;
                  }
                  actElevated({ op: 'branch_delete', branch: name.trim() }, 'branch', {
                    title: `Delete branch "${name.trim()}"?`,
                    description:
                      'This deletes the local branch. Commits only on this branch may become unreachable.',
                    actionLabel: 'Delete branch',
                    destructive: true,
                  });
                }}
              >
                <Trash2 className="mr-2 h-3 w-3" />
                Delete branch…
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {status && (status.ahead > 0 || status.behind > 0) && (
          <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            {status.ahead > 0 && (
              <span className="flex items-center gap-0.5" title={`${status.ahead} to push`}>
                <ArrowUp className="h-3 w-3" />
                {status.ahead}
              </span>
            )}
            {status.behind > 0 && (
              <span className="flex items-center gap-0.5" title={`${status.behind} to pull`}>
                <ArrowDown className="h-3 w-3" />
                {status.behind}
              </span>
            )}
          </span>
        )}

        <div className="ml-auto flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            title="Fetch"
            disabled={Boolean(busy)}
            onClick={() => act({ op: 'fetch' }, 'fetch')}
          >
            <RefreshCw className={cn('h-3.5 w-3.5', busy === 'fetch' && 'animate-spin')} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            title="Pull (fast-forward only)"
            disabled={Boolean(busy)}
            onClick={() => act({ op: 'pull' }, 'pull')}
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            title="Push to GitHub"
            disabled={Boolean(busy)}
            onClick={() =>
              actElevated({ op: 'push', setUpstream: !status?.upstream }, 'push', {
                title: 'Push to GitHub?',
                description: `This publishes your commits to origin/${status?.branch ?? 'HEAD'}. Anyone with access to the repository will see them.`,
                actionLabel: 'Push',
                destructive: false,
              })
            }
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Commit box */}
      <div className="border-b border-border/40 p-2">
        <Textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={(event) => {
            // Ctrl/Cmd+Enter commits, matching VS Code.
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
              event.preventDefault();
              commit();
            }
          }}
          placeholder={`Message (${staged.length} staged)`}
          rows={2}
          className="min-h-[48px] resize-none text-xs"
        />
        <Button
          size="sm"
          className="mt-1.5 h-7 w-full text-xs"
          disabled={Boolean(busy) || !message.trim() || staged.length === 0}
          onClick={commit}
        >
          {busy === 'commit' ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <GitCommitHorizontal className="mr-1.5 h-3.5 w-3.5" />
          )}
          Commit {staged.length > 0 ? `(${staged.length})` : ''}
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-1.5 border-b border-red-500/30 bg-red-500/10 px-2 py-1.5 text-[11px] text-red-300">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
          <span className="min-w-0 whitespace-pre-wrap break-words">{error}</span>
        </div>
      )}

      {/* File lists */}
      <div className="flex-1 overflow-y-auto">
        {conflicted.length > 0 && (
          <section>
            <p className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-red-400">
              <AlertTriangle className="h-3 w-3" />
              Merge conflicts ({conflicted.length})
            </p>
            {conflicted.map((change) =>
              renderFileRow(
                change,
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    title="Ask Nexus AI to explain this conflict"
                    onClick={() => onExplainConflict(change.path)}
                  >
                    <span className="text-[10px] font-bold">AI</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    title="Mark resolved (stage)"
                    onClick={() => act({ op: 'stage', paths: [change.path] }, 'stage')}
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                </>
              )
            )}
          </section>
        )}

        {staged.length > 0 && (
          <section>
            <button
              type="button"
              onClick={() => setShowStaged((v) => !v)}
              className="flex w-full items-center gap-1 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              {showStaged ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              Staged changes
              <Badge variant="outline" className="ml-1 h-4 px-1 text-[9px]">
                {staged.length}
              </Badge>
              <span
                role="button"
                tabIndex={0}
                className="ml-auto rounded px-1 hover:bg-accent"
                title="Unstage all"
                onClick={(event) => {
                  event.stopPropagation();
                  act({ op: 'unstage', paths: staged.map((f) => f.path) }, 'unstage');
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.stopPropagation();
                    act({ op: 'unstage', paths: staged.map((f) => f.path) }, 'unstage');
                  }
                }}
              >
                <Minus className="h-3 w-3" />
              </span>
            </button>

            {showStaged &&
              staged.map((change) =>
                renderFileRow(
                  change,
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    title="Unstage"
                    onClick={() => act({ op: 'unstage', paths: [change.path] }, 'unstage')}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                )
              )}
          </section>
        )}

        {unstaged.length > 0 && (
          <section>
            <button
              type="button"
              onClick={() => setShowChanges((v) => !v)}
              className="flex w-full items-center gap-1 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              {showChanges ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              Changes
              <Badge variant="outline" className="ml-1 h-4 px-1 text-[9px]">
                {unstaged.length}
              </Badge>
              <span
                role="button"
                tabIndex={0}
                className="ml-auto rounded px-1 hover:bg-accent"
                title="Stage all"
                onClick={(event) => {
                  event.stopPropagation();
                  act({ op: 'stage', paths: unstaged.map((f) => f.path) }, 'stage');
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.stopPropagation();
                    act({ op: 'stage', paths: unstaged.map((f) => f.path) }, 'stage');
                  }
                }}
              >
                <Plus className="h-3 w-3" />
              </span>
            </button>

            {showChanges &&
              unstaged.map((change) =>
                renderFileRow(
                  change,
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      title="Discard changes"
                      onClick={() =>
                        actElevated({ op: 'discard', paths: [change.path] }, 'discard', {
                          title: `Discard changes to ${basename(change.path)}?`,
                          description:
                            'Your local modifications to this file will be permanently lost. This cannot be undone.',
                          actionLabel: 'Discard changes',
                          destructive: true,
                        })
                      }
                    >
                      <Undo2 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      title="Stage"
                      onClick={() => act({ op: 'stage', paths: [change.path] }, 'stage')}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </>
                )
              )}
          </section>
        )}

        {status?.isClean && (
          <div className="flex flex-col items-center gap-1.5 px-4 py-10 text-center">
            <Check className="h-6 w-6 text-emerald-400/70" />
            <p className="text-xs text-muted-foreground">No changes — the working tree is clean.</p>
          </div>
        )}

        {!status && busy && (
          <div className="flex items-center justify-center gap-2 py-10 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Reading repository status…
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-1 border-t border-border/40 px-2 py-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 gap-1.5 px-1.5 text-[11px]"
          onClick={refresh}
          disabled={Boolean(busy)}
        >
          <RotateCcw className={cn('h-3 w-3', busy === 'refresh' && 'animate-spin')} />
          Refresh
        </Button>
        {status?.upstream && (
          <span className="ml-auto truncate text-[10px] text-muted-foreground">
            {status.upstream}
          </span>
        )}
      </div>

      {/* Destructive confirmation */}
      <AlertDialog open={Boolean(confirm)} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirm?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={cn(
                confirm?.destructive &&
                  'bg-destructive text-destructive-foreground hover:bg-destructive/90'
              )}
              onClick={() => {
                const pending = confirm;
                setConfirm(null);
                pending?.run();
              }}
            >
              {confirm?.actionLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
