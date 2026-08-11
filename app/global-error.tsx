'use client';

import { useEffect } from 'react';

/**
 * Last-resort error boundary.
 *
 * `app/error.tsx` cannot catch a failure in the root layout itself — if that
 * throws, the user gets a blank white page. This boundary replaces the whole
 * document, so it must render its own <html> and <body> and cannot rely on
 * global styles or any provider having mounted.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Wire this to your error reporter (Sentry, Logtail, …) when you add one.
    console.error('[global-error]', error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#070b12',
          color: '#dbe3ee',
          fontFamily:
            'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          padding: '1.5rem',
        }}
      >
        <div style={{ maxWidth: '32rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 0.5rem' }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#8fa5c4', margin: '0 0 1.5rem' }}>
            The application failed to load. This has been logged.
            {error.digest ? ` Reference: ${error.digest}` : ''}
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              cursor: 'pointer',
              borderRadius: '0.375rem',
              border: '1px solid #1f3050',
              backgroundColor: '#3b93ff',
              color: '#070b12',
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              fontWeight: 600,
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
