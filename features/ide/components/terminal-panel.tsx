'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  CircleSlash,
  Loader2,
  Plug,
  Square,
  Terminal as TerminalIcon,
  Timer,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ideClient, IdeApiError } from '../services/ide-client';
import { runDefaults } from '@/config/ide';
import type { IdeAgentStatus, IdeProblem, IdeRun, IdeRunLog } from '@/types/ide';

const TERMINAL_STATUS: Record<
  string,
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  queued: { label: 'QUEUED', className: 'text-muted-foreground', icon: Timer },
  claimed: { label: 'STARTING', className: 'text-sky-400', icon: Loader2 },
  running: { label: 'RUNNING', className: 'text-sky-400', icon: Loader2 },
  success: { label: 'SUCCESS', className: 'text-emerald-400', icon: CheckCircle2 },
  error: { label: 'ERROR', className: 'text-red-400', icon: XCircle },
  cancelled: { label: 'CANCELLED', className: 'text-amber-400', icon: CircleSlash },
  timeout: { label: 'TIMED OUT', className: 'text-amber-400', icon: AlertTriangle },
};

interface TerminalPanelProps {
  projectId: string;
  agentStatus: IdeAgentStatus | null;
  scripts: Record<string, string>;
  onPairAgent: () => void;
  onProblems: (problems: IdeProblem[]) => void;
  onRunFinished: (run: IdeRun) => void;
  /** Command queued from elsewhere in the IDE (Run controls, AI validation). */
  pendingCommand: string | null;
  onPendingCommandHandled: () => void;
  onExplainFailure: (run: IdeRun) => void;
}

export function TerminalPanel({
  projectId,
  agentStatus,
  scripts,
  onPairAgent,
  onProblems,
  onRunFinished,
  pendingCommand,
  onPendingCommandHandled,
  onExplainFailure,
}: TerminalPanelProps) {
  const [command, setCommand] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [activeRun, setActiveRun] = useState<IdeRun | null>(null);
  const [lines, setLines] = useState<{ stream: string; text: string }[]>([]);
  const [queueing, setQueueing] = useState(false);

  const outputRef = useRef<HTMLDivElement | null>(null);
  const seqRef = useRef(-1);

  useEffect(() => {
    outputRef.current?.scrollTo({ top: outputRef.current.scrollHeight });
  }, [lines]);

  const isLive = activeRun
    ? ['queued', 'claimed', 'running'].includes(activeRun.status)
    : false;

  /** Poll an active run for incremental output. */
  useEffect(() => {
    if (!activeRun || !isLive) return;

    let cancelled = false;

    const poll = async () => {
      try {
        const data = await ideClient.getRun(activeRun.id, seqRef.current);
        if (cancelled) return;

        if (data.logs.length) {
          seqRef.current = data.logs[data.logs.length - 1].seq;
          setLines((prev) => [
            ...prev,
            ...data.logs.map((log: IdeRunLog) => ({ stream: log.stream, text: log.chunk })),
          ]);
        }

        setActiveRun(data.run);

        if (!['queued', 'claimed', 'running'].includes(data.run.status)) {
          // Final output can arrive in the run row rather than as log chunks.
          if (!data.logs.length && (data.run.stdout || data.run.stderr)) {
            setLines((prev) => [
              ...prev,
              ...(data.run.stdout ? [{ stream: 'stdout', text: data.run.stdout }] : []),
              ...(data.run.stderr ? [{ stream: 'stderr', text: data.run.stderr }] : []),
            ]);
          }
          onProblems(data.problems);
          onRunFinished(data.run);
        }
      } catch {
        // Transient poll failures are ignored; the next tick retries.
      }
    };

    const timer = setInterval(poll, runDefaults.pollIntervalMs);
    poll();

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [activeRun, isLive, onProblems, onRunFinished]);

  const queueCommand = useCallback(
    async (raw: string, confirmElevated = false) => {
      const trimmed = raw.trim();
      if (!trimmed || queueing) return;

      setQueueing(true);
      try {
        const result = await ideClient.queueRun({
          projectId,
          command: trimmed,
          confirmElevated,
        });

        seqRef.current = -1;
        setLines([{ stream: 'command', text: `$ ${trimmed}` }]);
        setActiveRun(result.run);
        setHistory((prev) => [trimmed, ...prev.filter((entry) => entry !== trimmed)].slice(0, 50));
        setHistoryIndex(-1);
        setCommand('');

        if (!result.agentOnline && result.message) {
          setLines((prev) => [...prev, { stream: 'system', text: result.message! }]);
        }
      } catch (error) {
        if (error instanceof IdeApiError && error.status === 428) {
          const confirmed = window.confirm(
            `${error.message}\n\nThis command can modify or publish code outside the IDE. Run it anyway?`
          );
          if (confirmed) {
            setQueueing(false);
            await queueCommand(raw, true);
            return;
          }
        } else {
          const message = error instanceof Error ? error.message : 'Could not queue the command.';
          setLines((prev) => [...prev, { stream: 'stderr', text: message }]);
          toast.error(message);
        }
      } finally {
        setQueueing(false);
      }
    },
    [projectId, queueing]
  );

  // Run a command handed over from the Run controls or an approved AI change.
  useEffect(() => {
    if (!pendingCommand) return;
    queueCommand(pendingCommand);
    onPendingCommandHandled();
  }, [pendingCommand, queueCommand, onPendingCommandHandled]);

  const cancelRun = async () => {
    if (!activeRun) return;
    try {
      const result = await ideClient.cancelRun(activeRun.id);
      setActiveRun(result.run);
      setLines((prev) => [
        ...prev,
        { stream: 'system', text: result.message ?? 'Run cancelled.' },
      ]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not cancel the run.');
    }
  };

  const status = activeRun ? TERMINAL_STATUS[activeRun.status] : null;
  const StatusIcon = status?.icon;
  const scriptNames = Object.keys(scripts);

  /* ------------------------------------------------------------------ */
  /* Not-connected state — never fake a terminal                         */
  /* ------------------------------------------------------------------ */

  if (agentStatus && !agentStatus.serverConfigured) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <Plug className="h-8 w-8 text-muted-foreground/50" />
        <div>
          <p className="text-sm font-semibold text-foreground">Command execution is unavailable</p>
          <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
            This server has no <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code>, so a
            Nexus Local Development Agent cannot connect. Editing and the AI assistant work
            normally; Run, Test and Build stay disabled until an administrator configures it.
          </p>
        </div>
      </div>
    );
  }

  if (agentStatus && !agentStatus.connected && !activeRun) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <TerminalIcon className="h-8 w-8 text-muted-foreground/50" />
        <div>
          <p className="text-sm font-semibold text-foreground">No local agent connected</p>
          <p className="mx-auto mt-1 max-w-lg text-xs leading-relaxed text-muted-foreground">
            Your code runs on your own machine, never on this server. Pair a Nexus Local
            Development Agent to run commands — it executes only allow-listed programs, without a
            shell, in a directory you choose.
          </p>
        </div>
        <Button size="sm" className="h-8 text-xs" onClick={onPairAgent}>
          <Plug className="mr-2 h-3.5 w-3.5" />
          Pair local agent
        </Button>
        {agentStatus.device?.last_seen_at && (
          <p className="text-[11px] text-muted-foreground">
            Last seen {agentStatus.lastSeenSecondsAgo}s ago — is the agent still running?
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Run summary */}
      {activeRun && (
        <div className="flex items-center gap-3 border-b border-border/40 px-3 py-1.5 text-[11px]">
          {StatusIcon && (
            <span className={cn('flex items-center gap-1.5 font-semibold', status?.className)}>
              <StatusIcon className={cn('h-3.5 w-3.5', isLive && 'animate-spin')} />
              {status?.label}
            </span>
          )}
          <span className="font-mono text-muted-foreground">{activeRun.command}</span>

          {activeRun.exit_code !== null && (
            <Badge
              variant="outline"
              className={cn(
                'h-4 px-1.5 text-[10px]',
                activeRun.exit_code === 0 ? 'text-emerald-400' : 'text-red-400'
              )}
            >
              exit {activeRun.exit_code}
            </Badge>
          )}
          {activeRun.duration_ms !== null && (
            <span className="text-muted-foreground">{activeRun.duration_ms}ms</span>
          )}

          <div className="ml-auto flex items-center gap-1">
            {activeRun.status === 'error' && (
              <Button
                size="sm"
                variant="outline"
                className="h-6 px-2 text-[11px]"
                onClick={() => onExplainFailure(activeRun)}
              >
                Ask Nexus AI
              </Button>
            )}
            {isLive && (
              <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={cancelRun}>
                <Square className="mr-1 h-3 w-3" /> Stop
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Output */}
      <div
        ref={outputRef}
        className="flex-1 overflow-y-auto bg-[#0a0f19] px-3 py-2 font-mono text-[12px] leading-relaxed"
      >
        {lines.length === 0 && !activeRun && (
          <div className="text-muted-foreground">
            <p>Nexus terminal — connected to your local agent.</p>
            {scriptNames.length > 0 && (
              <p className="mt-1">
                Detected scripts:{' '}
                {scriptNames.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => queueCommand(`npm run ${name}`)}
                    className="mr-1 text-primary hover:underline"
                  >
                    {name}
                  </button>
                ))}
              </p>
            )}
          </div>
        )}

        {lines.map((line, index) => (
          <pre
            key={index}
            className={cn(
              'whitespace-pre-wrap break-words',
              line.stream === 'stderr' && 'text-red-400',
              line.stream === 'command' && 'font-semibold text-primary',
              line.stream === 'system' && 'text-amber-400',
              line.stream === 'stdout' && 'text-[#dbe3ee]'
            )}
          >
            {line.text}
          </pre>
        ))}

        {isLive && (
          <div className="mt-1 flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            {activeRun?.status === 'queued'
              ? 'Waiting for the local agent to pick this up…'
              : 'Running…'}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 border-t border-border/40 px-3 py-2">
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-primary" />
        <Input
          value={command}
          onChange={(event) => setCommand(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              queueCommand(command);
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              const next = Math.min(historyIndex + 1, history.length - 1);
              if (history[next]) {
                setHistoryIndex(next);
                setCommand(history[next]);
              }
            } else if (event.key === 'ArrowDown') {
              event.preventDefault();
              const next = historyIndex - 1;
              setHistoryIndex(next);
              setCommand(next >= 0 ? history[next] ?? '' : '');
            }
          }}
          placeholder="npm run build"
          disabled={queueing || isLive}
          className="h-7 border-0 bg-transparent px-0 font-mono text-xs focus-visible:ring-0"
        />
        <Button
          size="sm"
          className="h-7 px-3 text-xs"
          disabled={!command.trim() || queueing || isLive}
          onClick={() => queueCommand(command)}
        >
          {queueing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Run'}
        </Button>
      </div>
    </div>
  );
}
