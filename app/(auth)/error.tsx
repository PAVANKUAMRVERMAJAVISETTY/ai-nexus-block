'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertTriangle, LogIn, RefreshCw } from 'lucide-react';

/**
 * Error boundary for the auth pages.
 *
 * These are the pages a locked-out user reaches, so the escape hatch matters
 * more here than anywhere else: the root boundary offers only "try again",
 * which is useless if the fault is in the page itself. A link back to sign-in
 * keeps a recoverable account recoverable.
 */
export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[auth]', error);
  }, [error]);

  return (
    <div className="flex w-full max-w-md flex-col items-center justify-center px-4 text-center">
      <AlertTriangle className="mb-4 h-10 w-10 text-destructive" />
      <h1 className="text-xl font-bold">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This page failed to load. Your account and password are unaffected.
      </p>

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
          <Link href="/login">
            <LogIn className="mr-2 h-4 w-4" />
            Back to sign in
          </Link>
        </Button>
      </div>
    </div>
  );
}
