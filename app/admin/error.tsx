'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, ShieldCheck } from 'lucide-react';

/**
 * Error boundary for the admin area.
 *
 * A failed admin page must not read as a permissions problem — the middleware
 * has already established that this user is a super admin by the time anything
 * here renders. Saying so plainly avoids sending an admin off to debug access
 * control when the real fault is elsewhere.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[admin]', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <AlertTriangle className="mb-4 h-10 w-10 text-destructive" />
      <h1 className="text-xl font-bold">This admin page could not be loaded</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        This is not a permissions problem — your admin access is intact. The page
        itself failed to load.
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
          <Link href="/admin/dashboard">
            <ShieldCheck className="mr-2 h-4 w-4" />
            Admin dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}
