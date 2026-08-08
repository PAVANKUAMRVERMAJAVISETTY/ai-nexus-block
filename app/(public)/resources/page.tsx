import { PageContainer, PageHeader, EmptyState } from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { Link2, ExternalLink } from 'lucide-react';

const mockResources = [
  { id: '1', title: 'AI Engineering Handbook', slug: 'ai-engineering-handbook', description: 'Comprehensive guide to building AI products', resource_type: 'book' as const, category: 'AI', website_url: '#', tags: ['ai', 'engineering'], featured: true, published: true, display_order: 1, image_url: null, logo_url: null, github_url: null, documentation_url: null, youtube_url: null, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: '2', title: 'Supabase Crash Course', slug: 'supabase-crash-course', description: 'Learn Supabase from scratch', resource_type: 'course' as const, category: 'Backend', website_url: '#', tags: ['supabase', 'database'], featured: true, published: true, display_order: 2, image_url: null, logo_url: null, github_url: null, documentation_url: null, youtube_url: null, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: '3', title: 'TypeScript Best Practices', slug: 'typescript-best-practices', description: 'Production-grade TypeScript patterns', resource_type: 'article' as const, category: 'Frontend', website_url: '#', tags: ['typescript', 'best-practices'], featured: false, published: true, display_order: 3, image_url: null, logo_url: null, github_url: null, documentation_url: null, youtube_url: null, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
];

export default function ResourcesPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Resources"
        description="Curated books, courses, articles, and tools for developers."
      />
      <div className="mt-8">
        {mockResources.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {mockResources.map((resource) => (
              <div key={resource.id} className="rounded-lg border border-border/40 p-5 transition-all hover:border-border/80 hover:shadow-lg">
                <Badge variant="outline" className="mb-2 capitalize">{resource.resource_type}</Badge>
                <h3 className="text-base font-semibold">{resource.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{resource.description}</p>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex flex-wrap gap-1.5">
                    {resource.tags.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                  {resource.website_url && (
                    <a href={resource.website_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Link2 className="h-10 w-10" />}
            title="No resources yet"
            description="Resources will appear here once published."
          />
        )}
      </div>
    </PageContainer>
  );
}
