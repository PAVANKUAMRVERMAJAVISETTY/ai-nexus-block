'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  FileDiff,
  Loader2,
  Send,
  Square,
  Terminal,
  User as UserIcon,
  X,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { assistantIdentity } from '@/config/ide';
import { ideClient, IdeApiError, type AgentSessionResponse } from '../services/ide-client';
import type { IdeAgentAction } from '@/types/ide';

type AgentSession = AgentSessionResponse['session'];
type SessionResponse = AgentSessionResponse;

const ACTIVE_STATUSES = ['planning', 'awaiting_command'];

const STATUS_LABEL: Record<AgentSession['status'], string> = {
  planning: 'Thinking',
  awaiting_command: 'Running command',
  awaiting_approval: 'Waiting for your approval',
  awaiting_input: 'Waiting for your answer',
  completed: 'Done',
  failed: 'Stopped',
  cancelled: 'Stopped by you',
};

interface AgentPanelProps {
  projectId: string;
  activeFilePath: string | null;
  selection: { text: string; startLine: number; endLine: number } | null;
  onReviewAction: (action: IdeAgentAction) => void;
  /** Bumped by the parent after an approval is resolved, to resume the loop. */
  approvalResolvedAt: number;
}

export function AgentPanel({
  projectId,
  activeFilePath,
  selection,
  onReviewAction,
  approvalResolvedAt,
}: AgentPanelProps) {
  const [input, setInput] = useState('');
  const [session, setSession] = useState<AgentSession | null>(null);
  const [verifications, setVerifications] = useState<{ tool: string; passed: boolean }[]>([]);
  const [filesChanged, setFilesChanged] = useState<string[]>([]);
  const [report, setReport] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState('');

  const endRef = useRef<HTMLDivElement | null>(null);
  const sessionRef = useRef<AgentSession | null>(null);
  sessionRef.current = session;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.transcript.length, busy]);

  const apply = useCallback((data: SessionResponse) => {
    setSession(data.session);
    setVerifications(data.verifications);
    setFilesChanged(data.filesChanged);
    setReport(data.report);
  }, []);

  /**
   * Drive the loop forward.
   * The server advances a bounded number of steps per call and parks on
   * anything that needs the user or the local agent, so the UI keeps calling
   * until the session either finishes or is waiting on something.
   */
  useEffect(() => {
    if (!session || !ACTIVE_STATUSES.includes(session.status)) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      if (cancelled) return;
      try {
        const data = await ideClient.advanceAgentSession(session.id, {
          activeFilePath,
          selection: selection?.text ?? null,
        });
        if (!cancelled) apply(data);
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : 'The task could not continue.');
          setSession((prev) => (prev ? { ...prev, status: 'failed' } : prev));
        }
      }
    }, 1200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [session, activeFilePath, selection, apply]);

  /** Resume once the parent reports that an approval was resolved. */
  useEffect(() => {
    const current = sessionRef.current;
    if (!approvalResolvedAt || !current || current.status !== 'awaiting_approval') return;

    ideClient
      .resolveAgentApproval(current.id)
      .then(apply)
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : 'Could not resume the task.');
      });
  }, [approvalResolvedAt, apply]);

  const start = async () => {
    const goal = input.trim();
    if (!goal || busy) return;

    setBusy(true);
    setReport(null);
    setVerifications([]);
    setFilesChanged([]);

    try {
      // A follow-up on a finished task CONTINUES it, keeping the transcript as
      // context, so "use Supabase" after "create authentication" is understood
      // as the same piece of work rather than a brand-new request.
      const data =
        session && ['completed', 'failed', 'cancelled'].includes(session.status)
          ? await ideClient.continueAgentSession(session.id, goal, {
              activeFilePath,
              selection: selection?.text ?? null,
            })
          : await ideClient.startAgentSession({
              projectId,
              goal,
              activeFilePath,
              selection: selection?.text ?? null,
            });
      apply(data);
      setInput('');
    } catch (error) {
      const message =
        error instanceof IdeApiError ? error.message : 'The task could not be started.';
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const stop = async () => {
    if (!session) return;
    try {
      apply(await ideClient.cancelAgentSession(session.id));
      toast.info('Stopped.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not stop the task.');
    }
  };

  const sendAnswer = async () => {
    if (!session || !answer.trim()) return;
    try {
      apply(await ideClient.answerAgentSession(session.id, answer.trim()));
      setAnswer('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not send the answer.');
    }
  };

  const openPendingDiff = async () => {
    if (!session?.pending_action_id) return;
    try {
      const { action } = await ideClient.getAction(session.pending_action_id);
      onReviewAction(action);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load the change.');
    }
  };

  const isActive = session ? ACTIVE_STATUSES.includes(session.status) : false;
  const isTerminal = session
    ? ['completed', 'failed', 'cancelled'].includes(session.status)
    : false;

  return (
    <div className="flex h-full flex-col bg-card/40">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border/40 px-3 py-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/15 text-primary">
          <Bot className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-foreground">
            {assistantIdentity.name}
          </p>
          <p className="truncate text-[10px] text-muted-foreground">
            {session ? STATUS_LABEL[session.status] : 'Ready for a task'}
          </p>
        </div>

        {isActive ? (
          <Button
            size="sm"
            variant="outline"
            className="h-6 gap-1 px-2 text-[11px]"
            onClick={stop}
          >
            <Square className="h-3 w-3" />
            Stop
          </Button>
        ) : session ? (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-[11px] text-muted-foreground"
            onClick={() => {
              setSession(null);
              setReport(null);
              setVerifications([]);
              setFilesChanged([]);
            }}
            title="Start a fresh task without the previous context"
          >
            New task
          </Button>
        ) : null}
      </div>

      {/* Activity feed */}
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {!session ? (
          <div className="flex h-full flex-col items-center justify-center px-2 text-center">
            <Bot className="mb-3 h-8 w-8 text-primary/50" />
            <p className="text-sm font-semibold text-foreground">Give me a task</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              I will read your project, propose changes for you to approve, and run the
              verification on your machine.
            </p>

            <div className="mt-4 w-full space-y-1.5 text-left">
              {[
                'Run the tests and fix whatever fails',
                'Find where authentication is handled',
                'Add a loading state to the dashboard',
                'Why is the build failing?',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setInput(suggestion)}
                  className="w-full rounded-md border border-border/40 bg-muted/30 px-2.5 py-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {session.transcript.map((entry, index) => {
              if (entry.type === 'user') {
                return (
                  <div key={index} className="flex gap-2">
                    <UserIcon className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                    <p className="min-w-0 flex-1 whitespace-pre-wrap text-[12.5px] text-foreground">
                      {entry.content}
                    </p>
                  </div>
                );
              }

              if (entry.type === 'assistant') {
                if (!entry.content.trim()) return null;
                return (
                  <p
                    key={index}
                    className="whitespace-pre-wrap pl-5 text-[12.5px] leading-relaxed text-foreground"
                  >
                    {entry.content}
                  </p>
                );
              }

              if (entry.type === 'tool_call') {
                return (
                  <div
                    key={index}
                    className="flex items-center gap-1.5 pl-5 text-[11px] text-muted-foreground"
                  >
                    <ChevronRight className="h-3 w-3 shrink-0 text-primary" />
                    <span className="truncate font-mono">{entry.label}</span>
                  </div>
                );
              }

              if (entry.type === 'observation') {
                const isCommand = /run|test|build|typecheck|lint|git/.test(entry.tool);
                return (
                  <div key={index} className="pl-8">
                    <div
                      className={cn(
                        'flex items-start gap-1.5 rounded border px-2 py-1 text-[10.5px]',
                        entry.ok
                          ? 'border-border/40 bg-muted/30 text-muted-foreground'
                          : 'border-red-500/30 bg-red-500/10 text-red-300'
                      )}
                    >
                      {isCommand ? (
                        <Terminal className="mt-0.5 h-3 w-3 shrink-0" />
                      ) : entry.ok ? (
                        <Check className="mt-0.5 h-3 w-3 shrink-0" />
                      ) : (
                        <X className="mt-0.5 h-3 w-3 shrink-0" />
                      )}
                      <pre className="min-w-0 flex-1 overflow-x-auto whitespace-pre-wrap break-words font-mono">
                        {entry.content.length > 700
                          ? `${entry.content.slice(0, 700)}…`
                          : entry.content}
                      </pre>
                    </div>
                  </div>
                );
              }

              return (
                <p key={index} className="pl-5 text-[11px] italic text-amber-400">
                  {entry.content}
                </p>
              );
            })}

            {isActive && (
              <div className="flex items-center gap-2 pl-5 text-[11px] text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
                {session.status === 'awaiting_command'
                  ? 'Waiting for your local agent to finish the command…'
                  : 'Working…'}
                <span className="ml-auto opacity-60">
                  step {session.iterations} · {session.tool_calls} tools
                </span>
              </div>
            )}

            {/* Pending approval */}
            {session.status === 'awaiting_approval' && (
              <button
                type="button"
                onClick={openPendingDiff}
                className="flex w-full items-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-2.5 py-2 text-left transition-colors hover:bg-primary/20"
              >
                <FileDiff className="h-4 w-4 shrink-0 text-primary" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[12px] font-medium text-foreground">
                    A change is waiting for your review
                  </span>
                  <span className="block text-[10px] text-muted-foreground">
                    Nothing is applied until you approve it.
                  </span>
                </span>
                <Badge variant="outline" className="h-5 shrink-0 px-1.5 text-[10px]">
                  Review
                </Badge>
              </button>
            )}

            {/* Pending question */}
            {session.status === 'awaiting_input' && session.pending_question && (
              <div className="space-y-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 p-2.5">
                <p className="text-[12px] text-amber-200">{session.pending_question}</p>
                <div className="flex gap-1.5">
                  <Textarea
                    value={answer}
                    onChange={(event) => setAnswer(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        sendAnswer();
                      }
                    }}
                    rows={1}
                    placeholder="Your answer…"
                    className="min-h-[32px] resize-none text-xs"
                  />
                  <Button size="sm" className="h-8 px-2" onClick={sendAnswer} disabled={!answer.trim()}>
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* Final report */}
            {isTerminal && report && (
              <div
                className={cn(
                  'space-y-1.5 rounded-md border p-2.5 text-[12px]',
                  session.success === true
                    ? 'border-emerald-500/30 bg-emerald-500/10'
                    : session.status === 'cancelled'
                      ? 'border-border/40 bg-muted/30'
                      : 'border-amber-500/30 bg-amber-500/10'
                )}
              >
                <p className="flex items-center gap-1.5 font-semibold text-foreground">
                  {session.success === true ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  ) : session.status === 'cancelled' ? (
                    <CircleDot className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                  )}
                  {session.success === true
                    ? 'Task complete and verified'
                    : session.status === 'cancelled'
                      ? 'Stopped'
                      : 'Finished — not verified'}
                </p>

                <div className="whitespace-pre-wrap text-muted-foreground">{report}</div>

                {verifications.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {verifications.map((v) => (
                      <Badge
                        key={v.tool}
                        variant="outline"
                        className={cn(
                          'h-5 gap-1 px-1.5 text-[10px]',
                          v.passed ? 'text-emerald-400' : 'text-red-400'
                        )}
                      >
                        {v.passed ? (
                          <Check className="h-2.5 w-2.5" />
                        ) : (
                          <XCircle className="h-2.5 w-2.5" />
                        )}
                        {v.tool.replace('_run', '')}
                      </Badge>
                    ))}
                  </div>
                )}

                {filesChanged.length > 0 && (
                  <p className="pt-1 text-[10px] text-muted-foreground">
                    Changed: {filesChanged.join(', ')}
                  </p>
                )}
              </div>
            )}
          </>
        )}

        <div ref={endRef} />
      </div>

      {/* Composer */}
      <div className="border-t border-border/40 p-2">
        {selection?.text && (
          <p className="mb-1.5 truncate rounded-md border border-border/40 bg-muted/40 px-2 py-1 text-[10px] text-muted-foreground">
            Selection included · lines {selection.startLine}–{selection.endLine}
          </p>
        )}

        <div className="flex items-end gap-1.5">
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                start();
              }
            }}
            placeholder={
              isActive
                ? 'Working — press Stop to interrupt'
                : isTerminal
                  ? 'Follow up on this task…'
                  : 'Describe what you want built or fixed…'
            }
            rows={2}
            disabled={busy || isActive}
            className="min-h-[52px] resize-none text-xs"
          />
          <Button
            size="icon"
            className="h-[52px] w-9 shrink-0"
            disabled={busy || isActive || !input.trim()}
            onClick={start}
            aria-label="Start task"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
