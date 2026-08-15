import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Database, Download } from 'lucide-react';
import { AdminEditButton } from '@/components/admin';
import type { Tool } from '@/types/tools';

interface ToolCardProps {
  tool: Tool;
}

export function ToolCard({ tool }: ToolCardProps) {
  return (
    <Card className="relative h-full flex flex-col justify-between border-border/40 transition-all hover:border-border/80 hover:shadow-lg">
      <Link href={`/tools/${tool.slug}`} className="block flex-1">
        <CardHeader className="flex flex-row items-center gap-3 pb-3 pr-12">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary text-sm font-bold">
            {tool.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold leading-tight truncate">{tool.name}</h3>
            <p className="text-xs text-muted-foreground truncate">{tool.category}</p>
          </div>
          <Badge variant="outline" className="text-xs capitalize shrink-0">
            {tool.pricing}
          </Badge>
        </CardHeader>

        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground line-clamp-2">{tool.description}</p>
          <div className="flex flex-wrap gap-1.5">
            {tool.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Link>

      {/* Admin Edit Button */}
      <div className="absolute top-3 right-3 z-10">
        <AdminEditButton entityType="tools" item={tool} size="icon" />
      </div>

      {/* Action Download Badges */}
      {(tool.pdf_url || tool.sql_url || tool.zip_file_url) && (
        <div className="px-6 pb-4 pt-1 flex flex-wrap gap-2 border-t border-border/20">
          {tool.pdf_url && (
            <a
              href={tool.pdf_url}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-md bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-colors"
            >
              <FileText className="h-3 w-3" />
              📄 Cheatsheet
            </a>
          )}
          {tool.sql_url && (
            <a
              href={tool.sql_url}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
            >
              <Database className="h-3 w-3" />
              💾 SQL
            </a>
          )}
          {tool.zip_file_url && (
            <a
              href={tool.zip_file_url}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
            >
              <Download className="h-3 w-3" />
              📦 Source (.zip)
            </a>
          )}
        </div>
      )}
    </Card>
  );
}
