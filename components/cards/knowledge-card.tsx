import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, FileText, Database, Download } from 'lucide-react';
import { AdminEditButton } from '@/components/admin';
import type { KnowledgeArticle } from '@/types/knowledge';

interface KnowledgeCardProps {
  article: KnowledgeArticle;
}

export function KnowledgeCard({ article }: KnowledgeCardProps) {
  return (
    <Card className="relative h-full flex flex-col justify-between border-border/40 transition-all hover:border-border/80 hover:shadow-lg">
      <Link href={`/knowledge/${article.slug}`} className="block flex-1">
        <CardHeader className="pb-3 pr-12">
          <Badge variant="outline" className="mb-2 w-fit text-xs">
            {article.category}
          </Badge>
          <h3 className="text-lg font-semibold leading-tight">{article.title}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{article.excerpt}</p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {article.reading_time_minutes && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {article.reading_time_minutes} min read
              </span>
            )}
            <div className="flex flex-wrap gap-1.5">
              {article.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Link>

      <div className="absolute top-3 right-3 z-10">
        <AdminEditButton entityType="knowledge" item={article} size="icon" />
      </div>

      {(article.pdf_url || article.sql_url || article.zip_file_url) && (
        <div className="px-6 pb-4 pt-1 flex flex-wrap gap-2 border-t border-border/20">
          {article.pdf_url && (
            <a
              href={article.pdf_url}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-colors"
            >
              <FileText className="h-3 w-3" />
              📄 Download PDF Cheatsheet
            </a>
          )}
          {article.sql_url && (
            <a
              href={article.sql_url}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
            >
              <Database className="h-3 w-3" />
              💾 Download SQL Script
            </a>
          )}
          {article.zip_file_url && (
            <a
              href={article.zip_file_url}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
            >
              <Download className="h-3 w-3" />
              📦 Download Source (.zip)
            </a>
          )}
        </div>
      )}
    </Card>
  );
}
