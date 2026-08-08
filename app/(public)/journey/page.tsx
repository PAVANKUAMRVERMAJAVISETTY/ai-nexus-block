import { PageContainer, PageHeader } from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { Compass } from 'lucide-react';

const journeyEntries = [
  { id: '1', title: 'Started AI Nexus Block', slug: 'started-ai-nexus-block', description: 'Began building an agentic knowledge platform for developers.', entry_date: '2024-01', milestone_type: 'project' as const, tags: ['platform', 'ai'], image_url: null, featured: true, published: true, display_order: 1, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: '2', title: 'Implemented Supabase Integration', slug: 'supabase-integration', description: 'Set up authentication, database, and storage with Supabase.', entry_date: '2024-04', milestone_type: 'learning' as const, tags: ['supabase', 'backend'], image_url: null, featured: false, published: true, display_order: 2, created_at: '2024-04-01T00:00:00Z', updated_at: '2024-04-01T00:00:00Z' },
  { id: '3', title: 'Launched Public Homepage', slug: 'launched-homepage', description: 'Released the public-facing experience with project showcase and tool catalog.', entry_date: '2024-07', milestone_type: 'achievement' as const, tags: ['launch', 'frontend'], image_url: null, featured: true, published: true, display_order: 3, created_at: '2024-07-01T00:00:00Z', updated_at: '2024-07-01T00:00:00Z' },
  { id: '4', title: 'AI Assistant Beta', slug: 'ai-assistant-beta', description: 'Integrated multi-provider AI assistant with tool recommendations.', entry_date: '2024-10', milestone_type: 'project' as const, tags: ['ai', 'assistant'], image_url: null, featured: false, published: true, display_order: 4, created_at: '2024-10-01T00:00:00Z', updated_at: '2024-10-01T00:00:00Z' },
];

export default function JourneyPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Developer Journey"
        description="Engineering milestones, learning achievements, and project progress."
      />
      <div className="mt-8 mx-auto max-w-2xl">
        {journeyEntries.map((entry, index) => (
          <div key={entry.id} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-primary/20 bg-primary/5">
                <Compass className="h-4 w-4 text-primary" />
              </div>
              {index < journeyEntries.length - 1 && <div className="w-px flex-1 bg-border" />}
            </div>
            <div className="pb-8">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">{entry.entry_date}</Badge>
                <Badge variant="secondary" className="text-xs capitalize">{entry.milestone_type}</Badge>
              </div>
              <h3 className="mt-1 text-base font-semibold">{entry.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{entry.description}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {entry.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </PageContainer>
  );
}
