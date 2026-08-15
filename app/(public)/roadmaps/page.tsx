import { PageContainer, PageHeader, EmptyState } from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { AdminWrapper, AdminEditButton } from '@/components/admin';
import { getRoadmaps } from '@/services/roadmaps';
import { Map, FileText, Database, Download } from 'lucide-react';

export default async function RoadmapsPage() {
  let roadmaps: any[] = [];
  try {
    const res = await getRoadmaps();
    roadmaps = res.data || [];
  } catch {
    roadmaps = [
      { id: '1', title: 'Full-Stack AI Engineer', slug: 'full-stack-ai-engineer', description: 'Master AI-integrated full-stack development', difficulty: 'intermediate', tags: ['ai', 'fullstack'], estimated_hours: 120, category: 'Engineering', featured: true, published: true },
      { id: '2', title: 'Frontend Performance', slug: 'frontend-performance', description: 'Optimize web applications for speed and UX', difficulty: 'advanced', tags: ['performance', 'frontend'], estimated_hours: 40, category: 'Frontend', featured: true, published: true },
    ];
  }

  return (
    <PageContainer>
      <AdminWrapper entityType="roadmaps">
        <PageHeader
          title="Engineering Roadmaps"
          description="Structured learning paths for developers, system architects, and AI engineers."
        />
        <div className="mt-8">
          {roadmaps.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {roadmaps.map((roadmap) => (
                <div key={roadmap.id} className="relative rounded-lg border border-border/40 p-6 transition-all hover:border-border/80 hover:shadow-lg bg-card">
                  <div className="flex justify-between items-start mb-2 pr-8">
                    <Badge variant="secondary" className="capitalize">{roadmap.difficulty || roadmap.level || 'intermediate'}</Badge>
                  </div>
                  <h3 className="text-lg font-semibold">{roadmap.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{roadmap.description}</p>
                  {roadmap.estimated_hours && (
                    <p className="mt-3 text-xs text-muted-foreground">{roadmap.estimated_hours} hours estimated</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {roadmap.tags?.map((tag: string) => (
                      <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                    ))}
                  </div>

                  {/* High-contrast Download Badges */}
                  {(roadmap.pdf_url || roadmap.sql_url || roadmap.zip_file_url) && (
                    <div className="mt-4 pt-3 flex flex-wrap gap-2 border-t border-border/20">
                      {roadmap.pdf_url && (
                        <a
                          href={roadmap.pdf_url}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                        >
                          <FileText className="h-3 w-3" />
                          📄 PDF Cheatsheet
                        </a>
                      )}
                      {roadmap.sql_url && (
                        <a
                          href={roadmap.sql_url}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
                        >
                          <Database className="h-3 w-3" />
                          💾 SQL Script
                        </a>
                      )}
                      {roadmap.zip_file_url && (
                        <a
                          href={roadmap.zip_file_url}
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

                  <div className="absolute top-4 right-4 z-10">
                    <AdminEditButton entityType="roadmaps" item={roadmap} size="icon" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Map className="h-10 w-10" />}
              title="No roadmaps yet"
              description="Engineering roadmaps will appear here once published."
            />
          )}
        </div>
      </AdminWrapper>
    </PageContainer>
  );
}
