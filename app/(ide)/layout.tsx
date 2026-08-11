import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Nexus IDE — AI Nexus Block',
  description:
    'A browser-based developer workspace with a project explorer, code editor, local terminal agent, and the Nexus AI Assistant.',
};

/**
 * The IDE uses the full viewport rather than the workspace sidebar shell —
 * an editor, terminal and assistant panel need the whole screen. Navigation
 * back to the rest of the workspace lives in the IDE's own top bar.
 */
export default function IdeLayout({ children }: { children: React.ReactNode }) {
  return <div className="h-screen overflow-hidden bg-background">{children}</div>;
}
