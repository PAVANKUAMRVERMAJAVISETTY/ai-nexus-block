import { PageContainer, PageHeader, SectionHeading } from '@/components/common';
import { StatCard } from '@/components/cards';
import { FolderGit2, Wrench, BookOpen, Map, Compass, Users } from 'lucide-react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import Link from 'next/link';

export const revalidate = 0;

export default async function AdminDashboard() {
  const supabase = await createSupabaseServerClient();

  // Fetch total registered users count from public.profiles
  const { count: userCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  const stats = [
    { label: 'Registered Users', value: (userCount ?? 0).toString(), icon: <Users className="h-4 w-4 text-primary" /> },
    { label: 'Projects', value: '12', icon: <FolderGit2 className="h-4 w-4" /> },
    { label: 'AI Tools', value: '48', icon: <Wrench className="h-4 w-4" /> },
    { label: 'Knowledge Articles', value: '23', icon: <BookOpen className="h-4 w-4" /> },
    { label: 'Roadmaps', value: '5', icon: <Map className="h-4 w-4" /> },
    { label: 'Journey Entries', value: '18', icon: <Compass className="h-4 w-4" /> },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Admin Dashboard"
        description="Manage users, platform settings, tools, and content."
      />

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="mt-8">
        <SectionHeading title="Admin Actions & Management" description="Quick access to platform administration." />
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/admin/users" className="rounded-lg border border-border/40 bg-card p-4 text-sm transition-colors hover:border-primary/50">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Manage Users
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">View registered users, roles, display names, and credentials.</p>
          </Link>
          <div className="rounded-lg border border-border/40 p-4 text-sm bg-card">
            <h3 className="font-semibold">Add AI Tool</h3>
            <p className="mt-1 text-xs text-muted-foreground">Catalog a new AI or developer tool.</p>
          </div>
          <div className="rounded-lg border border-border/40 p-4 text-sm bg-card">
            <h3 className="font-semibold">Add Project</h3>
            <p className="mt-1 text-xs text-muted-foreground">Showcase a new project or case study.</p>
          </div>
          <div className="rounded-lg border border-border/40 p-4 text-sm bg-card">
            <h3 className="font-semibold">AI System Settings</h3>
            <p className="mt-1 text-xs text-muted-foreground">Configure AI model parameters and prompts.</p>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
