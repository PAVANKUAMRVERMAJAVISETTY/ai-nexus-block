import { Blocks } from 'lucide-react';

/**
 * Route-level loading state.
 *
 * Without this, navigating to a server-rendered page shows nothing at all
 * until the server responds — on a slow connection that reads as a broken
 * link. This renders instantly while the real page streams in.
 */
export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3">
      <Blocks className="h-8 w-8 animate-pulse text-primary" aria-hidden="true" />
      <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
        Loading…
      </p>
    </div>
  );
}
