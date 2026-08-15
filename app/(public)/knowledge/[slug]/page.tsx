import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Clock, FileText, Database, Download } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { AdminWrapper, AdminEditButton } from '@/components/admin';
import {
  getKnowledgeArticleBySlug,
  getKnowledgeArticles,
} from '@/services/knowledge';

export async function generateStaticParams() {
  const { data: articles } = await getKnowledgeArticles();
  return articles.map((a) => ({ slug: a.slug }));
}

export default async function KnowledgeArticlePage({
  params,
}: {
  params: { slug: string };
}) {
  const article = await getKnowledgeArticleBySlug(params.slug);

  if (!article) notFound();

  return (
    <PageContainer>
      <AdminWrapper entityType="knowledge">
        <div className="flex items-center justify-between mb-6">
          <Button asChild variant="ghost" size="sm">
            <Link href="/knowledge">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to knowledge
            </Link>
          </Button>
          <AdminEditButton entityType="knowledge" item={article} />
        </div>

        <div className="mx-auto max-w-3xl">
          <Badge variant="secondary">{article.category}</Badge>

          <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
            {article.title}
          </h1>

          <p className="mt-3 text-lg text-muted-foreground">
            {article.excerpt}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {article.reading_time_minutes && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {article.reading_time_minutes} min read
              </span>
            )}
          </div>

          {/* High-Contrast Action Download Badges */}
          {(article.pdf_url || article.sql_url || article.zip_file_url) && (
            <div className="mt-6 flex flex-wrap gap-3">
              {article.pdf_url && (
                <Button asChild variant="secondary" size="sm" className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 font-semibold">
                  <a
                    href={article.pdf_url}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    📄 Download PDF Cheatsheet
                  </a>
                </Button>
              )}

              {article.sql_url && (
                <Button asChild variant="secondary" size="sm" className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/20 font-semibold">
                  <a
                    href={article.sql_url}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Database className="mr-2 h-4 w-4" />
                    💾 Download SQL Script
                  </a>
                </Button>
              )}

              {article.zip_file_url && (
                <Button asChild variant="secondary" size="sm" className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20 font-semibold">
                  <a
                    href={article.zip_file_url}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    📦 Download Source (.zip)
                  </a>
                </Button>
              )}
            </div>
          )}

          <Separator className="my-8" />

          <div className="prose prose-sm max-w-none">
            <p className="text-muted-foreground whitespace-pre-line">{article.content}</p>
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            {article.tags?.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </AdminWrapper>
    </PageContainer>
  );
}
