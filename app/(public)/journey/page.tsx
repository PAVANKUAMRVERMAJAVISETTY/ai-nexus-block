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
          title="Developer Journey & Career Milestones"
          description="Engineering milestones, project launches, AI architecture evolution, and learning achievements of Naga Pavan Kumar Javisetty."
        />

        {/* Developer Profile Header Card */}
        <div className="mt-8 mb-12 bg-card border border-border/80 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-center gap-6">
          <div className="relative h-24 w-24 rounded-full overflow-hidden border-4 border-primary/40 bg-muted flex items-center justify-center shrink-0 shadow-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/naga-pavan-profile.jpg"
              alt="Naga Pavan Kumar Javisetty"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="text-center md:text-left flex-1">
            <h2 className="text-xl font-bold text-foreground">Naga Pavan Kumar Javisetty</h2>
            <p className="text-sm font-medium text-primary mt-0.5">
              AI-Focused Full-Stack Developer & Systems Architect
            </p>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed max-w-xl">
              B.Tech in CSE graduate with hands-on experience building production web platforms (Urban Properties, Trippy&apos;s Mehfill, Shree Gopi Traders, Extru Tech) and agentic AI systems.
            </p>
          </div>
        </div>

        {/* Alternating Left-Right Zig-Zag Timeline */}
        <div className="relative max-w-4xl mx-auto py-6">
          {/* Center Vertical Axis Line */}
          <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 -translate-x-1/2 bg-gradient-to-b from-primary/80 via-blue-500/50 to-border" />

          <div className="space-y-12">
            {journeyEntries.map((entry: any, index: number) => {
              const isEven = index % 2 === 0;

              return (
                <div
                  key={entry.id}
                  className={`relative flex flex-col md:flex-row items-center ${
                    isEven ? 'md:flex-row-reverse' : ''
                  }`}
                >
                  {/* Timeline Icon Node at Center */}
                  <div className="absolute left-4 md:left-1/2 -translate-x-1/2 z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 border-primary bg-background shadow-lg text-primary">
                    <Compass className="h-4 w-4" />
                  </div>

                  {/* Card Content (Alternates Left / Right on Desktop) */}
                  <div className={`w-full md:w-[calc(50%-2.5rem)] pl-12 md:pl-0 ${isEven ? 'md:pr-8 md:text-right' : 'md:pl-8 md:text-left'}`}>
                    <div className="bg-card/90 border border-border/80 rounded-2xl p-5 shadow-lg hover:border-primary/40 transition-all">
                      <div className={`flex flex-wrap items-center gap-2 mb-2 ${isEven ? 'md:justify-end' : 'md:justify-start'}`}>
                        <Badge variant="outline" className="text-xs font-mono font-bold bg-primary/10 text-primary border-primary/30">
                          {entry.entry_date}
                        </Badge>
                        <Badge variant="secondary" className="text-xs capitalize">
                          {entry.milestone_type}
                        </Badge>
                        <AdminEditButton entityType="journey" item={entry} size="sm" />
                      </div>

                      <h3 className="text-base font-bold text-foreground">{entry.title}</h3>
                      <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                        {entry.description}
                      </p>

                      {entry.tags && entry.tags.length > 0 && (
                        <div className={`mt-3 flex flex-wrap gap-1.5 ${isEven ? 'md:justify-end' : 'md:justify-start'}`}>
                          {entry.tags.map((tag: string) => (
                            <Badge key={tag} variant="outline" className="text-[10px]">
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Download Links */}
                      {(entry.pdf_url || entry.sql_url || entry.zip_file_url) && (
                        <div className={`mt-4 flex flex-wrap gap-2 pt-3 border-t border-border/40 ${isEven ? 'md:justify-end' : 'md:justify-start'}`}>
                          {entry.pdf_url && (
                            <a
                              href={entry.pdf_url}
                              download
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
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
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
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
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                            >
                              <Download className="h-3 w-3" />
                              📦 Source (.zip)
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </AdminWrapper>
    </PageContainer>
  );
}
