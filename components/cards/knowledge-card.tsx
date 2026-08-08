import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
import type { KnowledgeArticle } from '@/types/knowledge';

interface KnowledgeCardProps {
  article: KnowledgeArticle;
}

export function KnowledgeCard({ article }: KnowledgeCardProps) {
  return (
    <Link href={`/knowledge/${article.slug}`} className="block h-full">
      <Card className="h-full border-border/40 transition-all hover:border-border/80 hover:shadow-lg">
        <CardHeader className="pb-3">
          <Badge variant="outline" className="mb-2 w-fit text-xs">
            {article.category}
          </Badge>
          <h3 className="text-lg font-semibold leading-tight">{article.title}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2">{article.excerpt}</p>
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
      </Card>
    </Link>
  );
}
