import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Tool } from '@/types/tools';

interface ToolCardProps {
  tool: Tool;
}

export function ToolCard({ tool }: ToolCardProps) {
  return (
    <Link href={`/tools/${tool.slug}`} className="block h-full">
      <Card className="h-full border-border/40 transition-all hover:border-border/80 hover:shadow-lg">
        <CardHeader className="flex flex-row items-center gap-3 pb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-sm font-bold">
            {tool.name.charAt(0)}
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold leading-tight">{tool.name}</h3>
            <p className="text-xs text-muted-foreground">{tool.category}</p>
          </div>
          <Badge variant="outline" className="text-xs capitalize">
            {tool.pricing}
          </Badge>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-2">{tool.description}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tool.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
