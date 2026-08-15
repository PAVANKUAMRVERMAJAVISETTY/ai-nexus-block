import { PageContainer, PageHeader } from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { AdminWrapper, AdminEditButton } from '@/components/admin';
import { Compass, FileText, Database, Download } from 'lucide-react';

async function getJourneyData() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/journey`, {
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('Failed to fetch');
    const json = await res.json();
    return json.data || [];
  } catch {
    return [
      { id: '1', title: 'Started AI Nexus Block', slug: 'started-ai-nexus-block', description: 'Began building an agentic knowledge platform for developers.', entry_date: '2024-01', milestone_type: 'project', tags: ['platform', 'ai'] },
      { id: '2', title: 'Implemented Supabase Integration', slug: 'supabase-integration', description: 'Set up authentication, database, and storage with Supabase.', entry_date: '2024-04', milestone_type: 'learning', tags: ['supabase', 'backend'] },
      { id: '3', title: 'Launched Public Homepage', slug: 'launched-homepage', description: 'Released the public-facing experience with project showcase and tool catalog.', entry_date: '2024-07', milestone_type: 'achievement', tags: ['launch', 'frontend'] },
      { id: '4', title: 'AI Assistant Beta', slug: 'ai-assistant-beta', description: 'Integrated multi-provider AI assistant with tool recommendations.', entry_date: '2024-10', milestone_type: 'project', tags: ['ai', 'assistant'] },
    ];
  }
}

export default async function JourneyPage() {
  const journeyEntries = await getJourneyData();

  return (
    <PageContainer>
      <AdminWrapper entityType="journey">
        <PageHeader
          title="Developer Journey"
          description="Engineering milestones, learning achievements, and project progress."
        />
        <div className="mt-8 mx-auto max-w-2xl">
          {journeyEntries.map((entry: any, index: number) => (
            <div key={entry.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-primary/20 bg-primary/5">
                  <Compass className="h-4 w-4 text-primary" />
                </div>
                {index < journeyEntries.length - 1 && <div className="w-px flex-1 bg-border" />}
              </div>
              <div className="pb-8 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{entry.entry_date}</Badge>
                    <Badge variant="secondary" className="text-xs capitalize">{entry.milestone_type}</Badge>
                  </div>
                  <AdminEditButton entityType="journey" item={entry} size="sm" />
                </div>
                <h3 className="mt-1.5 text-base font-semibold">{entry.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{entry.description}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {entry.tags?.map((tag: string) => (
                    <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                  ))}
                </div>

                {/* High-contrast Download Badges */}
                {(entry.pdf_url || entry.sql_url || entry.zip_file_url) && (
                  <div className="mt-3 flex flex-wrap gap-2 pt-2 border-t border-border/20">
                    {entry.pdf_url && (
                      <a
                        href={entry.pdf_url}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                      >
                        <FileText className="h-3 w-3" />
                        📄 Cheatsheet
                      </a>
                    )}
                    {entry.sql_url && (
                      <a
                        href={entry.sql_url}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
                      >
                        <Database className="h-3 w-3" />
                        💾 SQL
                      </a>
                    )}
                    {entry.zip_file_url && (
                      <a
                        href={entry.zip_file_url}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                      >
                        <Download className="h-3 w-3" />
                        📦 Source (.zip)
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </AdminWrapper>
    </PageContainer>
  );
}
