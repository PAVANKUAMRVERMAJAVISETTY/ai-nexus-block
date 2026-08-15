'use client';

import { useState, useEffect } from 'react';
import { PageContainer, PageHeader, EmptyState } from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { AdminWrapper, AdminEditButton } from '@/components/admin';
import { Link2, ExternalLink, FileText, Database, Download } from 'lucide-react';

const resourceCategories = [
  '#All',
  '#Supabase & RLS',
  '#Next.js App Router',
  '#Algorithms',
  '#AI Frameworks',
];

export default function ResourcesPage() {
  const [resources, setResources] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState('#All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/resources')
      .then((res) => res.json())
      .then((json) => setResources(json.data || []))
      .catch(() => setResources([]))
      .finally(() => setLoading(false));
  }, []);

  const filteredResources = resources.filter((res) => {
    if (activeCategory === '#All') return true;
    const cleanCat = activeCategory.replace('#', '').toLowerCase();
    const cat = (res.category || '').toLowerCase();
    const tags = (res.tags || []).map((t: string) => t.toLowerCase());
    return cat.includes(cleanCat) || tags.some((t: string) => t.includes(cleanCat));
  });

  return (
    <PageContainer>
      <AdminWrapper entityType="resources">
        <PageHeader
          title="Developer Resources & Guides"
          description="Curated books, video courses, articles, architecture references, and downloadable SQL/PDF guides."
        />

        {/* Category Filter Tabs */}
        <div className="mt-6 flex flex-wrap gap-2 border-b border-border/40 pb-4">
          {resourceCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-full border transition-all ${
                activeCategory === cat
                  ? 'bg-primary text-primary-foreground border-primary shadow-md'
                  : 'bg-muted/30 text-muted-foreground hover:bg-muted border-border/50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="mt-8">
          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-pulse">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-48 rounded-xl bg-muted/40" />
              ))}
            </div>
          ) : filteredResources.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredResources.map((resource) => (
                <div key={resource.id} className="relative rounded-xl border border-border/40 bg-card p-5 transition-all hover:border-border/80 hover:shadow-lg flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2 pr-8">
                      <Badge variant="outline" className="capitalize text-xs">{resource.resource_type || 'guide'}</Badge>
                      <Badge variant="secondary" className="text-[10px]">{resource.category || 'General'}</Badge>
                    </div>
                    <h3 className="text-base font-semibold">{resource.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{resource.description}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {resource.tags?.slice(0, 2).map((tag: string) => (
                          <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                        ))}
                      </div>
                      {resource.website_url && (
                        <a href={resource.website_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>

                    {/* Download Badges */}
                    {(resource.pdf_url || resource.sql_url || resource.zip_file_url) && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {resource.pdf_url && (
                          <a
                            href={resource.pdf_url}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded bg-red-500/10 text-red-500 border border-red-500/20"
                          >
                            <FileText className="h-3 w-3" /> PDF
                          </a>
                        )}
                        {resource.sql_url && (
                          <a
                            href={resource.sql_url}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded bg-amber-500/10 text-amber-500 border border-amber-500/20"
                          >
                            <Database className="h-3 w-3" /> SQL
                          </a>
                        )}
                        {resource.zip_file_url && (
                          <a
                            href={resource.zip_file_url}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                          >
                            <Download className="h-3 w-3" /> ZIP
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="absolute top-4 right-4 z-10">
                    <AdminEditButton entityType="resources" item={resource} size="icon" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Link2 className="h-10 w-10" />}
              title="No resources found"
              description="No resources match the selected category filter."
            />
          )}
        </div>
      </AdminWrapper>
    </PageContainer>
  );
}
