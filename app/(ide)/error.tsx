'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertTriangle, FolderOpen, RefreshCw } from 'lucide-react';

/**
 * Error boundary for the IDE.
 *
 * The IDE is the densest surface in the product — Monaco, the file tree, the
 * terminal, the agent panel and several polling loops. A failure in any one of
 * them previously took out the whole application shell via the root boundary.
 *
 * The reassurance here is specific and true: files live in the database and
 * unapplied agent changes stay pending until approved, so a crash in this view
 * does not discard work.
 */
export default function IdeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[ide]', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <AlertTriangle className="mb-4 h-10 w-10 text-destructive" />
      <h1 className="text-xl font-bold">The IDE hit an error</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Saved files and pending agent changes are stored on the server and were
        not lost. Reloading the workspace should restore them.
      </p>

      {error.digest && (
        <p className="mt-3 font-mono text-xs text-muted-foreground/70">
          Reference: {error.digest}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <Button onClick={reset}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Reload workspace
        </Button>
        <Button variant="outline" asChild>
          <Link href="/ide">
            <FolderOpen className="mr-2 h-4 w-4" />
            All projects
          </Link>
        </Button>
      </div>
    </div>
  );
}
