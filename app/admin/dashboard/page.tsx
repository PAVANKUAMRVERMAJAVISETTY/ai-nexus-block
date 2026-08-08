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

export default function AdminDashboard() {
  return (
    <PageContainer>
      <PageHeader
        title="Admin Dashboard"
        description="Manage your content, tools, projects, and platform settings."
      />
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>
      <div className="mt-8">
        <SectionHeading title="Quick Actions" description="Jump to common admin tasks." />
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-border/40 p-4 text-sm">
            <h3 className="font-semibold">Add Tool</h3>
            <p className="mt-1 text-muted-foreground">Catalog a new AI or developer tool.</p>
          </div>
          <div className="rounded-lg border border-border/40 p-4 text-sm">
            <h3 className="font-semibold">Add Project</h3>
            <p className="mt-1 text-muted-foreground">Showcase a new project or case study.</p>
          </div>
          <div className="rounded-lg border border-border/40 p-4 text-sm">
            <h3 className="font-semibold">Write Article</h3>
            <p className="mt-1 text-muted-foreground">Publish a knowledge article.</p>
          </div>
          <div className="rounded-lg border border-border/40 p-4 text-sm">
            <h3 className="font-semibold">Add Roadmap</h3>
            <p className="mt-1 text-muted-foreground">Create a learning roadmap.</p>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
