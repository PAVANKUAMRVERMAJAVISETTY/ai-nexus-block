import { PageContainer, PageHeader, SectionHeading } from '@/components/common';
import { StatCard } from '@/components/cards';
import { FolderGit2, Wrench, BookOpen, Map, Compass, Bot, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const stats = [
  { label: 'Projects', value: '12', icon: <FolderGit2 className="h-4 w-4" /> },
  { label: 'AI Tools', value: '48', icon: <Wrench className="h-4 w-4" /> },
  { label: 'Knowledge Articles', value: '23', icon: <BookOpen className="h-4 w-4" /> },
  { label: 'Roadmaps', value: '5', icon: <Map className="h-4 w-4" /> },
  { label: 'Journey Entries', value: '18', icon: <Compass className="h-4 w-4" /> },
];

export default function WorkspaceDashboard() {
  return (
    <PageContainer>
      <PageHeader
        title="Developer Workspace"
        description="Overview of your AI Nexus Block tools, projects, and AI assistant."
      />

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      {/* AI Assistant Banner */}
      <div className="mt-8 rounded-xl border border-primary/30 bg-primary/10 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            AI Assistant & Architecture Sandbox
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Get AI-powered stack recommendations, debug code, compare developer tools, and generate architectural roadmaps.
          </p>
        </div>
        <Button asChild size="default" className="gap-2 shrink-0">
          <Link href="/assistant">
            Launch Assistant
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="mt-8">
        <SectionHeading title="Recent Workspace Activity" description="Latest updates across your saved content." />
        <div className="mt-4 rounded-lg border border-border/40 bg-card p-6 text-center text-sm text-muted-foreground">
          No recent activity. Active conversations and tool benchmarks will appear here.
        </div>
      </div>
    </PageContainer>
  );
}
