import { Blocks } from 'lucide-react';

/**
 * Loading state for the IDE.
 *
 * The root fallback is a centred spinner on an empty page, which makes opening
 * a project look like a full navigation away from the app. Sketching the four
 * panes instead keeps the layout stable, so the real workspace appears in
 * place rather than replacing a blank screen.
 */
export default function IdeLoading() {
  return (
    <div
      className="flex h-screen w-full flex-col bg-background"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Loading workspace…</span>

      {/* Title bar */}
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border/40 px-3">
        <Blocks className="h-4 w-4 animate-pulse text-primary" aria-hidden="true" />
        <div className="h-3 w-32 animate-pulse rounded bg-muted" />
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Activity bar */}
        <div className="flex w-11 shrink-0 flex-col items-center gap-3 border-r border-border/40 py-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-6 w-6 animate-pulse rounded bg-muted" />
          ))}
        </div>

        {/* Explorer */}
        <div className="hidden w-56 shrink-0 flex-col gap-2 border-r border-border/40 p-3 md:flex">
          <div className="h-7 w-full animate-pulse rounded bg-muted" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-3 animate-pulse rounded bg-muted"
              style={{ width: `${85 - i * 9}%` }}
            />
          ))}
        </div>

        {/* Editor + panel */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex-1 space-y-2 p-4">
            {[92, 78, 85, 60, 70, 48, 88, 55].map((width, i) => (
              <div
                key={i}
                className="h-3 animate-pulse rounded bg-muted"
                style={{ width: `${width}%` }}
              />
            ))}
          </div>
          <div className="h-32 shrink-0 border-t border-border/40 p-3">
            <div className="h-3 w-40 animate-pulse rounded bg-muted" />
          </div>
        </div>

        {/* Assistant */}
        <div className="hidden w-72 shrink-0 flex-col gap-3 border-l border-border/40 p-3 lg:flex">
          <div className="h-7 w-full animate-pulse rounded bg-muted" />
          <div className="h-16 w-full animate-pulse rounded bg-muted" />
          <div className="h-16 w-4/5 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}
