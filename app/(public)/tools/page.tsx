import { PageContainer, PageHeader, EmptyState } from '@/components/common';
import { ToolCard } from '@/components/cards';
import { getTools } from '@/services/tools';
import { Wrench } from 'lucide-react';

export default function ToolsPage() {
  const { data: tools } = getTools();

  return (
    <PageContainer>
      <PageHeader
        title="AI Tools"
        description="A curated catalog of AI and developer tools with pricing, categories, and recommendations."
      />
      <div className="mt-8">
        {tools.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Wrench className="h-10 w-10" />}
            title="No tools yet"
            description="AI tools will appear here once published."
          />
        )}
      </div>
    </PageContainer>
  );
}
