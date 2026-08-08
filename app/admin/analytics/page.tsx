import { PageContainer, PageHeader, EmptyState } from '@/components/common';
import { BarChart3 } from 'lucide-react';

export default function AdminAnalyticsPage() {
  return (
    <PageContainer>
      <PageHeader title="Analytics" description="View traffic and engagement metrics." />
      <div className="mt-8">
        <EmptyState
          icon={<BarChart3 className="h-10 w-10" />}
          title="Analytics coming soon"
          description="Page views, visitor tracking, and content engagement will be available here."
        />
      </div>
    </PageContainer>
  );
}
