import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink, Github, FileText } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { getToolBySlug, getTools } from '@/services/tools';

export async function generateStaticParams() {
  const { data: tools } = await getTools();
  return tools.map((t) => ({ slug: t.slug }));
}

export default async function ToolDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const tool = await getToolBySlug(params.slug);

  if (!tool) notFound();

  return (
    <PageContainer>
      <Button asChild variant="ghost" size="sm" className="mb-6">
        <Link href="/tools">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to tools
        </Link>
      </Button>

      <div className="mx-auto max-w-3xl">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-muted text-xl font-bold">
            {tool.name.charAt(0)}
          </div>

          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">
              {tool.name}
            </h1>

            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="secondary">{tool.category}</Badge>
              <Badge variant="outline" className="capitalize">
                {tool.pricing}
              </Badge>

              {tool.is_open_source && (
                <Badge variant="outline">Open Source</Badge>
              )}
            </div>
          </div>
        </div>

        <p className="mt-6 text-lg text-muted-foreground">
          {tool.description}
        </p>

        {tool.pricing_details && (
          <p className="mt-2 text-sm text-muted-foreground">
            Pricing: {tool.pricing_details}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-3">
          {tool.website_url && (
            <Button asChild size="sm">
              <a
                href={tool.website_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Website
              </a>
            </Button>
          )}

          {tool.github_url && (
            <Button asChild variant="outline" size="sm">
              <a
                href={tool.github_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="mr-2 h-4 w-4" />
                GitHub
              </a>
            </Button>
          )}

          {tool.documentation_url && (
            <Button asChild variant="outline" size="sm">
              <a
                href={tool.documentation_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FileText className="mr-2 h-4 w-4" />
                Documentation
              </a>
            </Button>
          )}
        </div>

        <Separator className="my-8" />

        <div className="flex flex-wrap gap-2">
          {tool.tags.map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
