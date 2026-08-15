import { PublicHeader } from './public-header';
import { PublicFooter } from './public-footer';
import { AboutMeWidget } from '@/components/public/AboutMeWidget';
import { FloatingCopilot } from '@/components/ai/FloatingCopilot';
import { CommandPalette } from '@/components/common';

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <PublicFooter />
      <AboutMeWidget />
      <FloatingCopilot />
      <CommandPalette />
    </div>
  );
}
