import { PageContainer, PageHeader, SectionHeading } from '@/components/common';
import { StatCard } from '@/components/cards';
import { FolderGit2, Wrench, BookOpen, Map, Compass, Eye } from 'lucide-react';

const stats = [
  { label: 'Projects', value: '12', icon: <FolderGit2 className="h-4 w-4" /> },
  { label: 'AI Tools', value: '48', icon: <Wrench className="h-4 w-4" /> },
  { label: 'Knowledge Articles', value: '23', icon: <BookOpen className="h-4 w-4" /> },
  { label: 'Roadmaps', value: '5', icon: <Map className="h-4 w-4" /> },
  { label: 'Journey Entries', value: '18', icon: <Compass className="h-4 w-4" /> },
  { label: 'Visitors', value: '1.2k', icon: <Eye className="h-4 w-4" /> },
];

export default function WorkspaceDashboard() {
  return (
    <PageContainer>
      <PageHeader
        title="Dashboard"
        description="Overview of your workspace and content."
      />
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>
      <div className="mt-8">
        <SectionHeading title="Recent Activity" description="Latest updates across your workspace." />
        <div className="mt-4 rounded-lg border border-border/40 p-6 text-center text-sm text-muted-foreground">
          No recent activity. Content updates will appear here.
        </div>
      </div>
    </PageContainer>
  );
}
