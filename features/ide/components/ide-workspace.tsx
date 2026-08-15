'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Blocks,
  Bot,
  Bug,
  ChevronLeft,
  CircleDot,
  Hammer,
  Loader2,
  FolderTree,
  GitBranch,
  Github,
  Play,
  Plug,
  Save,
  TerminalSquare,
  TestTube2,
  X,
} from 'lucide-react';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { useAuth } from '@/features/auth/hooks/use-auth';
import { workspaceNav } from '@/config/navigation';
import { assistantIdentity, scriptKindMap } from '@/config/ide';
import { basename, dirname } from '@/lib/ide/paths';
import { languageLabel } from '@/lib/ide/languages';
import { useIdeWorkspace } from '../hooks/use-ide-workspace';
import { ideClient } from '../services/ide-client';
import { CodeEditor } from './code-editor';
import { FileExplorer } from './file-explorer';
import { TerminalPanel } from './terminal-panel';
import { ProblemsPanel } from './problems-panel';
import { AiPanel, type AiPrefill } from './ai-panel';
import { AgentPanel } from './agent-panel';
import { ChangeReviewDialog } from './change-review-dialog';
import { AgentPairingDialog } from './agent-pairing-dialog';
import { SourceControlPanel } from './source-control-panel';
import { GitHubDialog } from './github-dialog';
import type { IdeAgentAction, IdeProblem, IdeRun } from '@/types/ide';

type BottomTab = 'terminal' | 'problems' | 'output';

export function IdeWorkspace({ projectId }: { projectId: string }) {
  const workspace = useIdeWorkspace(projectId);
  const { isSuperAdmin } = useAuth();

  const [bottomTab, setBottomTab] = useState<BottomTab>('terminal');
  const [pendingCommand, setPendingCommand] = useState<string | null>(null);
  const [reviewAction, setReviewAction] = useState<IdeAgentAction | null>(null);
  const [pairingOpen, setPairingOpen] = useState(false);
  const [githubOpen, setGithubOpen] = useState(false);
  const [githubConnected, setGithubConnected] = useState(false);
  const [sidebarView, setSidebarView] = useState<'explorer' | 'source-control'>('explorer');
  const [assistantMode, setAssistantMode] = useState<'agent' | 'chat'>('agent');
  // Bumped after an approval is resolved so a waiting agent session resumes.
  const [approvalResolvedAt, setApprovalResolvedAt] = useState(0);
  const [aiPrefill, setAiPrefill] = useState<AiPrefill | null>(null);
  const [selection, setSelection] = useState<{
    text: string;
    startLine: number;
    endLine: number;
  } | null>(null);
  const [revealLine, setRevealLine] = useState<number | null>(null);
  const [scripts, setScripts] = useState<Record<string, string>>({});
  const [editorWidth, setEditorWidth] = useState(1000);

  const editorContainerRef = useRef<HTMLDivElement | null>(null);

  /** Track editor width so the minimap only appears when there is room. */
  useEffect(() => {
    const element = editorContainerRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setEditorWidth(width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  /** Read package.json scripts so Run/Test/Build know what this project offers. */
  useEffect(() => {
    let cancelled = false;

    async function loadScripts() {
      const hasPackageJson = workspace.files.some((f) => f.file_path === 'package.json');
      if (!hasPackageJson) return;

      try {
        const { file } = await ideClient.readFile(projectId, 'package.json');
        if (cancelled) return;
        const parsed = JSON.parse(file.content) as { scripts?: Record<string, string> };
        setScripts(parsed.scripts ?? {});
      } catch {
        // A malformed package.json is the user's problem to fix, not a crash here.
      }
    }

    loadScripts();
    return () => {
      cancelled = true;
    };
  }, [projectId, workspace.files]);

  /** Whether this account has GitHub connected, for source-control states. */
  useEffect(() => {
    let cancelled = false;
    ideClient
      .getGitHubStatus()
      .then((status) => {
        if (!cancelled) setGithubConnected(status.connected);
      })
      .catch(() => {
        // Not fatal — the panel simply offers "Connect GitHub".
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** Surface the result of the OAuth redirect exactly once. */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const outcome = params.get('github');
    if (!outcome) return;

    const messages: Record<string, [string, 'success' | 'error' | 'info']> = {
      connected: [`GitHub connected as ${params.get('login') ?? 'your account'}.`, 'success'],
      cancelled: ['GitHub authorization was cancelled.', 'info'],
      invalid_state: ['That GitHub link expired. Start the connection again.', 'error'],
      user_mismatch: ['That GitHub link was issued for a different account.', 'error'],
      failed: ['GitHub connection failed. Please try again.', 'error'],
    };

    const entry = messages[outcome];
    if (entry) {
      const [text, level] = entry;
      if (level === 'success') toast.success(text);
      else if (level === 'error') toast.error(text);
      else toast.info(text);
      if (outcome === 'connected') setGithubConnected(true);
    }

    // Clean the query string so a refresh does not repeat the toast.
    const url = new URL(window.location.href);
    url.searchParams.delete('github');
    url.searchParams.delete('login');
    window.history.replaceState({}, '', url.toString());
  }, []);

  /** Ctrl/Cmd+S saves the active file from anywhere in the workspace. */
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        if (workspace.activePath) workspace.saveFile(workspace.activePath);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [workspace]);

  const runScript = useCallback(
    (script: string) => {
      setBottomTab('terminal');
      setPendingCommand(`npm run ${script}`);
    },
    []
  );

  const openLocation = useCallback(
    async (path: string, line: number | null) => {
      await workspace.openFile(path);
      setRevealLine(line);
      // Reset so re-clicking the same problem jumps again.
      setTimeout(() => setRevealLine(null), 400);
    },
    [workspace]
  );

  const handleProblems = useCallback(
    (problems: IdeProblem[]) => {
      workspace.setProblems(problems);
      if (problems.length) setBottomTab('problems');
    },
    [workspace]
  );

  const handleRunFinished = useCallback(
    (run: IdeRun) => {
      workspace.refreshRuns();
      if (run.status === 'success') {
        toast.success(`${run.command} completed in ${run.duration_ms ?? 0}ms`);
      } else if (run.status === 'error') {
        toast.error(`${run.command} failed with exit code ${run.exit_code ?? 'n/a'}`);
      }
    },
    [workspace]
  );

  const decideAction = useCallback(
    async (decision: 'approve' | 'reject', confirmHighRisk: boolean) => {
      if (!reviewAction) return;

      try {
        const result = await ideClient.decideAction(reviewAction.id, decision, confirmHighRisk);

        if (decision === 'reject') {
          toast.info('Change rejected. Nothing was modified.');
          setApprovalResolvedAt(Date.now());
          return;
        }

        if (result.applied) {
          toast.success(`Applied ${result.appliedOperations?.length ?? 0} change(s).`);
        } else {
          toast.error(
            `Some changes failed: ${(result.failedOperations ?? []).join('; ') || 'unknown error'}`
          );
        }

        await workspace.refreshFiles();

        // Let a waiting agent session know the decision so its loop resumes.
        setApprovalResolvedAt(Date.now());

        // Reload any open tab the change touched so the editor is never stale.
        for (const path of reviewAction.files_affected) {
          if (workspace.tabs.some((tab) => tab.path === path)) {
            // eslint-disable-next-line no-await-in-loop
            await workspace.openFile(path);
          }
        }

        if (result.validationCommand) {
          setBottomTab('terminal');
          setPendingCommand(result.validationCommand);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not apply the change.');
      }
    },
    [reviewAction, workspace]
  );

  const explainFailure = useCallback((run: IdeRun) => {
    setAssistantMode('chat');
    setAiPrefill({
      message: `The command \`${run.command}\` failed with exit code ${run.exit_code ?? 'n/a'}. Explain why and suggest the smallest safe fix.`,
      mode: 'debug',
      scope: { runId: run.id },
      autoSend: true,
    });
  }, []);

  const scriptEntries = useMemo(() => Object.entries(scripts), [scripts]);
  const runnable = useMemo(
    () => ({
      dev: scriptEntries.find(([name]) => scriptKindMap[name] === 'dev')?.[0],
      build: scriptEntries.find(([name]) => scriptKindMap[name] === 'build')?.[0],
      test: scriptEntries.find(([name]) => scriptKindMap[name] === 'test')?.[0],
      typecheck: scriptEntries.find(([name]) => scriptKindMap[name] === 'typecheck')?.[0],
    }),
    [scriptEntries]
  );

  const errorCount = workspace.problems.filter((p) => p.severity === 'error').length;
  const warningCount = workspace.problems.filter((p) => p.severity === 'warning').length;
  const dirtyCount = workspace.dirtyPaths.size;

  /* ------------------------------------------------------------------ */

  if (workspace.loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground">Opening project…</p>
      </div>
    );
  }

  if (workspace.error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 px-6 text-center">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm font-semibold text-foreground">Could not open this project</p>
        <p className="max-w-md text-xs text-muted-foreground">{workspace.error}</p>
        <Button asChild variant="outline" size="sm">
          <Link href="/ide">Back to projects</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* ---------------------------------------------------------- */}
      {/* Top bar                                                     */}
      {/* ---------------------------------------------------------- */}
      <header className="flex h-11 shrink-0 items-center gap-2 border-b border-border/40 bg-card/60 px-3">
        <Link
          href="/"
          className="flex items-center gap-1.5 transition-opacity hover:opacity-80"
          title="Back to the AI Nexus Block home page"
        >
          <Blocks className="h-4 w-4 text-primary" />
        </Link>

        <div className="h-4 w-px bg-border/60" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-xs">
              <span className="max-w-[180px] truncate font-medium">
                {workspace.project?.name}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel className="text-xs">Project</DropdownMenuLabel>
            <DropdownMenuItem asChild className="text-xs">
              <Link href="/ide">
                <ChevronLeft className="mr-2 h-3.5 w-3.5" />
                All projects
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs">Workspace</DropdownMenuLabel>
            {workspaceNav
              .filter((item) => item.href !== '/ide')
              .map((item) => (
                <DropdownMenuItem key={item.href} asChild className="text-xs">
                  <Link href={item.href}>
                    {item.icon && <item.icon className="mr-2 h-3.5 w-3.5" />}
                    {item.label}
                  </Link>
                </DropdownMenuItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="h-4 w-px bg-border/60" />

        {/* Case Study Read-Only Badge */}
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-[11px] font-medium bg-muted/60 text-muted-foreground border-border/40">
            Read-Only Case Study Viewer
          </Badge>
        </div>

        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <span className="text-[11px] italic">Explore structure & source code</span>
        </div>
      </header>

      {/* ---------------------------------------------------------- */}
      {/* Body                                                        */}
      {/* ---------------------------------------------------------- */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Explorer / Source Control */}
        <ResizablePanel defaultSize={19} minSize={14} maxSize={32}>
          <div className="flex h-full">
            {/* Activity bar */}
            <div className="flex w-9 shrink-0 flex-col items-center gap-1 border-r border-border/40 bg-card/60 py-2">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-7 w-7',
                  sidebarView === 'explorer' && 'bg-accent text-primary'
                )}
                onClick={() => setSidebarView('explorer')}
                title="Explorer"
                aria-label="Explorer"
                aria-pressed={sidebarView === 'explorer'}
              >
                <FolderTree className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'relative h-7 w-7',
                  sidebarView === 'source-control' && 'bg-accent text-primary'
                )}
                onClick={() => setSidebarView('source-control')}
                title="Source Control"
                aria-label="Source Control"
                aria-pressed={sidebarView === 'source-control'}
              >
                <GitBranch className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="mt-auto h-7 w-7"
                onClick={() => setGithubOpen(true)}
                title={githubConnected ? 'GitHub (connected)' : 'Connect GitHub'}
                aria-label="GitHub"
              >
                <Github
                  className={cn('h-4 w-4', githubConnected && 'text-emerald-400')}
                />
              </Button>
            </div>

            <div className="min-w-0 flex-1">
              {sidebarView === 'explorer' ? (
                <FileExplorer
                  tree={workspace.tree}
                  files={workspace.files}
                  activePath={workspace.activePath}
                  expandedDirs={workspace.expandedDirs}
                  dirtyPaths={workspace.dirtyPaths}
                  onOpen={workspace.openFile}
                  onToggleDir={workspace.toggleDir}
                  onCreate={workspace.createEntry}
                  onRename={workspace.renameEntry}
                  onDuplicate={workspace.duplicateEntry}
                  onDelete={workspace.deleteEntry}
                  onRefresh={workspace.refreshFiles}
                />
              ) : (
                <SourceControlPanel
                  projectId={projectId}
                  isGitRepo={Boolean(workspace.project?.github_repo_full_name)}
                  agentOnline={Boolean(workspace.agentStatus?.connected)}
                  githubConnected={githubConnected}
                  onOpenFile={workspace.openFile}
                  onConnectGitHub={() => setGithubOpen(true)}
                  onExplainConflict={(path) => {
                    setAssistantMode('chat');
                    setAiPrefill({
                      message: `Explain the merge conflict in ${path}. Describe both sides and what each change is trying to do. Do not resolve it — I will decide.`,
                      mode: 'explain',
                      scope: { activeFilePath: path },
                      autoSend: true,
                    });
                  }}
                />
              )}
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Editor + bottom panel */}
        <ResizablePanel defaultSize={54} minSize={30}>
          <ResizablePanelGroup direction="vertical">
            <ResizablePanel defaultSize={68} minSize={20}>
              <div className="flex h-full flex-col">
                {/* Tabs */}
                <div className="flex h-9 shrink-0 items-center overflow-x-auto border-b border-border/40 bg-card/40">
                  {workspace.tabs.map((tab) => {
                    const isDirty = tab.draftContent !== tab.savedContent;
                    const isActive = tab.path === workspace.activePath;

                    return (
                      <div
                        key={tab.path}
                        className={cn(
                          'group flex h-full shrink-0 items-center gap-1.5 border-r border-border/40 px-3 text-xs transition-colors',
                          isActive
                            ? 'bg-background text-foreground'
                            : 'text-muted-foreground hover:bg-accent/40'
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => workspace.setActivePath(tab.path)}
                          className="max-w-[160px] truncate"
                          title={tab.path}
                        >
                          {basename(tab.path)}
                        </button>
                        <button
                          type="button"
                          onClick={() => workspace.closeTab(tab.path)}
                          className="shrink-0 opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                          aria-label={`Close ${basename(tab.path)}`}
                        >
                          {isDirty ? (
                            <span className="block h-1.5 w-1.5 rounded-full bg-primary opacity-100" />
                          ) : (
                            <X className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Editor */}
                <div ref={editorContainerRef} className="min-h-0 flex-1">
                  {workspace.activeTab ? (
                    workspace.activeTab.loading ? (
                      <div className="flex h-full items-center justify-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading {basename(workspace.activeTab.path)}…
                      </div>
                    ) : (
                      <CodeEditor
                        path={workspace.activeTab.path}
                        value={workspace.activeTab.draftContent}
                        language={workspace.activeTab.language}
                        readOnly={workspace.activeTab.readOnly}
                        problems={workspace.problems}
                        width={editorWidth}
                        revealLine={revealLine}
                        onChange={(value) =>
                          workspace.updateDraft(workspace.activeTab!.path, value)
                        }
                        onSave={() => workspace.saveFile(workspace.activeTab!.path)}
                        onSelectionChange={(text, startLine, endLine) =>
                          setSelection(text ? { text, startLine, endLine } : null)
                        }
                      />
                    )
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                      <Blocks className="h-10 w-10 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">No file open</p>
                      <p className="text-xs text-muted-foreground/70">
                        Pick a file from the explorer to start editing.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Bottom panel */}
            <ResizablePanel defaultSize={32} minSize={10}>
              <div className="flex h-full flex-col">
                <Tabs
                  value={bottomTab}
                  onValueChange={(value) => setBottomTab(value as BottomTab)}
                  className="flex h-full flex-col"
                >
                  <div className="flex h-8 shrink-0 items-center border-b border-border/40 bg-card/40 px-2">
                    <TabsList className="h-6 bg-transparent p-0">
                      <TabsTrigger value="terminal" className="h-6 gap-1.5 px-2 text-[11px]">
                        <TerminalSquare className="h-3.5 w-3.5" />
                        Terminal
                      </TabsTrigger>
                      <TabsTrigger value="problems" className="h-6 gap-1.5 px-2 text-[11px]">
                        <AlertCircle className="h-3.5 w-3.5" />
                        Problems
                        {errorCount + warningCount > 0 && (
                          <Badge
                            variant="outline"
                            className={cn(
                              'ml-1 h-4 px-1 text-[9px]',
                              errorCount > 0 ? 'text-red-400' : 'text-amber-400'
                            )}
                          >
                            {errorCount + warningCount}
                          </Badge>
                        )}
                      </TabsTrigger>
                      <TabsTrigger value="output" className="h-6 gap-1.5 px-2 text-[11px]">
                        Output
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <div className="min-h-0 flex-1">
                    <div className={cn('h-full', bottomTab !== 'terminal' && 'hidden')}>
                      {/* Kept mounted so a running command survives tab switches. */}
                      <TerminalPanel
                        projectId={projectId}
                        agentStatus={workspace.agentStatus}
                        scripts={scripts}
                        onPairAgent={() => setPairingOpen(true)}
                        onProblems={handleProblems}
                        onRunFinished={handleRunFinished}
                        pendingCommand={pendingCommand}
                        onPendingCommandHandled={() => setPendingCommand(null)}
                        onExplainFailure={explainFailure}
                      />
                    </div>

                    {bottomTab === 'problems' && (
                      <ProblemsPanel
                        problems={workspace.problems}
                        hasRun={workspace.runs.length > 0}
                        onOpenLocation={openLocation}
                        onExplain={(problem) => {
                          setAssistantMode('chat');
                          setAiPrefill({
                            message: `Explain this error: "${problem.message}"${
                              problem.file_path
                                ? ` in ${problem.file_path}${problem.line ? `:${problem.line}` : ''}`
                                : ''
                            }`,
                            mode: 'debug',
                            autoSend: true,
                          });
                        }}
                        onFix={(problem) => {
                          setAssistantMode('chat');
                          setAiPrefill({
                            message: `Fix this error: "${problem.message}"${
                              problem.file_path
                                ? ` in ${problem.file_path}${problem.line ? `:${problem.line}` : ''}`
                                : ''
                            }. Propose the smallest safe change.`,
                            mode: 'fix',
                            scope: { activeFilePath: problem.file_path },
                            autoSend: true,
                          });
                        }}
                      />
                    )}

                    {bottomTab === 'output' && (
                      <div className="h-full overflow-y-auto p-3">
                        {workspace.runs.length ? (
                          <div className="space-y-1">
                            {workspace.runs.map((run) => (
                              <div
                                key={run.id}
                                className="flex items-center gap-3 rounded-md border border-border/30 px-2.5 py-1.5 text-[11px]"
                              >
                                <span
                                  className={cn(
                                    'font-semibold uppercase',
                                    run.status === 'success' && 'text-emerald-400',
                                    run.status === 'error' && 'text-red-400',
                                    ['queued', 'claimed', 'running'].includes(run.status) &&
                                      'text-sky-400',
                                    ['cancelled', 'timeout'].includes(run.status) &&
                                      'text-amber-400'
                                  )}
                                >
                                  {run.status}
                                </span>
                                <span className="font-mono text-foreground">{run.command}</span>
                                <span className="ml-auto text-muted-foreground">
                                  {run.duration_ms !== null ? `${run.duration_ms}ms` : '—'}
                                </span>
                                <span className="text-muted-foreground">
                                  {new Date(run.created_at).toLocaleTimeString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="py-6 text-center text-xs text-muted-foreground">
                            No commands have been run in this project yet.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </Tabs>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* AI panel */}
        <ResizablePanel defaultSize={27} minSize={18} maxSize={45}>
          <div className="flex h-full flex-col">
            <div className="flex shrink-0 items-center gap-1 border-b border-border/40 bg-card/60 px-2 py-1">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'h-6 px-2 text-[11px]',
                  assistantMode === 'agent' && 'bg-accent text-foreground'
                )}
                onClick={() => setAssistantMode('agent')}
                aria-pressed={assistantMode === 'agent'}
              >
                Agent
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'h-6 px-2 text-[11px]',
                  assistantMode === 'chat' && 'bg-accent text-foreground'
                )}
                onClick={() => setAssistantMode('chat')}
                aria-pressed={assistantMode === 'chat'}
              >
                Chat
              </Button>
              <span className="ml-auto pr-1 text-[9px] text-muted-foreground">
                {assistantMode === 'agent' ? 'builds and verifies' : 'explains and advises'}
              </span>
            </div>

            <div className="min-h-0 flex-1">
              {assistantMode === 'agent' ? (
                <AgentPanel
                  projectId={projectId}
                  activeFilePath={workspace.activePath}
                  selection={selection}
                  onReviewAction={setReviewAction}
                  approvalResolvedAt={approvalResolvedAt}
                />
              ) : (
                <AiPanel
                  projectId={projectId}
                  activeFilePath={workspace.activePath}
                  selection={selection}
                  prefill={aiPrefill}
                  onPrefillHandled={() => setAiPrefill(null)}
                  onReviewAction={setReviewAction}
                  isAdmin={Boolean(isSuperAdmin)}
                />
              )}
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* ---------------------------------------------------------- */}
      {/* Status bar                                                  */}
      {/* ---------------------------------------------------------- */}
      <footer className="flex h-6 shrink-0 items-center gap-3 border-t border-border/40 bg-card/60 px-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Bot className="h-3 w-3 text-primary" />
          {assistantIdentity.name}
        </span>

        {workspace.activeTab && (
          <>
            <span className="truncate font-mono">
              {dirname(workspace.activeTab.path) || '/'}
            </span>
            <span>{languageLabel(workspace.activeTab.language)}</span>
          </>
        )}

        <span className="ml-auto flex items-center gap-3">
          {errorCount > 0 && <span className="text-red-400">{errorCount} errors</span>}
          {warningCount > 0 && <span className="text-amber-400">{warningCount} warnings</span>}
          <span>{workspace.files.filter((f) => !f.is_directory).length} files</span>
          <span className="flex items-center gap-1">
            <Plug className="h-3 w-3" />
            {workspace.agentStatus?.connected ? 'agent online' : 'agent offline'}
          </span>
        </span>
      </footer>

      {/* ---------------------------------------------------------- */}
      {/* Dialogs                                                     */}
      {/* ---------------------------------------------------------- */}
      <ChangeReviewDialog
        action={reviewAction}
        open={Boolean(reviewAction)}
        onOpenChange={(open) => !open && setReviewAction(null)}
        onDecide={decideAction}
      />

      <AgentPairingDialog
        open={pairingOpen}
        onOpenChange={setPairingOpen}
        onPaired={workspace.refreshAgentStatus}
      />

      <GitHubDialog
        open={githubOpen}
        onOpenChange={setGithubOpen}
        onConnectionChanged={() => {
          ideClient
            .getGitHubStatus()
            .then((status) => setGithubConnected(status.connected))
            .catch(() => setGithubConnected(false));
        }}
      />
    </div>
  );
}
