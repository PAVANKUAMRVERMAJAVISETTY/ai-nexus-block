import { PageContainer, PageHeader, EmptyState } from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { Map } from 'lucide-react';

const mockRoadmaps = [
  { id: '1', title: 'Full-Stack AI Engineer', slug: 'full-stack-ai-engineer', description: 'Master AI-integrated full-stack development', difficulty: 'intermediate' as const, tags: ['ai', 'fullstack'], estimated_hours: 120, category: 'Engineering', featured: true, published: true, display_order: 1, image_url: null, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: '2', title: 'Frontend Performance', slug: 'frontend-performance', description: 'Optimize web applications for speed and UX', difficulty: 'advanced' as const, tags: ['performance', 'frontend'], estimated_hours: 40, category: 'Frontend', featured: true, published: true, display_order: 2, image_url: null, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
];

export default function RoadmapsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Engineering Roadmaps"
        description="Structured learning paths for developers and AI engineers."
      />
      <div className="mt-8">
        {mockRoadmaps.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {mockRoadmaps.map((roadmap) => (
              <div key={roadmap.id} className="rounded-lg border border-border/40 p-6 transition-all hover:border-border/80 hover:shadow-lg">
                <Badge variant="secondary" className="mb-2 capitalize">{roadmap.difficulty}</Badge>
                <h3 className="text-lg font-semibold">{roadmap.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{roadmap.description}</p>
                <p className="mt-3 text-xs text-muted-foreground">{roadmap.estimated_hours} hours estimated</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {roadmap.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                  ))}
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
    </PageContainer>
  );
}
