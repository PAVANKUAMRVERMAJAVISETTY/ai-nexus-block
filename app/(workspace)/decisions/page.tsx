import { PageContainer, PageHeader, EmptyState } from '@/components/common';
import { GitBranch } from 'lucide-react';

export default function DecisionsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Engineering Decisions"
        description="Architecture decision records and engineering rationale."
      />
      <div className="mt-8">
        <EmptyState
          icon={<GitBranch className="h-10 w-10" />}
          title="No decisions recorded yet"
          description="Engineering decisions will be documented here."
        />
      </div>
    </PageContainer>
  );
}
