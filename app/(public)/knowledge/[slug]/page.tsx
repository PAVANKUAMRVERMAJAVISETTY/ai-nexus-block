import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Clock } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { getKnowledgeArticleBySlug, getKnowledgeArticles } from '@/services/knowledge';

export function generateStaticParams() {
  const { data: articles } = getKnowledgeArticles();
  return articles.map((a) => ({ slug: a.slug }));
}

export default function KnowledgeArticlePage({ params }: { params: { slug: string } }) {
  const article = getKnowledgeArticleBySlug(params.slug);
  if (!article) notFound();

  return (
    <PageContainer>
      <Button asChild variant="ghost" size="sm" className="mb-6">
        <Link href="/knowledge">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to knowledge
        </Link>
      </Button>
      <div className="mx-auto max-w-3xl">
        <Badge variant="secondary">{article.category}</Badge>
        <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">{article.title}</h1>
        <p className="mt-3 text-lg text-muted-foreground">{article.excerpt}</p>
        <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
          {article.reading_time_minutes && (
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {article.reading_time_minutes} min read
            </span>
          )}
        </div>
        <Separator className="my-8" />
        <div className="prose prose-sm max-w-none">
          <p className="text-muted-foreground">{article.content}</p>
        </div>
        <div className="mt-8 flex flex-wrap gap-2">
          {article.tags.map((tag) => (
            <Badge key={tag} variant="outline">{tag}</Badge>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
