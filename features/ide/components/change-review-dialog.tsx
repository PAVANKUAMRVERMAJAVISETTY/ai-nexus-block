'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, Check, FileDiff, Loader2, ShieldAlert, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { describeOperation, describeRisk } from '@/lib/ide/actions';
import type { IdeAgentAction, IdeFileOperation } from '@/types/ide';

/**
 * Minimal line diff. Not a Myers diff — it aligns identical prefixes and
 * suffixes and marks the middle as changed, which is enough to answer
 * "what is this about to do to my file?" without a diffing dependency.
 */
function computeDiff(before: string, after: string) {
  const beforeLines = before.length ? before.split('\n') : [];
  const afterLines = after.length ? after.split('\n') : [];

  let prefix = 0;
  while (
    prefix < beforeLines.length &&
    prefix < afterLines.length &&
    beforeLines[prefix] === afterLines[prefix]
  ) {
    prefix += 1;
  }

  let suffix = 0;
  while (
    suffix < beforeLines.length - prefix &&
    suffix < afterLines.length - prefix &&
    beforeLines[beforeLines.length - 1 - suffix] === afterLines[afterLines.length - 1 - suffix]
  ) {
    suffix += 1;
  }

  const rows: { type: 'context' | 'removed' | 'added'; text: string; line: number }[] = [];

  const contextStart = Math.max(0, prefix - 3);
  for (let i = contextStart; i < prefix; i += 1) {
    rows.push({ type: 'context', text: beforeLines[i], line: i + 1 });
  }

  for (let i = prefix; i < beforeLines.length - suffix; i += 1) {
    rows.push({ type: 'removed', text: beforeLines[i], line: i + 1 });
  }
  for (let i = prefix; i < afterLines.length - suffix; i += 1) {
    rows.push({ type: 'added', text: afterLines[i], line: i + 1 });
  }

  const tailEnd = Math.min(beforeLines.length, beforeLines.length - suffix + 3);
  for (let i = beforeLines.length - suffix; i < tailEnd; i += 1) {
    rows.push({ type: 'context', text: beforeLines[i], line: i + 1 });
  }

  return {
    rows,
    added: Math.max(0, afterLines.length - suffix - prefix),
    removed: Math.max(0, beforeLines.length - suffix - prefix),
  };
}

interface ChangeReviewDialogProps {
  action: IdeAgentAction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDecide: (decision: 'approve' | 'reject', confirmHighRisk: boolean) => Promise<void>;
}

export function ChangeReviewDialog({
  action,
  open,
  onOpenChange,
  onDecide,
}: ChangeReviewDialogProps) {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [confirmHighRisk, setConfirmHighRisk] = useState(false);
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);

  const operations: IdeFileOperation[] = useMemo(
    () => action?.proposed_change?.operations ?? [],
    [action]
  );

  const currentPath = selectedPath ?? operations[0]?.path ?? null;
  const current = operations.find((op) => op.path === currentPath) ?? null;

  const diff = useMemo(() => {
    if (!current) return null;
    if (current.type === 'delete') {
      return computeDiff(current.previousContent ?? '', '');
    }
    if (current.type === 'rename') return null;
    return computeDiff(current.previousContent ?? '', current.content ?? '');
  }, [current]);

  const isHighRisk = action?.risk === 'high';
  const canApprove = !isHighRisk || confirmHighRisk;

  const decide = async (decision: 'approve' | 'reject') => {
    setBusy(decision);
    try {
      await onDecide(decision, confirmHighRisk);
      onOpenChange(false);
      setConfirmHighRisk(false);
      setSelectedPath(null);
    } finally {
      setBusy(null);
    }
  };

  if (!action) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[85vh] max-w-5xl flex-col gap-0 p-0">
        <DialogHeader className="border-b border-border/40 px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <DialogTitle className="flex items-center gap-2 text-base">
                <FileDiff className="h-4 w-4 text-primary" />
                {action.title}
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs">
                {action.summary || 'Review the proposed changes before applying them.'}
              </DialogDescription>
            </div>
            <Badge
              variant="outline"
              className={cn(
                'shrink-0 capitalize',
                action.risk === 'high' && 'border-red-500/40 text-red-400',
                action.risk === 'medium' && 'border-amber-500/40 text-amber-400',
                action.risk === 'low' && 'border-emerald-500/40 text-emerald-400'
              )}
            >
              {action.risk} risk
            </Badge>
          </div>
        </DialogHeader>

        <div className="flex min-h-0 flex-1">
          {/* File list */}
          <div className="w-64 shrink-0 overflow-y-auto border-r border-border/40 bg-card/40">
            <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {operations.length} file{operations.length === 1 ? '' : 's'}
            </p>
            {operations.map((operation) => (
              <button
                key={operation.path}
                type="button"
                onClick={() => setSelectedPath(operation.path)}
                className={cn(
                  'w-full border-l-2 px-3 py-2 text-left text-xs transition-colors hover:bg-accent/60',
                  currentPath === operation.path
                    ? 'border-primary bg-accent'
                    : 'border-transparent'
                )}
              >
                <span
                  className={cn(
                    'block font-medium',
                    operation.type === 'delete' && 'text-red-400',
                    operation.type === 'create' && 'text-emerald-400',
                    operation.type === 'rename' && 'text-amber-400',
                    operation.type === 'update' && 'text-foreground'
                  )}
                >
                  {describeOperation(operation)}
                </span>
              </button>
            ))}
          </div>

          {/* Diff */}
          <div className="flex min-w-0 flex-1 flex-col">
            {current && (
              <div className="flex items-center gap-3 border-b border-border/40 px-4 py-2 text-[11px]">
                <span className="font-mono text-foreground">{current.path}</span>
                {diff && (
                  <>
                    <span className="text-emerald-400">+{diff.added}</span>
                    <span className="text-red-400">−{diff.removed}</span>
                  </>
                )}
              </div>
            )}

            <div className="flex-1 overflow-auto bg-[#0a0f19] p-3 font-mono text-[12px] leading-relaxed">
              {current?.type === 'rename' ? (
                <p className="text-amber-400">
                  Rename {current.path} → {current.newPath}
                </p>
              ) : diff?.rows.length ? (
                diff.rows.map((row, index) => (
                  <div
                    key={index}
                    className={cn(
                      'flex gap-3 whitespace-pre-wrap break-all px-1',
                      row.type === 'added' && 'bg-emerald-500/10 text-emerald-300',
                      row.type === 'removed' && 'bg-red-500/10 text-red-300',
                      row.type === 'context' && 'text-muted-foreground'
                    )}
                  >
                    <span className="w-8 shrink-0 select-none text-right opacity-50">
                      {row.line}
                    </span>
                    <span className="w-3 shrink-0 select-none">
                      {row.type === 'added' ? '+' : row.type === 'removed' ? '−' : ' '}
                    </span>
                    <span>{row.text || ' '}</span>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">No content differences to display.</p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col gap-3 border-t border-border/40 px-5 py-4 sm:flex-col sm:items-stretch">
          <div className="flex items-start gap-2 rounded-md border border-border/40 bg-muted/30 p-3">
            {isHighRisk ? (
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
            ) : (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <div className="min-w-0 text-xs">
              <p className="text-foreground">{describeRisk(action.risk, operations)}</p>
              {action.proposed_change?.validationCommand && (
                <p className="mt-1 text-muted-foreground">
                  After applying, <span className="font-mono text-foreground">
                    {action.proposed_change.validationCommand}
                  </span>{' '}
                  will be queued to verify the change.
                </p>
              )}
            </div>
          </div>

          {isHighRisk && (
            <label className="flex cursor-pointer items-center gap-2 text-xs text-foreground">
              <Checkbox
                checked={confirmHighRisk}
                onCheckedChange={(checked) => setConfirmHighRisk(checked === true)}
              />
              I understand this is a high-risk change and want to apply it.
            </label>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={busy !== null}
              onClick={() => decide('reject')}
            >
              {busy === 'reject' ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : (
                <X className="mr-2 h-3.5 w-3.5" />
              )}
              Reject
            </Button>
            <Button size="sm" disabled={busy !== null || !canApprove} onClick={() => decide('approve')}>
              {busy === 'approve' ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="mr-2 h-3.5 w-3.5" />
              )}
              Apply {operations.length} change{operations.length === 1 ? '' : 's'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
