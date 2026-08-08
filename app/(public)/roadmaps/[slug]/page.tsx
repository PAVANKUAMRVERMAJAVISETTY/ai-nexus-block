import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RoadmapTimeline } from '@/components/cards';

const mockSteps = [
  { label: 'Fundamentals', description: 'Core concepts and prerequisites' },
  { label: 'Frontend Basics', description: 'HTML, CSS, JavaScript essentials' },
  { label: 'React & Next.js', description: 'Modern frontend frameworks' },
  { label: 'Backend & APIs', description: 'Server-side development and API design' },
  { label: 'Database Design', description: 'Data modeling and database management' },
  { label: 'AI Integration', description: 'Connecting AI models to your applications' },
  { label: 'Deployment', description: 'CI/CD and production deployment' },
];

export default function RoadmapDetailPage({ params }: { params: { slug: string } }) {
  return (
    <PageContainer>
      <Button asChild variant="ghost" size="sm" className="mb-6">
        <Link href="/roadmaps">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to roadmaps
        </Link>
      </Button>
      <div className="mx-auto max-w-2xl">
        <Badge variant="secondary">intermediate</Badge>
        <h1 className="mt-4 text-3xl font-bold tracking-tight capitalize">
          {params.slug.replace(/-/g, ' ')}
        </h1>
        <p className="mt-2 text-muted-foreground">A structured learning path with hands-on milestones.</p>
        <div className="mt-8">
          <RoadmapTimeline steps={mockSteps} />
        </div>
      </div>
    </PageContainer>
  );
}
