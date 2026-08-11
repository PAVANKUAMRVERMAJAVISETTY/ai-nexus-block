'use client';

import { AlertCircle, AlertTriangle, CheckCircle2, Info, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { IdeProblem } from '@/types/ide';

const SEVERITY = {
  error: { icon: AlertCircle, className: 'text-red-400' },
  warning: { icon: AlertTriangle, className: 'text-amber-400' },
  info: { icon: Info, className: 'text-sky-400' },
} as const;

interface ProblemsPanelProps {
  problems: IdeProblem[];
  hasRun: boolean;
  onOpenLocation: (path: string, line: number | null) => void;
  onExplain: (problem: IdeProblem) => void;
  onFix: (problem: IdeProblem) => void;
}

export function ProblemsPanel({
  problems,
  hasRun,
  onOpenLocation,
  onExplain,
  onFix,
}: ProblemsPanelProps) {
  if (!problems.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
        <CheckCircle2 className="h-7 w-7 text-emerald-400/70" />
        <p className="text-sm font-medium text-foreground">
          {hasRun ? 'No problems detected' : 'Nothing analyzed yet'}
        </p>
        <p className="max-w-sm text-xs text-muted-foreground">
          {hasRun
            ? 'The last command completed without producing any diagnostics.'
            : 'Run a build, typecheck, lint or test command and any errors it reports will be collected here.'}
        </p>
      </div>
    );
  }

  const errors = problems.filter((p) => p.severity === 'error').length;
  const warnings = problems.filter((p) => p.severity === 'warning').length;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border/40 px-3 py-1.5 text-[11px]">
        {errors > 0 && (
          <span className="flex items-center gap-1 text-red-400">
            <AlertCircle className="h-3.5 w-3.5" /> {errors} error{errors === 1 ? '' : 's'}
          </span>
        )}
        {warnings > 0 && (
          <span className="flex items-center gap-1 text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5" /> {warnings} warning
            {warnings === 1 ? '' : 's'}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {problems.map((problem) => {
          const severity = SEVERITY[problem.severity] ?? SEVERITY.info;
          const Icon = severity.icon;

          return (
            <div
              key={problem.id}
              className="group border-b border-border/20 px-3 py-2 hover:bg-accent/40"
            >
              <div className="flex items-start gap-2">
                <Icon className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', severity.className)} />

                <div className="min-w-0 flex-1">
                  <p className="text-[13px] leading-snug text-foreground">{problem.message}</p>

                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <Badge variant="outline" className="h-4 px-1.5 text-[10px] capitalize">
                      {problem.source}
                    </Badge>
                    {problem.code && <span className="font-mono">{problem.code}</span>}
                    {problem.file_path && (
                      <button
                        type="button"
                        onClick={() => onOpenLocation(problem.file_path!, problem.line)}
                        className="font-mono text-primary hover:underline"
                      >
                        {problem.file_path}
                        {problem.line ? `:${problem.line}` : ''}
                        {problem.column ? `:${problem.column}` : ''}
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-[11px]"
                    onClick={() => onExplain(problem)}
                  >
                    Explain
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 text-[11px]"
                    onClick={() => onFix(problem)}
                  >
                    <Sparkles className="mr-1 h-3 w-3" />
                    Fix
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
