'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertTriangle, LayoutDashboard, RefreshCw } from 'lucide-react';

/**
 * Error boundary for the workspace.
 *
 * Without this, a failure in any workspace page falls through to the root
 * boundary, which replaces the entire application shell — the user loses the
 * navigation and has no way back except the browser's back button. Catching it
 * here keeps the surrounding layout intact and offers a way out.
 */
export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[workspace]', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <AlertTriangle className="mb-4 h-10 w-10 text-destructive" />
      <h1 className="text-xl font-bold">This page could not be loaded</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Your work is not affected. Retry the page, or go back to the dashboard.
      </p>

      {/* The digest is the only handle on the server-side stack trace, which is
          deliberately not sent to the browser. */}
      {error.digest && (
        <p className="mt-3 font-mono text-xs text-muted-foreground/70">
          Reference: {error.digest}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <Button onClick={reset}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Try again
        </Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard">
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Back to dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}
