import { PageContainer, PageHeader, EmptyState } from '@/components/common';
import { KnowledgeCard } from '@/components/cards';
import { getKnowledgeArticles } from '@/services/knowledge';
import { BookOpen } from 'lucide-react';

export default async function KnowledgePage() {
  const { data: articles } = await getKnowledgeArticles();

  return (
    <PageContainer>
      <PageHeader
        title="Knowledge"
        description="Articles, guides, and engineering insights."
      />

      <div className="mt-8">
        {articles.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <KnowledgeCard key={article.id} article={article} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<BookOpen className="h-10 w-10" />}
            title="No articles yet"
            description="Knowledge articles will appear here once published."
          />
        )}
      </div>
    </PageContainer>
  );
}
